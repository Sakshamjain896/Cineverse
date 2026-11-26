import { Router } from "express";
import {
  getCsrf,
  login,
  logout,
  me,
  refresh,
  register,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../middleware/csrf.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/AppError.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

const router = Router();

router.get("/csrf", getCsrf);

router.post(
  "/register",
  authLimiter,
  verifyCsrf({ requireToken: false }),
  validate({ body: registerSchema }),
  asyncHandler(register),
);

router.post(
  "/login",
  authLimiter,
  verifyCsrf({ requireToken: false }),
  validate({ body: loginSchema }),
  asyncHandler(login),
);

router.post(
  "/refresh",
  authLimiter,
  verifyCsrf({ requireToken: false }),
  asyncHandler(refresh),
);

router.post(
  "/logout",
  verifyCsrf({ requireToken: true }),
  asyncHandler(logout),
);

router.get("/me", asyncHandler(requireAuth), me);

export default router;
