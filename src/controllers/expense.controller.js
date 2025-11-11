import Expense from "../models/Expense.model.js";
import Group from "../models/Group.model.js";
import Settlement from "../models/Settlement.model.js";
import asyncHandler from "express-async-handler";
import { getIO } from "../socket.js";
import { createNotification } from "./notification.controller.js";
import { deleteCloudinaryFile } from "../middleware/uploadMiddleware.js";

// Helper function to check if an expense is fully settled
const isExpenseFullySettled = async (expenseId) => {
  try {
    const expense = await Expense.findById(expenseId);
    if (!expense) return false;

    const paidById = expense.paidBy.toString();
    
    // Get all settlements for this expense
    const settlements = await Settlement.find({
      expense: expenseId,
      status: 'completed'
    });

    // Calculate paid amounts per user
    const paidAmounts = {}; // paidAmounts[userId] = total paid to paidBy user
    
    settlements.forEach(settlement => {
      const fromId = settlement.from.toString();
      const toId = settlement.to.toString();
      
      // Only count payments TO the person who originally paid (paidBy)
      if (toId === paidById) {
        if (!paidAmounts[fromId]) paidAmounts[fromId] = 0;
        paidAmounts[fromId] += settlement.amount;
      }
    });

    // Check if all users who owe have paid their full share
    let allSettled = true;
    
    for (const split of expense.splitBetween) {
      const userId = split.user.toString();
      
      // Skip the person who paid (they don't need to pay themselves)
      if (userId === paidById) continue;
      
      const alreadyPaid = paidAmounts[userId] || 0;
      const remainingBalance = split.share - alreadyPaid;
      
      // If any user hasn't paid their full share, expense is not fully settled
      if (remainingBalance > 0.01) {
        allSettled = false;
        break;
      }
    }
    
    return allSettled;
  } catch (error) {
    console.error("Error checking if expense is fully settled:", error);
    return false;
  }
};

// @desc Add new expense
// @route POST /api/expenses
// @access Private
export const addExpense = asyncHandler(async (req, res) => {
  try {
    const { group, description, amount, paidBy, splitBetween } = req.body;

    const existingGroup = await Group.findById(group);
    if (!existingGroup) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const isMember = existingGroup.members.some(
      (m) => m.user.toString() === paidBy.toString()
    );
    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    const totalShare = splitBetween.reduce((acc, curr) => acc + curr.share, 0);
    if (totalShare !== amount) {
      return res.status(400).json({
        success: false,
        message: "The total share must equal the total amount",
      });
    }

    const expense = await Expense.create({
      group,
      description,
      amount,
      paidBy,
      splitBetween,
      createdBy: req.user._id,
    });

    const populatedExpense = await Expense.findById(expense._id)
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .populate("createdBy", "name email");

    // SOCKET EVENT
    const io = getIO();
    io.to(group).emit("expenseAdded", populatedExpense);

    // NOTIFICATIONS
    for (const member of existingGroup.members) {
      if (member.user.toString() !== req.user._id.toString()) {
        await createNotification(
          member.user,
          `${req.user.name} added a new expense "${description}" in ${existingGroup.name}`,
          "expense"
        );
      }
    }

    res.status(201).json({ success: true, expense: populatedExpense });
  } catch (error) {
    console.error("Error adding expense:", error);
    res.status(500).json({ success: false, message: "Failed to add expense" });
  }
});

// @desc Get all expenses for a group
// @route GET /api/expenses/group/:groupId
// @access Private
export const getGroupExpenses = asyncHandler(async (req, res) => {
  try {
    const expenses = await Expense.find({ group: req.params.groupId })
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .populate("createdBy", "name email");

    // Add settlement status for each expense
    const expensesWithStatus = await Promise.all(
      expenses.map(async (expense) => {
        const isSettled = await isExpenseFullySettled(expense._id);
        return {
          ...expense.toObject(),
          isFullySettled: isSettled
        };
      })
    );

    res.status(200).json({ success: true, expenses: expensesWithStatus });
  } catch (error) {
    console.error("Error getting group expenses:", error);
    res.status(500).json({ success: false, message: "Failed to get group expenses" });
  }
});

// @desc Get single expense details
// @route GET /api/expenses/:id
// @access Private
export const getExpenseById = asyncHandler(async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .populate("createdBy", "name email");

    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    }

    // Add settlement status
    const isSettled = await isExpenseFullySettled(expense._id);
    const expenseWithStatus = {
      ...expense.toObject(),
      isFullySettled: isSettled
    };

    res.status(200).json({ success: true, expense: expenseWithStatus });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ success: false, message: "No Expenses found" });
  }
});

