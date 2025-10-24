import express from "express";
import { registerUser, loginUser, logoutUser, getUserProfile, updateUserProfile, updateUserAvatar } from "../controllers/auth.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRegister, validateLogin, validateUpdateProfile, handleValidationErrors } from "../middleware/validationMiddleware.js";
import { uploadAvatar, handleUploadError } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/register", uploadAvatar, handleUploadError, validateRegister, handleValidationErrors, registerUser);
router.post("/login", validateLogin, handleValidationErrors, loginUser);
router.post("/logout", protect, logoutUser);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, validateUpdateProfile, handleValidationErrors, updateUserProfile);
router.put("/avatar", protect, uploadAvatar, handleUploadError, updateUserAvatar);

export default router;