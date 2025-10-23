import rateLimit from "express-rate-limit";

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Moderate rate limiter for expense operations
export const expenseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: "Too many expense operations, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 uploads per minute
  message: {
    success: false,
    message: "Too many file uploads, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export rate limiter
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 exports per minute
  message: {
    success: false,
    message: "Too many export requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search rate limiter
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: {
    success: false,
    message: "Too many search requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Create custom rate limiter
export const createCustomLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
