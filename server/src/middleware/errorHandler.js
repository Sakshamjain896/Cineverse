import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

export function notFoundHandler(req, _res, next) {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      "NOT_FOUND",
    ),
  );
}

export function errorHandler(err, req, res, _next) {
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
  let message =
    err instanceof AppError
      ? err.message
      : "An unexpected server error occurred.";
  let details = err instanceof AppError ? err.details : undefined;

  if (err?.type === "entity.parse.failed" || (err instanceof SyntaxError && err.status === 400)) {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Malformed JSON request payload.";
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = err.issues[0]?.message || "Invalid request data.";
    details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 409;
      code = "CONFLICT";
      message = "A record with that value already exists.";
    } else if (err.code === "P2025") {
      statusCode = 404;
      code = "NOT_FOUND";
      message = "Requested record was not found.";
    } else if (err.code === "P2003") {
      statusCode = 400;
      code = "INVALID_REFERENCE";
      message = "Invalid resource reference.";
    } else {
      statusCode = 500;
      code = "DATABASE_ERROR";
      message = "A database error occurred.";
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Invalid database input.";
  }

  if (statusCode >= 500) {
    req.log?.error({ err, requestId: req.id }, "Unhandled server error");
  } else if (statusCode >= 400) {
    req.log?.warn({ statusCode, code, message, requestId: req.id }, "Request failed");
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(details ? { details } : {}),
    ...(req.id ? { requestId: req.id } : {}),
  });
}
