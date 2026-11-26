import crypto from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const CSRF_COOKIE_NAME = "cv_csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function signCsrfSecret(secret) {
  return crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`csrf:${secret}`)
    .digest("hex");
}

function constantTimeEquals(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function getCookieSecurityOptions(maxAgeMs) {
  const secure = env.isProduction || env.COOKIE_SAME_SITE === "none";
  return {
    httpOnly: true,
    secure,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/",
    ...(typeof maxAgeMs === "number" ? { maxAge: maxAgeMs } : {}),
  };
}

/**
 * Ensures a signed double-submit CSRF cookie exists and returns the client token.
 */
export function ensureCsrfToken(req, res) {
  let secret = req.cookies?.[CSRF_COOKIE_NAME];
  if (!secret || typeof secret !== "string" || secret.length < 32) {
    secret = crypto.randomBytes(32).toString("hex");
    res.cookie(
      CSRF_COOKIE_NAME,
      secret,
      getCookieSecurityOptions(7 * 24 * 60 * 60 * 1000),
    );
  }
  return signCsrfSecret(secret);
}

/**
 * Rotates the CSRF secret cookie and returns a fresh signed client token.
 */
export function rotateCsrfToken(res) {
  const secret = crypto.randomBytes(32).toString("hex");
  res.cookie(
    CSRF_COOKIE_NAME,
    secret,
    getCookieSecurityOptions(7 * 24 * 60 * 60 * 1000),
  );
  return signCsrfSecret(secret);
}

function extractRequestOrigin(req) {
  const origin = req.get("origin");
  if (origin) return origin.replace(/\/+$/, "");

  const referer = req.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return "__invalid__";
  }
}

/**
 * Enforces Origin/Referer allowlist and signed double-submit CSRF verification
 * on unsafe HTTP methods that rely on cookie authentication.
 */
export function verifyCsrf({ requireToken = true } = {}) {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const requestOrigin = extractRequestOrigin(req);
    if (requestOrigin) {
      if (!env.allowedOrigins.includes(requestOrigin)) {
        return next(
          new AppError("Cross-origin request denied.", 403, "CSRF_ORIGIN_DENIED"),
        );
      }
    }

    if (!requireToken) {
      return next();
    }

    const cookieSecret = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.get("x-csrf-token");

    if (!cookieSecret || !headerToken) {
      return next(
        new AppError("Missing CSRF security token.", 403, "CSRF_MISSING"),
      );
    }

    const expectedToken = signCsrfSecret(cookieSecret);
    if (!constantTimeEquals(headerToken, expectedToken)) {
      return next(
        new AppError("Invalid CSRF security token.", 403, "CSRF_INVALID"),
      );
    }

    return next();
  };
}
