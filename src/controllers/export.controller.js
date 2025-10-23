import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  exportExpensesToCSV,
  exportSettlementsToCSV,
  exportUserExpensesToCSV,
} from "../utils/csvExporter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc Export group expenses to CSV
// @route GET /api/export/expenses/group/:groupId
// @access Private
export const exportGroupExpenses = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;
    const { format = "detailed" } = req.query;

    const csvFilePath = await exportExpensesToCSV(groupId, req.user._id, format);

    // Set appropriate headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="group-expenses-${groupId}-${Date.now()}.csv"`
    );

    // Stream the file
    const fileStream = fs.createReadStream(csvFilePath);
    fileStream.pipe(res);

    // Clean up the temporary file after streaming
    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(csvFilePath)) {
          fs.unlink(csvFilePath, (err) => {
            if (err) console.error("Error deleting temporary file:", err);
          });
        }
      }, 1000); // Clean up after 1 second
    });

    fileStream.on("error", (err) => {
      console.error("Error streaming file:", err);
      res.status(500).json({ success: false, message: "Error streaming file" });
    });
  } catch (error) {
    console.error("Error exporting group expenses:", error);
    res.status(500).json({ success: false, message: "Failed to export expenses" });
  }
});

// @desc Export group settlements to CSV
// @route GET /api/export/settlements/group/:groupId
// @access Private
export const exportGroupSettlements = asyncHandler(async (req, res) => {
  try {
    const { groupId } = req.params;

    const csvFilePath = await exportSettlementsToCSV(groupId, req.user._id);

    // Set appropriate headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="group-settlements-${groupId}-${Date.now()}.csv"`
    );

    // Stream the file
    const fileStream = fs.createReadStream(csvFilePath);
    fileStream.pipe(res);

    // Clean up the temporary file after streaming
    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(csvFilePath)) {
          fs.unlink(csvFilePath, (err) => {
            if (err) console.error("Error deleting temporary file:", err);
          });
        }
      }, 1000); // Clean up after 1 second
    });

    fileStream.on("error", (err) => {
      console.error("Error streaming file:", err);
      res.status(500).json({ success: false, message: "Error streaming file" });
    });
  } catch (error) {
    console.error("Error exporting group settlements:", error);
    res.status(500).json({ success: false, message: "Failed to export settlements" });
  }
});

// @desc Export user's personal expenses to CSV
// @route GET /api/export/expenses/user
// @access Private
export const exportUserExpenses = asyncHandler(async (req, res) => {
  try {
    const { format = "detailed" } = req.query;

    const csvFilePath = await exportUserExpensesToCSV(req.user._id, format);

    // Set appropriate headers
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="my-expenses-${Date.now()}.csv"`
    );

    // Stream the file
    const fileStream = fs.createReadStream(csvFilePath);
    fileStream.pipe(res);

    // Clean up the temporary file after streaming
    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(csvFilePath)) {
          fs.unlink(csvFilePath, (err) => {
            if (err) console.error("Error deleting temporary file:", err);
          });
        }
      }, 1000); // Clean up after 1 second
    });

    fileStream.on("error", (err) => {
      console.error("Error streaming file:", err);
      res.status(500).json({ success: false, message: "Error streaming file" });
    });
  } catch (error) {
    console.error("Error exporting user expenses:", error);
    res.status(500).json({ success: false, message: "Failed to export expenses" });
  }
});

// @desc Get export options and formats
// @route GET /api/export/options
// @access Private
export const getExportOptions = asyncHandler(async (req, res) => {
  try {
    const options = {
      formats: [
        {
          id: "detailed",
          name: "Detailed Export",
          description: "Complete expense data with all details",
        },
        {
          id: "summary",
          name: "Summary Export",
          description: "Category-wise summary and totals",
        },
      ],
      fileTypes: [
        {
          id: "csv",
          name: "CSV",
          description: "Comma-separated values file",
          mimeType: "text/csv",
        },
      ],
      exportTypes: [
        {
          id: "group-expenses",
          name: "Group Expenses",
          description: "Export all expenses for a specific group",
          endpoint: "/api/export/expenses/group/:groupId",
        },
        {
          id: "group-settlements",
          name: "Group Settlements",
          description: "Export all settlements for a specific group",
          endpoint: "/api/export/settlements/group/:groupId",
        },
        {
          id: "user-expenses",
          name: "Personal Expenses",
          description: "Export all your expenses across all groups",
          endpoint: "/api/export/expenses/user",
        },
      ],
    };

    res.status(200).json({ success: true, options });
  } catch (error) {
    console.error("Error getting export options:", error);
    res.status(500).json({ success: false, message: "Failed to get export options" });
  }
});
