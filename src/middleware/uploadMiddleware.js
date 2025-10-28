import multer from "multer";
import cloudinary from "cloudinary";
import { Readable } from "stream";

let cloudinaryConfigured = false;

const configureCloudinary = () => {
  if (cloudinaryConfigured) return;
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error(" Cloudinary credentials missing!");
    console.error("Missing:", {
      cloudName: !cloudName ? "CLOUDINARY_CLOUD_NAME" : null,
      apiKey: !apiKey ? "CLOUDINARY_API_KEY" : null,
      apiSecret: !apiSecret ? "CLOUDINARY_API_SECRET" : null,
    });
    throw new Error("Cloudinary configuration is missing. Please check your .env file.");
  }

  try {
    // Configure Cloudinary v2 API
    cloudinary.v2.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    cloudinaryConfigured = true;
    console.log("Cloudinary configured successfully");
  } catch (error) {
    console.error("Error configuring Cloudinary:", error);
    throw error;
  }
};

// Configure multer to store in memory
const receiptUpload = multer({
  storage: multer.memoryStorage(),
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

const avatarUpload = multer({
  storage: multer.memoryStorage(),
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

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (file, folder) => {
  configureCloudinary();
  
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: "auto", // auto-detect image, video, or raw
      transformation: folder.includes('receipts') 
        ? [{ width: 1000, height: 1000, crop: "limit" }, { quality: "auto" }]
        : [{ width: 200, height: 200, crop: "fill", gravity: "face" }, { quality: "auto" }],
    };

    const uploadStream = cloudinary.v2.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        console.log("✅ Cloudinary upload successful:", result.secure_url);
        resolve(result);
      }
    );

    // Handle stream errors
    uploadStream.on('error', (error) => {
      console.error("Upload stream error:", error);
      reject(error);
    });

    // Convert buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    
    // Handle buffer stream errors
    bufferStream.on('error', (error) => {
      console.error("Buffer stream error:", error);
      reject(error);
    });
    
    bufferStream.pipe(uploadStream);
  });
};

// Single file upload middleware for receipts with manual Cloudinary upload
export const uploadReceipt = async (req, res, next) => {
  console.log("📎 Multer upload middleware called");
  
  // First, handle multer file upload to memory
  receiptUpload.single("receipt")(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return next(err);
    }

    // If no file, move to next middleware
    if (!req.file) {
      return next();
    }

    try {
      console.log("Uploading file to Cloudinary:", req.file.originalname);
      
      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file, "expense-splitter/receipts");
      
      // Attach Cloudinary info to req.file (mimic multer-storage-cloudinary format)
      req.file.path = result.secure_url;
      req.file.filename = result.public_id;
      req.file.public_id = result.public_id;
      req.file.cloudinary_result = result;
      
      console.log("File uploaded to Cloudinary successfully");
      console.log("File info:", {
        originalname: req.file.originalname,
        path: req.file.path,
        public_id: req.file.public_id,
      });
      
      next();
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      return next(error);
    }
  });
};

// Multiple files upload middleware for receipts
export const uploadMultipleReceipts = receiptUpload.array("receipts", 5); // Max 5 files

// Single file upload middleware for avatars with manual Cloudinary upload
export const uploadAvatar = async (req, res, next) => {
  // First, handle multer file upload to memory
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return next(err);
    }

    // If no file, move to next middleware
    if (!req.file) {
      return next();
    }

    try {
      console.log("Uploading avatar to Cloudinary:", req.file.originalname);
      
      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file, "expense-splitter/avatars");
      
      // Attach Cloudinary info to req.file
      req.file.path = result.secure_url;
      req.file.filename = result.public_id;
      req.file.public_id = result.public_id;
      req.file.cloudinary_result = result;
      
      console.log("Avatar uploaded to Cloudinary successfully");
      
      next();
    } catch (error) {
      console.error("Error uploading avatar to Cloudinary:", error);
      return next(error);
    }
  });
};

// Error handling middleware for multer
export const handleUploadError = (err, req, res, next) => {
  console.error("Upload error caught:", err);
  console.error("Error details:", {
    message: err.message,
    code: err.code,
    http_code: err.http_code,
    name: err.name,
    stack: err.stack?.substring(0, 500),
  });
  
  // Check for Cloudinary errors
  if (err.http_code || err.message?.includes('Cloudinary') || err.message?.includes('api_key') || err.message?.includes('cloudinary')) {
    console.error("Cloudinary upload error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to upload file to cloud storage",
      error: err.message || "Cloudinary upload failed",
    });
  }
  
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
    // Handle other multer errors
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
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
    configureCloudinary(); // Ensure Cloudinary is configured
    const result = await cloudinary.v2.uploader.destroy(publicId);
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