// @desc Delete an expense (creator or group admin)
// @route DELETE /api/expenses/:id
// @access Private
export const deleteExpense = asyncHandler(async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });
    }

    const group = await Group.findById(expense.group);
    const isCreator = expense.createdBy.toString() === req.user._id.toString();
    const isGroupAdmin = group.createdBy.toString() === req.user._id.toString();

    if (!isCreator && !isGroupAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to delete the expense" });
    }

    await expense.deleteOne();

    const io = getIO();
    io.to(expense.group.toString()).emit("expenseDeleted", {
      expenseId: expense._id,
    });

    res.status(200).json({ success: true, message: "Expense deleted" });
  } catch (error) {
    console.error("Error deleting Expense: ", error);
    res.status(500).json({ success: false, message: "Failed to delete expense" });
  }
});

// @desc Get summary of group expenses (who owes what)
// @route GET /api/expenses/group/:groupId/summary
// @access Private
export const getGroupSummary = asyncHandler(async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const group = await Group.findById(groupId).populate("members.user", "name email avatar");
    
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const expenses = await Expense.find({ group: groupId });
    
    // Also fetch settlements for this group (only completed ones count towards balances)
    const settlements = await Settlement.find({ 
      group: groupId,
      status: 'completed'
    });

    // Calculate balances per user with detailed information
    const balanceData = {};
    const totalPaid = {};
    const totalOwed = {};

    // Initialize all group members
    group.members.forEach(member => {
      const userId = member.user._id.toString();
      balanceData[userId] = {
        user: member.user,
        balance: 0,
        totalPaid: 0,
        totalOwed: 0
      };
      totalPaid[userId] = 0;
      totalOwed[userId] = 0;
    });

    // Calculate balances from expenses
    // Positive balance = user is owed money (they paid more than their share)
    // Negative balance = user owes money (they owe their share)
    for (const expense of expenses) {
      const paidBy = expense.paidBy.toString();
      if (balanceData[paidBy]) {
        balanceData[paidBy].balance += expense.amount;
        totalPaid[paidBy] += expense.amount;
      }

      for (const split of expense.splitBetween) {
        const userId = split.user.toString();
        if (balanceData[userId]) {
          balanceData[userId].balance -= split.share;
          totalOwed[userId] += split.share;
        }
      }
    }

    // Adjust balances based on settlements
    // When user A (from) pays user B (to) an amount:
    // - User A's balance increases (they paid, reducing what they owe or increasing what they're owed)
    // - User B's balance decreases (they received, reducing what they're owed or increasing what they owe)
    for (const settlement of settlements) {
      const fromUserId = settlement.from.toString();
      const toUserId = settlement.to.toString();
      const amount = settlement.amount;

      if (balanceData[fromUserId]) {
        balanceData[fromUserId].balance += amount;
      }
      if (balanceData[toUserId]) {
        balanceData[toUserId].balance -= amount;
      }
    }

    // Update totalPaid and totalOwed in the response
    Object.keys(balanceData).forEach(userId => {
      balanceData[userId].totalPaid = totalPaid[userId] || 0;
      balanceData[userId].totalOwed = totalOwed[userId] || 0;
    });

    res.status(200).json({ success: true, balances: balanceData });
  } catch (error) {
    console.error("Error generating summary: ", error);
    res.status(500).json({ success: false, message: "Failed to generate summary" });
  }
});

// @desc Update an expense
// @route PUT /api/expenses/:id
// @access Private
export const updateExpense = asyncHandler(async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const group = await Group.findById(expense.group);
    const isCreator = expense.createdBy.toString() === req.user._id.toString();
    const isGroupAdmin = group.createdBy.toString() === req.user._id.toString();

    if (!isCreator && !isGroupAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this expense",
      });
    }

    const { description, amount, paidBy, splitBetween, category, tags } = req.body;

    // Validate total share equals amount if amount is being updated
    if (amount && splitBetween) {
      const totalShare = splitBetween.reduce((acc, curr) => acc + curr.share, 0);
      if (Math.abs(totalShare - amount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: "The total share must equal the total amount",
        });
      }
    }

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = amount;
    if (paidBy !== undefined) updateData.paidBy = paidBy;
    if (splitBetween !== undefined) updateData.splitBetween = splitBetween;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .populate("category", "name")
      .populate("createdBy", "name email");

    const io = getIO();
    io.to(expense.group.toString()).emit("expenseUpdated", updatedExpense);

    res.status(200).json({ success: true, expense: updatedExpense });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ success: false, message: "Failed to update expense" });
  }
});

