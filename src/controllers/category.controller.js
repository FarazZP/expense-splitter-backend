import Category from "../models/Category.model.js";
import asyncHandler from "express-async-handler";

// @desc Create a new category
// @route POST /api/categories
// @access Private
export const createCategory = asyncHandler(async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if category with same name already exists for this user
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      createdBy: req.user._id,
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const category = await Category.create({
      name,
      description,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ success: false, message: "Failed to create category" });
  }
});

// @desc Get all categories for user
// @route GET /api/categories
// @access Private
export const getUserCategories = asyncHandler(async (req, res) => {
  try {
    const categories = await Category.find({ createdBy: req.user._id })
      .sort({ name: 1 });

    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Error getting categories:", error);
    res.status(500).json({ success: false, message: "Failed to get categories" });
  }
});

// @desc Get single category
// @route GET /api/categories/:id
// @access Private
export const getCategoryById = asyncHandler(async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({ success: true, category });
  } catch (error) {
    console.error("Error getting category:", error);
    res.status(500).json({ success: false, message: "Failed to get category" });
  }
});

// @desc Update category
// @route PUT /api/categories/:id
// @access Private
export const updateCategory = asyncHandler(async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = await Category.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if new name conflicts with existing category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        createdBy: req.user._id,
        _id: { $ne: req.params.id },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        });
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, category: updatedCategory });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ success: false, message: "Failed to update category" });
  }
});

// @desc Delete category
// @route DELETE /api/categories/:id
// @access Private
export const deleteCategory = asyncHandler(async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (category.isDefault) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete default category",
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ success: false, message: "Failed to delete category" });
  }
});

// @desc Get default categories
// @route GET /api/categories/defaults
// @access Private
export const getDefaultCategories = asyncHandler(async (req, res) => {
  try {
    const defaultCategories = [
      { name: "Food & Dining", description: "Restaurants, groceries, food delivery" },
      { name: "Transportation", description: "Gas, public transport, rideshare" },
      { name: "Entertainment", description: "Movies, games, subscriptions" },
      { name: "Shopping", description: "Clothing, electronics, general shopping" },
      { name: "Travel", description: "Hotels, flights, vacation expenses" },
      { name: "Utilities", description: "Electricity, water, internet bills" },
      { name: "Healthcare", description: "Medical expenses, pharmacy" },
      { name: "Education", description: "Books, courses, school expenses" },
    ];

    res.status(200).json({ success: true, categories: defaultCategories });
  } catch (error) {
    console.error("Error getting default categories:", error);
    res.status(500).json({ success: false, message: "Failed to get default categories" });
  }
});
