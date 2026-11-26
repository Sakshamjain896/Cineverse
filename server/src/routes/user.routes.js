import { Router } from "express";
import {
  addSearchHistory,
  clearSearchHistory,
  deleteMe,
  listSearchHistory,
  updateMe,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/AppError.js";
import {
  deleteAccountSchema,
  searchHistoryCreateSchema,
  updateProfileSchema,
} from "../validators/auth.validator.js";

const router = Router();

router.use(asyncHandler(requireAuth));

router.patch(
  "/me",
  verifyCsrf({ requireToken: true }),
  validate({ body: updateProfileSchema }),
  asyncHandler(updateMe),
);

router.delete(
  "/me",
  verifyCsrf({ requireToken: true }),
  validate({ body: deleteAccountSchema }),
  asyncHandler(deleteMe),
);

router.get("/me/search-history", asyncHandler(listSearchHistory));

router.post(
  "/me/search-history",
  verifyCsrf({ requireToken: true }),
  validate({ body: searchHistoryCreateSchema }),
  asyncHandler(addSearchHistory),
);

router.delete(
  "/me/search-history",
  verifyCsrf({ requireToken: true }),
  asyncHandler(clearSearchHistory),
);

export default router;
