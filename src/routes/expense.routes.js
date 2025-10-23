import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addExpense,
  getGroupExpenses,
  getExpenseById,
  deleteExpense,
  getGroupSummary,
  updateExpense,
  addReceiptToExpense,
  removeReceiptFromExpense,
  getFilteredExpenses,
  searchExpenses,
} from "../controllers/expense.controller.js";
import {
  validateCreateExpense,
  validateUpdateExpense,
  validateMongoId,
  validateGroupId,
  validateExpenseFilters,
  handleValidationErrors,
} from "../middleware/validationMiddleware.js";
import { uploadReceipt, handleUploadError } from "../middleware/uploadMiddleware.js";
import { expenseLimiter, searchLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(expenseLimiter);
router.post("/", protect, validateCreateExpense, handleValidationErrors, addExpense);
router.get("/search", protect, searchLimiter, searchExpenses);
router.get("/group/:groupId", protect, validateGroupId, handleValidationErrors, getGroupExpenses);
router.get("/group/:groupId/filter", protect, validateGroupId, validateExpenseFilters, handleValidationErrors, getFilteredExpenses);
router.get("/group/:groupId/summary", protect, validateGroupId, handleValidationErrors, getGroupSummary);
router.get("/:id", protect, validateMongoId, handleValidationErrors, getExpenseById);
router.put("/:id", protect, validateMongoId, validateUpdateExpense, handleValidationErrors, updateExpense);
router.delete("/:id", protect, validateMongoId, handleValidationErrors, deleteExpense);
router.post("/:id/receipt", protect, validateMongoId, handleValidationErrors, uploadReceipt, handleUploadError, addReceiptToExpense);
router.delete("/:id/receipt", protect, validateMongoId, handleValidationErrors, removeReceiptFromExpense);

export default router;
