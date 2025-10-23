import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  markAsRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protect, getUserNotifications);
router.patch("/:id/read", protect, markAsRead);

export default router;
