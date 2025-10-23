import Group from "../models/Group.model.js";
import asyncHandler from "express-async-handler";
import { getIO } from "../socket.js";
import { createNotification } from "./notification.controller.js";

// @desc Create a new group
// @route POST /api/groups
// @access Private
export const createGroup = asyncHandler(async (req, res) => {
  try {
    const { name, description, members } = req.body;

    const group = await Group.create({
      name,
      description,
      createdBy: req.user._id,
      members: [{ user: req.user._id }],
    });

    if (members && members.length > 0) {
      for (const memberId of members) {
        if (memberId !== req.user._id.toString()) {
          group.members.push({ user: memberId });
        }
      }
    }

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    const io = getIO();
    populatedGroup.members.forEach((m) => {
      io.to(m.user._id.toString()).emit("groupCreated", populatedGroup);
    });

    // NOTIFICATIONS
    for (const member of populatedGroup.members) {
      if (member.user._id.toString() !== req.user._id.toString()) {
        await createNotification(
          member.user._id,
          `${req.user.name} added you to the group "${name}"`,
          "group"
        );
      }
    }

    res.status(201).json({ success: true, group: populatedGroup });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ success: false, message: "Failed to create group" });
  }
});

// @desc Get all groups user belongs to
// @route GET /api/groups
// @access Private
export const getUserGroups = asyncHandler(async (req, res) => {
  try {
    const groups = await Group.find({ "members.user": req.user._id })
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    if (!groups || groups.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No groups found" });
    }

    res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error("Error getting user groups:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get groups" });
  }
});

// @desc Get single group details
// @route GET /api/groups/:id
// @access Private
export const getGroupById = asyncHandler(async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    const isMember = group.members.some((m) =>
      m.user._id.equals(req.user._id)
    );
    if (!isMember) {
      return res
        .status(403)
        .json({ success: false, message: "You are not a member of this group" });
    }

    res.status(200).json({ success: true, group });
  } catch (error) {
    console.error("Error fetching group:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to get group" });
  }
});

// @desc Add member to group
// @route PUT /api/groups/:id/add-member
// @access Private
export const addMember = asyncHandler(async (req, res) => {
  try {
    const { memberId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only creator can add members" });
    }

    const alreadyMember = group.members.some((m) => m.user.toString() === memberId);
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: "User already a member" });
    }

    group.members.push({ user: memberId });
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    const io = getIO();
    io.to(group._id.toString()).emit("memberAdded", populatedGroup);

    // NOTIFICATION
    await createNotification(
      memberId,
      `You were added to group "${group.name}" by ${req.user.name}`,
      "group"
    );

    res.status(200).json({ success: true, group: populatedGroup });
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ success: false, message: "Failed to add member" });
  }
});

// @desc Delete group (creator only)
// @route DELETE /api/groups/:id
// @access Private
export const deleteGroup = asyncHandler(async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to delete this group" });
    }

    await group.deleteOne();

    const io = getIO();
    io.to(group._id.toString()).emit("groupDeleted", { groupId: group._id });

    res.status(200).json({ success: true, message: "Group deleted" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete group" });
  }
});
