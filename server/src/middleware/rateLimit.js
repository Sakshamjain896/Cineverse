import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * Creates a standardized JSON rate limiter.
 */
export function createRateLimiter({
  windowMs,
  limit,
  message = "Too many requests. Please try again shortly.",
  skipInTest = true,
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () =>
      skipInTest && env.isTest && process.env.ENABLE_TEST_RATE_LIMIT !== "true",
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message,
      });
    },
  });
}

export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: "Too many API requests. Please wait a moment and try again.",
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: "Too many authentication attempts. Please try again in 15 minutes.",
});

export const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: 90,
  message: "Too many search requests. Please slow down briefly.",
});
