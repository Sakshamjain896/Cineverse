import { AppError } from "../utils/AppError.js";

/**
 * Validates request body, query, and params against Zod schemas.
 * Stores parsed values on req.validated without mutating Express 5 getters.
 */
export function validate(schemas = {}) {
  return (req, _res, next) => {
    const validated = {};

    for (const key of ["params", "query", "body"]) {
      const schema = schemas[key];
      if (!schema) continue;

      const parsed = schema.safeParse(req[key]);
      if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || key,
          message: issue.message,
        }));
        return next(
          new AppError(
            details[0]?.message || "Invalid request input.",
            400,
            "VALIDATION_ERROR",
            details,
          ),
        );
      }

      validated[key] = parsed.data;
    }

    req.validated = validated;
    return next();
  };
}
