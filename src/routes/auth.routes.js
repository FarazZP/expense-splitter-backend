import express from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/auth.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRegister, validateLogin, handleValidationErrors } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.post("/register", validateRegister, handleValidationErrors, registerUser);
router.post("/login", validateLogin, handleValidationErrors, loginUser);
router.post("/logout", protect, logoutUser);

export default router;