import { Router } from "express";
import {
  addToWatchlist,
  listWatchlist,
  mergeWatchlist,
  removeFromWatchlist,
} from "../controllers/watchlist.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/AppError.js";
import {
  mergeWatchlistSchema,
  watchlistItemInputSchema,
  watchlistParamsSchema,
  watchlistQuerySchema,
} from "../validators/watchlist.validator.js";

const router = Router();

router.use(asyncHandler(requireAuth));

router.get(
  "/",
  validate({ query: watchlistQuerySchema }),
  asyncHandler(listWatchlist),
);

router.post(
  "/",
  verifyCsrf({ requireToken: true }),
  validate({ body: watchlistItemInputSchema }),
  asyncHandler(addToWatchlist),
);

router.post(
  "/merge",
  verifyCsrf({ requireToken: true }),
  validate({ body: mergeWatchlistSchema }),
  asyncHandler(mergeWatchlist),
);

router.delete(
  "/:tmdbId",
  verifyCsrf({ requireToken: true }),
  validate({ params: watchlistParamsSchema }),
  asyncHandler(removeFromWatchlist),
);

export default router;
