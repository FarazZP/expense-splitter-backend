import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Expense from "../models/Expense.model.js";
import Settlement from "../models/Settlement.model.js";
import Group from "../models/Group.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility function to create temporary file path
const createTempFilePath = (filename) => {
  return path.join(__dirname, "..", "..", "temp", filename);
};

// Ensure temp directory exists
const ensureTempDir = () => {
  const tempDir = path.join(__dirname, "..", "..", "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
};

// Export expenses to CSV
export const exportExpensesToCSV = async (groupId, userId, format = "detailed") => {
  try {
    // Verify user is member of group
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const isMember = group.members.some(m => m.user.toString() === userId.toString());
    if (!isMember) {
      throw new Error("Not authorized to export this group's data");
    }

    // Get expenses with populated data
    const expenses = await Expense.find({ group: groupId })
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .populate("category", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    if (format === "summary") {
      return await exportExpenseSummary(expenses);
    } else {
      return await exportDetailedExpenses(expenses);
    }
  } catch (error) {
    console.error("Error exporting expenses to CSV:", error);
    throw error;
  }
};

// Export detailed expenses
const exportDetailedExpenses = async (expenses) => {
  ensureTempDir();
  const filename = `expenses_${Date.now()}.csv`;
  const filePath = createTempFilePath(filename);
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "date", title: "Date" },
      { id: "description", title: "Description" },
      { id: "amount", title: "Amount" },
      { id: "paidBy", title: "Paid By" },
      { id: "category", title: "Category" },
      { id: "splitBetween", title: "Split Between" },
      { id: "createdBy", title: "Created By" },
      { id: "receipt", title: "Receipt" },
      { id: "tags", title: "Tags" },
    ],
  });

  const csvData = expenses.map(expense => ({
    date: expense.createdAt.toISOString().split("T")[0],
    description: expense.description,
    amount: expense.amount,
    paidBy: expense.paidBy.name,
    category: expense.category?.name || "Uncategorized",
    splitBetween: expense.splitBetween.map(split => 
      `${split.user.name}: ${split.share}`
    ).join(", "),
    createdBy: expense.createdBy.name,
    receipt: expense.receipt?.url || "",
    tags: expense.tags?.join(", ") || "",
  }));

  await csvWriter.writeRecords(csvData);
  return filePath;
};

// Export expense summary
const exportExpenseSummary = async (expenses) => {
  ensureTempDir();
  const filename = `expense_summary_${Date.now()}.csv`;
  const filePath = createTempFilePath(filename);
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "category", title: "Category" },
      { id: "totalAmount", title: "Total Amount" },
      { id: "expenseCount", title: "Number of Expenses" },
      { id: "averageAmount", title: "Average Amount" },
    ],
  });

  // Group by category
  const categorySummary = {};
  expenses.forEach(expense => {
    const categoryName = expense.category?.name || "Uncategorized";
    if (!categorySummary[categoryName]) {
      categorySummary[categoryName] = {
        totalAmount: 0,
        count: 0,
      };
    }
    categorySummary[categoryName].totalAmount += expense.amount;
    categorySummary[categoryName].count += 1;
  });

  const csvData = Object.entries(categorySummary).map(([category, data]) => ({
    category,
    totalAmount: data.totalAmount,
    expenseCount: data.count,
    averageAmount: (data.totalAmount / data.count).toFixed(2),
  }));

  await csvWriter.writeRecords(csvData);
  return filePath;
};

