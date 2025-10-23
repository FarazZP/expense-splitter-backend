import express from "express";
import {
  createSettlement,
  getSettlementsByGroup,
  getUserSettlements,
} from "../controllers/settlement.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateCreateSettlement, validateGroupId, handleValidationErrors } from "../middleware/validationMiddleware.js";

const router = express.Router();

// POST /api/settlements
router.post("/", protect, validateCreateSettlement, handleValidationErrors, createSettlement);

// GET /api/settlements/group/:groupId
router.get("/group/:groupId", protect, validateGroupId, handleValidationErrors, getSettlementsByGroup);

// GET /api/settlements/user
router.get("/user", protect, getUserSettlements);

export default router;