import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  exportGroupExpenses,
  exportGroupSettlements,
  exportUserExpenses,
  getExportOptions,
} from "../controllers/export.controller.js";
import { validateGroupId, validateMongoId, handleValidationErrors } from "../middleware/validationMiddleware.js";
import { exportLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(exportLimiter);

router.get("/options", protect, getExportOptions);
router.get("/expenses/group/:groupId", protect, validateGroupId, handleValidationErrors, exportGroupExpenses);
router.get("/settlements/group/:groupId", protect, validateGroupId, handleValidationErrors, exportGroupSettlements);

router.get("/expenses/user", protect, exportUserExpenses);

export default router;
