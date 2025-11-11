import Settlement from "../models/Settlement.model.js";
import Group from "../models/Group.model.js";
import Expense from "../models/Expense.model.js";
import { getIO } from "../socket.js";
import asyncHandler from "express-async-handler";
import { createNotification } from "./notification.controller.js";

export const createSettlement = asyncHandler(async (req, res) => {
  try {
    const { groupId, expenseId, from, to, amount, note } = req.body;

    if (!groupId || !from || !to || !amount) {
      return res.status(400).json({ 
        success: false,
        message: "All required fields must be provided" 
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "Amount must be greater than 0" 
      });
    }

    // Check if user is trying to settle with themselves
    if (from === to) {
      return res.status(400).json({ 
        success: false,
        message: "Cannot settle with yourself" 
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: "Group not found" 
      });
    }

    // Verify that the requesting user is part of the settlement (either from or to)
    if (from.toString() !== req.user._id.toString() && to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "You can only create settlements involving yourself" 
      });
    }

    // Verify that both users are members of the group
    const fromIsMember = group.members.some(m => m.user.toString() === from.toString());
    const toIsMember = group.members.some(m => m.user.toString() === to.toString());

    if (!fromIsMember || !toIsMember) {
      return res.status(403).json({ 
        success: false,
        message: "Both users must be members of the group" 
      });
    }

    // Validate that user cannot pay more than their fair share
    // Calculate what the user (from) actually owes
    let userOwes = 0;
    
    if (expenseId) {
      // If expense is specified, calculate based on that expense only
      const expense = await Expense.findById(expenseId);
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: "Expense not found"
        });
      }

      // Check if expense belongs to the group
      if (expense.group.toString() !== groupId.toString()) {
        return res.status(400).json({
          success: false,
          message: "Expense does not belong to this group"
        });
      }

      // Find user's share in this expense
      const userSplit = expense.splitBetween.find(
        split => split.user.toString() === from.toString()
      );
      
      if (userSplit) {
        userOwes = userSplit.share;
        
        // Calculate already paid amount for this expense
        const existingSettlements = await Settlement.find({
          expense: expenseId,
          from: from,
          to: to,
          status: 'completed'
        });
        
        const alreadyPaid = existingSettlements.reduce(
          (sum, s) => sum + s.amount,
          0
        );
        
        const remainingBalance = userOwes - alreadyPaid;
        
        if (amount > remainingBalance + 0.01) { // Add small tolerance for floating point
          return res.status(400).json({
            success: false,
            message: `Cannot pay more than remaining balance. You owe Rs.${userOwes.toFixed(2)} for this expense, already paid Rs.${alreadyPaid.toFixed(2)}, remaining: Rs.${remainingBalance.toFixed(2)}`
          });
        }
      } else {
        // User is not part of this expense split
        return res.status(400).json({
          success: false,
          message: "You are not part of this expense split"
        });
      }
    } else {
      // If no expense specified, calculate net balance between from and to users
      // Calculate what 'from' user owes 'to' user based on all expenses
      const expenses = await Expense.find({ group: groupId });
      let balance = 0;
      
      for (const expense of expenses) {
        // If 'from' paid, they get credited
        if (expense.paidBy.toString() === from.toString()) {
          balance += expense.amount;
        }
        // If 'to' paid, they get credited (this reduces what 'from' owes 'to')
        if (expense.paidBy.toString() === to.toString()) {
          balance -= expense.amount;
        }
        
        // 'from' user's share is deducted
        const fromSplit = expense.splitBetween.find(
          split => split.user.toString() === from.toString()
        );
        if (fromSplit) {
          balance -= fromSplit.share;
        }
        
        // 'to' user's share is added (reduces what 'from' owes 'to')
        const toSplit = expense.splitBetween.find(
          split => split.user.toString() === to.toString()
        );
        if (toSplit) {
          balance += toSplit.share;
        }
      }
      
      // Apply existing settlements
      const allSettlements = await Settlement.find({
        group: groupId,
        status: 'completed'
      });
      
      for (const settlement of allSettlements) {
        if (settlement.from.toString() === from.toString() && settlement.to.toString() === to.toString()) {
          balance += settlement.amount; // 'from' has paid, so balance increases
        }
        if (settlement.from.toString() === to.toString() && settlement.to.toString() === from.toString()) {
          balance -= settlement.amount; // 'to' has paid, so balance decreases
        }
      }
      
      // If balance is negative, 'from' owes 'to' that amount
      // If balance is positive, 'to' owes 'from' that amount
      const remainingBalance = balance < 0 ? Math.abs(balance) : 0;
      
      if (amount > remainingBalance + 0.01) {
        return res.status(400).json({
          success: false,
          message: `Cannot pay more than remaining balance. Remaining amount you owe: Rs.${remainingBalance.toFixed(2)}`
        });
      }
    }

    const settlementData = {
      group: groupId,
      from,
      to,
      amount,
      note: note || '',
      status: 'completed',
    };

    // Add expense reference if provided
    if (expenseId) {
      settlementData.expense = expenseId;
    }

    const settlement = await Settlement.create(settlementData);

    // Populate the settlement for response and notifications
    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate("from", "name email avatar")
      .populate("to", "name email avatar")
      .populate("group", "name")
      .populate("expense", "description amount");

    const io = getIO();
    io.to(groupId.toString()).emit("settlementAdded", populatedSettlement);

    // Create notifications using populated data
    await createNotification(
      to,
      `${populatedSettlement.from.name} settled Rs.${amount.toFixed(2)} with you in ${group.name}`,
      "settlement"
    );
    await createNotification(
      from,
      `You settled Rs.${amount.toFixed(2)} with ${populatedSettlement.to.name} in ${group.name}`,
      "settlement"
    );

    res.status(201).json({ success: true, settlement: populatedSettlement });
  } catch (error) {
    console.error("Error creating settlement:", error);
    res.status(500).json({ 
      success: false,
      message: "Server Error" 
    });
  }
});

export const getSettlementsByGroup = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false,
        message: "Group not found" 
      });
    }

    // Verify user is a member of the group
    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ 
        success: false,
        message: "You are not a member of this group" 
      });
    }

    const settlements = await Settlement.find({ group: groupId })
      .populate("from", "name email avatar")
      .populate("to", "name email avatar")
      .populate("expense", "description amount")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, settlements });
  } catch (error) {
    console.error("Error fetching settlements:", error);
    res.status(500).json({ 
      success: false,
      message: "Server Error" 
    });
  }
});

export const getUserSettlements = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const settlements = await Settlement.find({
      $or: [{ from: userId }, { to: userId }],
    })
      .populate("from", "name email avatar")
      .populate("to", "name email avatar")
      .populate("group", "name")
      .populate("expense", "description amount")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, settlements });
  } catch (error) {
    console.error("Error fetching user settlements:", error);
    res.status(500).json({ 
      success: false,
      message: "Server Error" 
    });
  }
});
