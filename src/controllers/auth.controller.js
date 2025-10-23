import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import User from "../models/User.model.js";
import generateToken from "../utils/generateToken.js";

// @desc Register a new user
// @route POST /api/auth/register
// @access Public

export const registerUser = asyncHandler(async (req, res) => {
    const {name, email, password} = req.body;

    if(!name || !email || !password)
        return res.status(400).json({message: "All fields are required"});

    const userExists = await User.findOne({email});
    if(userExists)
        return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
    });

    if(user) {
        const token = generateToken(user._id);
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
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
        token,
    })
    
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