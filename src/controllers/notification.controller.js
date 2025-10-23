import { Notification } from "../models/Notification.model.js";
import { getIO } from "../socket.js";

// Create and optionally emit a notification
export const createNotification = async (userId, message, type = "general") => {
  try {
    const notification = await Notification.create({
      user: userId,
      message,
      type,
    });

    // Emit via socket.io to specific user room
    const io = getIO();
    io.to(userId.toString()).emit("notification", notification);

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

// Get all notifications for logged-in user
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark one notification as read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification)
      return res.status(404).json({ success: false, message: "Notification not found" });

    res.status(200).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
