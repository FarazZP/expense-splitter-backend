import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createCategory,
  getUserCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getDefaultCategories,
} from "../controllers/category.controller.js";
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateMongoId,
  handleValidationErrors,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.post("/", protect, validateCreateCategory, handleValidationErrors, createCategory);
router.get("/", protect, getUserCategories);
router.get("/defaults", protect, getDefaultCategories);
router.get("/:id", protect, validateMongoId, handleValidationErrors, getCategoryById);
router.put("/:id", protect, validateMongoId, validateUpdateCategory, handleValidationErrors, updateCategory);
router.delete("/:id", protect, validateMongoId, handleValidationErrors, deleteCategory);

export default router;
