import express, { Router } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import movieRoutes from "./routes/movie.routes.js";
import userRoutes from "./routes/user.routes.js";
import watchlistRoutes from "./routes/watchlist.routes.js";
import { httpLogger } from "./utils/logger.js";

const app = express();

app.set("trust proxy", env.trustProxy);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Structured request logging + X-Request-Id
app.use(httpLogger);

// Strict CORS origin validation
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, "");
      if (env.allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Request-Id"],
  }),
);

// Safe request parsing
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));
app.use(cookieParser());

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    success: true,
    name: "Cineverse API",
    version: "v1",
    message: "Cineverse backend is running.",
  });
});

// Versioned API router
const apiRouter = Router();
apiRouter.use(apiLimiter);
apiRouter.use(healthRoutes);
apiRouter.use("/movies", movieRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/watchlist", watchlistRoutes);

app.use("/api/v1", apiRouter);
// Backward-compatible /api alias
app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
