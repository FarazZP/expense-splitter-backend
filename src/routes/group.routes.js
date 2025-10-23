import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupById,
  addMember,
  deleteGroup,
} from "../controllers/group.controller.js";
import {
  validateCreateGroup,
  validateAddMember,
  validateMongoId,
  handleValidationErrors,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

router.post("/", protect, validateCreateGroup, handleValidationErrors, createGroup);
router.get("/", protect, getUserGroups);
router.get("/:id", protect, validateMongoId, handleValidationErrors, getGroupById);
router.put("/:id/add-member", protect, validateMongoId, validateAddMember, handleValidationErrors, addMember);
router.delete("/:id", protect, validateMongoId, handleValidationErrors, deleteGroup);

export default router;
