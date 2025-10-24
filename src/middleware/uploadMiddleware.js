import multer from "multer";
import cloudinary from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Cloudinary storage for receipts
const receiptStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "expense-splitter/receipts",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    transformation: [
      { width: 1000, height: 1000, crop: "limit" },
      { quality: "auto" },
    ],
  },
});

// Create Cloudinary storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "expense-splitter/avatars",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [
      { width: 200, height: 200, crop: "fill", gravity: "face" },
      { quality: "auto" },
    ],
  },
});

// Configure multer for receipts
const receiptUpload = multer({
  storage: receiptStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and PDF files are allowed"));
    }
  },
});

// Configure multer for avatars
const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
  },
  fileFilter: (req, file, cb) => {
    // Check file type for avatars (only images)
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG files are allowed for avatars"));
    }
  },
});

// Single file upload middleware for receipts
export const uploadReceipt = receiptUpload.single("receipt");

// Multiple files upload middleware for receipts
export const uploadMultipleReceipts = receiptUpload.array("receipts", 5); // Max 5 files

// Single file upload middleware for avatars
export const uploadAvatar = avatarUpload.single("avatar");

// Error handling middleware for multer
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const maxSize = req.route?.path?.includes('avatar') ? "2MB" : "5MB";
      return res.status(400).json({
        success: false,
        message: `File size too large. Maximum size is ${maxSize}.`,
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum 5 files allowed.",
      });
    }
  }
  
  if (err.message === "Only JPEG, PNG, and PDF files are allowed") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err.message === "Only JPEG and PNG files are allowed for avatars") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
};

// Utility function to delete file from Cloudinary
export const deleteCloudinaryFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    throw error;
  }
};

// Utility function to get file info from Cloudinary URL
export const getFileInfo = (url) => {
  try {
    const publicId = url.split("/").pop().split(".")[0];
    return {
      publicId: `expense-splitter/receipts/${publicId}`,
      url: url,
    };
  } catch (error) {
    console.error("Error parsing Cloudinary URL:", error);
    return null;
  }
};
