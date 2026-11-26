import { Router } from "express";
import {
  getDetails,
  listDiscovered,
  listGenres,
  listNowPlaying,
  listPopular,
  listRecommendations,
  listTopRated,
  listTrending,
  searchCatalog,
} from "../controllers/movie.controller.js";
import { searchLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/AppError.js";
import {
  discoverQuerySchema,
  movieIdParamsSchema,
  pageQuerySchema,
  searchQuerySchema,
  trendingQuerySchema,
} from "../validators/movie.validator.js";

const router = Router();

router.get(
  "/trending",
  validate({ query: trendingQuerySchema }),
  asyncHandler(listTrending),
);

router.get(
  "/popular",
  validate({ query: pageQuerySchema }),
  asyncHandler(listPopular),
);

router.get(
  "/top-rated",
  validate({ query: pageQuerySchema }),
  asyncHandler(listTopRated),
);

router.get(
  "/now-playing",
  validate({ query: pageQuerySchema }),
  asyncHandler(listNowPlaying),
);

router.get("/genres", asyncHandler(listGenres));

router.get(
  "/discover",
  validate({ query: discoverQuerySchema }),
  asyncHandler(listDiscovered),
);

router.get(
  "/search",
  searchLimiter,
  validate({ query: searchQuerySchema }),
  asyncHandler(searchCatalog),
);

router.get(
  "/:id/recommendations",
  validate({ params: movieIdParamsSchema, query: pageQuerySchema }),
  asyncHandler(listRecommendations),
);

router.get(
  "/:id",
  validate({ params: movieIdParamsSchema }),
  asyncHandler(getDetails),
);

export default router;
