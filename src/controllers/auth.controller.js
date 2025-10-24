import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import User from "../models/User.model.js";
import generateToken from "../utils/generateToken.js";

// @desc Register a new user
// @route POST /api/auth/register
// @access Public

export const registerUser = asyncHandler(async (req, res) => {
    const {name, email, password, phone} = req.body;

    if(!name || !email || !password)
        return res.status(400).json({message: "All fields are required"});

    const userExists = await User.findOne({email});
    if(userExists)
        return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle avatar upload
    let avatarUrl = null;
    if (req.file) {
        avatarUrl = req.file.path; // Cloudinary URL
    }

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        avatar: avatarUrl,
        phone,
    });

    if(user) {
        const token = generateToken(user._id);
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            phone: user.phone,
            token,
        });
    } else {
        res.status(400).json({ message: "Invalid user data" });
    }
});

// @desc Login user
// @route POST /api/auth/login
// @access Public

export const loginUser = asyncHandler(async (req, res) => {
    const {email, password} = req.body;

    const user = await User.findOne({email});
    if(!user)
        return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch)
        return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);

    res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        token,
    })
    
});

// @desc Get user profile
// @route GET /api/auth/profile
// @access Private

export const getUserProfile = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                phone: user.phone,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }
        });
    } catch (error) {
        console.error("Error getting user profile:", error);
        res.status(500).json({ message: "Failed to get user profile" });
    }
});

// @desc Update user profile
// @route PUT /api/auth/profile
// @access Private

export const updateUserProfile = asyncHandler(async (req, res) => {
    try {
        const { name, phone } = req.body;
        const userId = req.user._id;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                phone: user.phone,
                updatedAt: user.updatedAt,
            }
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: "Failed to update user profile" });
    }
});

// @desc Update user avatar
// @route PUT /api/auth/avatar
// @access Private

export const updateUserAvatar = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: "No avatar file provided" 
            });
        }

        // Get current user to check if they have an existing avatar
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete old avatar from Cloudinary if it exists
        if (currentUser.avatar) {
            try {
                const { deleteCloudinaryFile } = await import("../middleware/uploadMiddleware.js");
                const publicId = currentUser.avatar.split('/').pop().split('.')[0];
                await deleteCloudinaryFile(`expense-splitter/avatars/${publicId}`);
            } catch (error) {
                console.error("Error deleting old avatar:", error);
                // Continue with update even if old avatar deletion fails
            }
        }

        // Update user with new avatar URL
        const user = await User.findByIdAndUpdate(
            userId,
            { avatar: req.file.path },
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            message: "Avatar updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                phone: user.phone,
                updatedAt: user.updatedAt,
            }
        });
    } catch (error) {
        console.error("Error updating user avatar:", error);
        res.status(500).json({ message: "Failed to update user avatar" });
    }
});

// @desc Logout user
// @route POST /api/auth/logout
// @access Private (optional)

export const logoutUser = asyncHandler(async (req, res) => {
    try {
        res.status(200).json({ message: "User logged out" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Logout failed" });
    }
});