// @desc Add receipt to expense
// @route POST /api/expenses/:id/receipt
// @access Private
export const addReceiptToExpense = asyncHandler(async (req, res) => {
  console.log("Receipt upload endpoint hit for expense:", req.params.id);
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      console.error("Expense not found:", req.params.id);
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const group = await Group.findById(expense.group);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const isCreator = expense.createdBy.toString() === req.user._id.toString();
    const isGroupAdmin = group.createdBy.toString() === req.user._id.toString();

    if (!isCreator && !isGroupAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add receipt to this expense",
      });
    }

    if (!req.file) {
      console.error("No file in request:", { body: req.body, files: req.files });
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Validate that file has required properties
    if (!req.file.path) {
      console.error("File missing path property:", req.file);
      return res.status(500).json({ 
        success: false, 
        message: "File upload failed - missing file path" 
      });
    }

    console.log("File successfully uploaded to Cloudinary:", {
      path: req.file.path,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Delete old receipt if exists
    if (expense.receipt?.publicId) {
      try {
        await deleteCloudinaryFile(expense.receipt.publicId);
      } catch (error) {
        console.error("Error deleting old receipt:", error);
      }
    }

    // Use public_id directly from req.file (set by upload middleware)
    const publicId = req.file.public_id || req.file.filename;

    const receiptData = {
      url: req.file.path, // Cloudinary secure URL
      publicId: publicId || "receipt", // Public ID from Cloudinary
      filename: req.file.originalname || "receipt",
    };

    console.log("Receipt data prepared:", receiptData);

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      { receipt: receiptData },
      { new: true }
    )
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .populate("category", "name")
      .populate("createdBy", "name email");

    const io = getIO();
    io.to(expense.group.toString()).emit("expenseUpdated", updatedExpense);

    res.status(200).json({ success: true, expense: updatedExpense });
  } catch (error) {
    console.error("Error adding receipt:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: "Failed to add receipt",
      error: error.message 
    });
  }
});

// @desc Remove receipt from expense
// @route DELETE /api/expenses/:id/receipt
// @access Private
export const removeReceiptFromExpense = asyncHandler(async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const group = await Group.findById(expense.group);
    const isCreator = expense.createdBy.toString() === req.user._id.toString();
    const isGroupAdmin = group.createdBy.toString() === req.user._id.toString();

    if (!isCreator && !isGroupAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to remove receipt from this expense",
      });
    }

    // Delete receipt from Cloudinary
    if (expense.receipt?.publicId) {
      try {
        await deleteCloudinaryFile(expense.receipt.publicId);
      } catch (error) {
        console.error("Error deleting receipt from Cloudinary:", error);
      }
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      { $unset: { receipt: 1 } },
      { new: true }
    )
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .populate("category", "name")
      .populate("createdBy", "name email");

    const io = getIO();
    io.to(expense.group.toString()).emit("expenseUpdated", updatedExpense);

    res.status(200).json({ success: true, expense: updatedExpense });
  } catch (error) {
    console.error("Error removing receipt:", error);
    res.status(500).json({ success: false, message: "Failed to remove receipt" });
  }
});

// @desc Get expenses with advanced filtering
// @route GET /api/expenses/group/:groupId/filter
// @access Private
export const getFilteredExpenses = asyncHandler(async (req, res) => {
  try {
    const {
      category,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      search,
      paidBy,
      tags,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = { group: req.params.groupId };

    if (category) {
      filter.category = category;
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = parseFloat(minAmount);
      if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    if (paidBy) {
      filter.paidBy = paidBy;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filter.tags = { $in: tagArray };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const expenses = await Expense.find(filter)
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .populate("category", "name")
      .populate("createdBy", "name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Add settlement status for each expense
    const expensesWithStatus = await Promise.all(
      expenses.map(async (expense) => {
        const isSettled = await isExpenseFullySettled(expense._id);
        return {
          ...expense.toObject(),
          isFullySettled: isSettled
        };
      })
    );

    const total = await Expense.countDocuments(filter);

    res.status(200).json({
      success: true,
      expenses: expensesWithStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalExpenses: total,
        hasNext: skip + expensesWithStatus.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error getting filtered expenses:", error);
    res.status(500).json({ success: false, message: "Failed to get filtered expenses" });
  }
});

// @desc Search expenses across all user's groups
// @route GET /api/expenses/search
// @access Private
export const searchExpenses = asyncHandler(async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long",
      });
    }

    // Get user's groups
    const userGroups = await Group.find({ "members.user": req.user._id }).select("_id");
    const groupIds = userGroups.map(group => group._id);

    const filter = {
      group: { $in: groupIds },
      $or: [
        { description: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } },
      ],
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const expenses = await Expense.find(filter)
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .populate("category", "name")
      .populate("group", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(filter);

    res.status(200).json({
      success: true,
      expenses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalExpenses: total,
        hasNext: skip + expenses.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error searching expenses:", error);
    res.status(500).json({ success: false, message: "Failed to search expenses" });
  }
});
