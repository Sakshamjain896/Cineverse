
import express from "express";
import cors from "cors";
import helmet from "helmet";
import movieRoutes from "./routes/movie.routes.js";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "Cineverse API",
    message: "Cineverse backend is running.",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "Cineverse API",
  });
});

// TMDB Movie API routes
app.use("/api/movies", movieRoutes);

export default app;
