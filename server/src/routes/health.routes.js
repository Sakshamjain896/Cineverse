import { Router } from "express";
import { env } from "../config/env.js";
import { checkDatabaseConnection } from "../database/prisma.js";
import { sendSuccess } from "../utils/AppError.js";

const router = Router();

router.get("/health", (_req, res) => {
  return sendSuccess(res, {
    status: "healthy",
    service: "Cineverse API",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

router.get("/health/ready", async (_req, res) => {
  try {
    await checkDatabaseConnection();
    return sendSuccess(res, {
      status: "ready",
      service: "Cineverse API",
      database: "connected",
      tmdbConfigured: Boolean(env.TMDB_ACCESS_TOKEN),
    });
  } catch {
    return res.status(503).json({
      success: false,
      status: "not_ready",
      code: "DEPENDENCY_UNAVAILABLE",
      message: "Database connection is currently unavailable.",
    });
  }
});

export default router;