// Export settlements to CSV
export const exportSettlementsToCSV = async (groupId, userId) => {
  try {
    // Verify user is member of group
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const isMember = group.members.some(m => m.user.toString() === userId.toString());
    if (!isMember) {
      throw new Error("Not authorized to export this group's data");
    }

    const settlements = await Settlement.find({ group: groupId })
      .populate("from", "name email")
      .populate("to", "name email")
      .sort({ createdAt: -1 });

    ensureTempDir();
    const filename = `settlements_${Date.now()}.csv`;
    const filePath = createTempFilePath(filename);
    
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "date", title: "Date" },
        { id: "from", title: "From" },
        { id: "to", title: "To" },
        { id: "amount", title: "Amount" },
        { id: "note", title: "Note" },
      ],
    });

    const csvData = settlements.map(settlement => ({
      date: settlement.createdAt.toISOString().split("T")[0],
      from: settlement.from.name,
      to: settlement.to.name,
      amount: settlement.amount,
      note: settlement.note || "",
    }));

    await csvWriter.writeRecords(csvData);
    return filePath;
  } catch (error) {
    console.error("Error exporting settlements to CSV:", error);
    throw error;
  }
};

// Export user's personal expenses across all groups
export const exportUserExpensesToCSV = async (userId, format = "detailed") => {
  try {
    const expenses = await Expense.find({
      $or: [
        { paidBy: userId },
        { "splitBetween.user": userId },
      ],
    })
      .populate("paidBy", "name email")
      .populate("splitBetween.user", "name email")
      .populate("category", "name")
      .populate("group", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    if (format === "summary") {
      return await exportUserExpenseSummary(expenses, userId);
    } else {
      return await exportUserDetailedExpenses(expenses, userId);
    }
  } catch (error) {
    console.error("Error exporting user expenses to CSV:", error);
    throw error;
  }
};

// Export user's detailed expenses
const exportUserDetailedExpenses = async (expenses, userId) => {
  ensureTempDir();
  const filename = `user_expenses_${Date.now()}.csv`;
  const filePath = createTempFilePath(filename);
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "date", title: "Date" },
      { id: "description", title: "Description" },
      { id: "amount", title: "Amount" },
      { id: "paidBy", title: "Paid By" },
      { id: "group", title: "Group" },
      { id: "category", title: "Category" },
      { id: "userShare", title: "Your Share" },
      { id: "status", title: "Status" },
    ],
  });

  const csvData = expenses.map(expense => {
    const userSplit = expense.splitBetween.find(split => 
      split.user._id.toString() === userId.toString()
    );
    const isPaidBy = expense.paidBy._id.toString() === userId.toString();
    
    return {
      date: expense.createdAt.toISOString().split("T")[0],
      description: expense.description,
      amount: expense.amount,
      paidBy: expense.paidBy.name,
      group: expense.group.name,
      category: expense.category?.name || "Uncategorized",
      userShare: userSplit?.share || 0,
      status: isPaidBy ? "Paid" : "Owed",
    };
  });

  await csvWriter.writeRecords(csvData);
  return filePath;
};

// Export user's expense summary
const exportUserExpenseSummary = async (expenses, userId) => {
  ensureTempDir();
  const filename = `user_summary_${Date.now()}.csv`;
  const filePath = createTempFilePath(filename);
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "group", title: "Group" },
      { id: "totalPaid", title: "Total Paid" },
      { id: "totalOwed", title: "Total Owed" },
      { id: "netBalance", title: "Net Balance" },
    ],
  });

  // Calculate balances per group
  const groupBalances = {};
  expenses.forEach(expense => {
    const groupName = expense.group.name;
    if (!groupBalances[groupName]) {
      groupBalances[groupName] = { paid: 0, owed: 0 };
    }

    const isPaidBy = expense.paidBy._id.toString() === userId.toString();
    if (isPaidBy) {
      groupBalances[groupName].paid += expense.amount;
    } else {
      const userSplit = expense.splitBetween.find(split => 
        split.user._id.toString() === userId.toString()
      );
      if (userSplit) {
        groupBalances[groupName].owed += userSplit.share;
      }
    }
  });

  const csvData = Object.entries(groupBalances).map(([group, balance]) => ({
    group,
    totalPaid: balance.paid,
    totalOwed: balance.owed,
    netBalance: balance.paid - balance.owed,
  }));

  await csvWriter.writeRecords(csvData);
  return filePath;
};
