
import { Router } from "express";

import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getNowPlayingMovies,
  searchMovies,
  getMovieDetails,
  getMovieRecommendations,
} from "../services/tmdb.service.js";

const router = Router();

function handleError(res, error) {
  console.error("TMDB API Error:", {
    message: error.message,
    status: error.status,
    cause: error.cause?.message,
  });

  res.status(502).json({
    success: false,
    message: "Unable to retrieve movies from TMDB.",
    error: error.message,
    tmdbStatus: error.status || null,
  });
}

router.get("/trending", async (req, res) => {
  try {
    const data = await getTrendingMovies();
    res.json({ success: true, ...data });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/popular", async (req, res) => {
  try {
    const page = Math.min(Math.max(Number(req.query.page) || 1, 1), 500);
    const data = await getPopularMovies(page);
    res.json({ success: true, ...data });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/top-rated", async (req, res) => {
  try {
    const page = Math.min(Math.max(Number(req.query.page) || 1, 1), 500);
    const data = await getTopRatedMovies(page);
    res.json({ success: true, ...data });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/now-playing", async (req, res) => {
  try {
    const page = Math.min(Math.max(Number(req.query.page) || 1, 1), 500);
    const data = await getNowPlayingMovies(page);
    res.json({ success: true, ...data });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const page = Math.min(Math.max(Number(req.query.page) || 1, 1), 500);
    const data = await searchMovies(query, page);

    res.json({ success: true, ...data });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/:id/recommendations", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie ID.",
      });
    }

    const data = await getMovieRecommendations(id);
    res.json({ success: true, ...data });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie ID.",
      });
    }

    const data = await getMovieDetails(id);
    res.json({ success: true, ...data });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
