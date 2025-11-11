import rateLimit from "express-rate-limit";

// General API rate limiter - DISABLED FOR TESTING
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit for testing
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for authentication endpoints - DISABLED FOR TESTING
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit for testing
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Moderate rate limiter for expense operations - DISABLED FOR TESTING
export const expenseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit for testing
  message: {
    success: false,
    message: "Too many expense operations, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiter - DISABLED FOR TESTING
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10000, // Very high limit for testing
  message: {
    success: false,
    message: "Too many file uploads, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export rate limiter - DISABLED FOR TESTING
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10000, // Very high limit for testing
  message: {
    success: false,
    message: "Too many export requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search rate limiter - DISABLED FOR TESTING
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10000, // Very high limit for testing
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
