/**
 * Application-level operational error carrying an HTTP status and stable code.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Wraps an async Express route or middleware so rejections reach errorHandler.
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Sends a standardized JSON success payload while preserving top-level keys.
 */
export function sendSuccess(res, payload = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    ...payload,
  });
}
