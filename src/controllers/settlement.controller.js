import Settlement from "../models/Settlement.model.js";
import Group from "../models/Group.model.js";
import { getIO } from "../socket.js";
import asyncHandler from "express-async-handler";
import { createNotification } from "./notification.controller.js";

export const createSettlement = asyncHandler(async (req, res) => {
  try {
    const { groupId, from, to, amount, note } = req.body;

    if (!groupId || !from || !to || !amount) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const settlement = await Settlement.create({
      group: groupId,
      from,
      to,
      amount,
      note,
    });

    const io = getIO();
    io.to(groupId.toString()).emit("settlementAdded", settlement);

    // NOTIFICATIONS
    await createNotification(
      to,
      `${req.user.name} settled Rs.${amount} with you in ${group.name}`,
      "settlement"
    );
    await createNotification(
      from,
      `You settled Rs.${amount} with ${req.user.name} in ${group.name}`,
      "settlement"
    );

    res.status(201).json({ success: true, settlement });
  } catch (error) {
    console.error("Error creating settlement:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export const getSettlementsByGroup = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;
    const settlements = await Settlement.find({ group: groupId })
      .populate("from", "name email")
      .populate("to", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, settlements });
  } catch (error) {
    console.error("Error fetching settlements:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export const getUserSettlements = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const settlements = await Settlement.find({
      $or: [{ from: userId }, { to: userId }],
    })
      .populate("from", "name email")
      .populate("to", "name email")
      .populate("group", "name");

    res.status(200).json({ success: true, settlements });
  } catch (error) {
    console.error("Error fetching user settlements:", error);
    res.status(500).json({ message: "Server Error" });
  }
});
