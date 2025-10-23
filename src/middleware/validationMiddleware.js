import { body, param, query, validationResult } from "express-validator";

// Validation result handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Auth validation rules
export const validateRegister = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

export const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

// Group validation rules
export const validateCreateGroup = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Group name must be between 2 and 100 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be less than 500 characters"),
  body("members")
    .optional()
    .isArray()
    .withMessage("Members must be an array"),
];

export const validateAddMember = [
  body("memberId")
    .isMongoId()
    .withMessage("Invalid member ID"),
];

// Expense validation rules
export const validateCreateExpense = [
  body("group")
    .isMongoId()
    .withMessage("Invalid group ID"),
  body("description")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Description must be between 1 and 200 characters"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("paidBy")
    .isMongoId()
    .withMessage("Invalid paidBy user ID"),
  body("splitBetween")
    .isArray({ min: 1 })
    .withMessage("At least one person must be included in the split"),
  body("splitBetween.*.user")
    .isMongoId()
    .withMessage("Invalid user ID in split"),
  body("splitBetween.*.share")
    .isFloat({ min: 0.01 })
    .withMessage("Share must be a positive number"),
  body("category")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID"),
];

export const validateUpdateExpense = [
  body("description")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Description must be between 1 and 200 characters"),
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("splitBetween")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one person must be included in the split"),
  body("splitBetween.*.user")
    .optional()
    .isMongoId()
    .withMessage("Invalid user ID in split"),
  body("splitBetween.*.share")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Share must be a positive number"),
  body("category")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID"),
];

// Settlement validation rules
export const validateCreateSettlement = [
  body("groupId")
    .isMongoId()
    .withMessage("Invalid group ID"),
  body("from")
    .isMongoId()
    .withMessage("Invalid from user ID"),
  body("to")
    .isMongoId()
    .withMessage("Invalid to user ID"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Note must be less than 200 characters"),
];

// Category validation rules
export const validateCreateCategory = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description must be less than 200 characters"),
];

export const validateUpdateCategory = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description must be less than 200 characters"),
];

// Parameter validation
export const validateMongoId = [
  param("id")
    .isMongoId()
    .withMessage("Invalid ID format"),
];

export const validateGroupId = [
  param("groupId")
    .isMongoId()
    .withMessage("Invalid group ID format"),
];

// Query validation for filtering
export const validateExpenseFilters = [
  query("category")
    .optional()
    .isMongoId()
    .withMessage("Invalid category ID"),
  query("minAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Min amount must be a positive number"),
  query("maxAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Max amount must be a positive number"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO date"),
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search term must be less than 100 characters"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];
