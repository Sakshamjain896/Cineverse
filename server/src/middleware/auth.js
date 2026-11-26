import { prisma } from "../database/prisma.js";
import {
  ACCESS_COOKIE_NAME,
  SAFE_USER_SELECT,
  verifyAccessToken,
} from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";

/**
 * Verifies the HTTP-only access JWT and active server-side UserSession.
 */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  if (!token) {
    return next(new AppError("Authentication required.", 401, "UNAUTHORIZED"));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(
      new AppError("Invalid or expired session.", 401, "UNAUTHORIZED"),
    );
  }

  if (
    payload?.type !== "access" ||
    typeof payload?.sub !== "string" ||
    typeof payload?.sid !== "string"
  ) {
    return next(new AppError("Invalid session token.", 401, "UNAUTHORIZED"));
  }

  const session = await prisma.userSession.findUnique({
    where: { id: payload.sid },
    select: {
      id: true,
      revokedAt: true,
      expiresAt: true,
      user: { select: SAFE_USER_SELECT },
    },
  });

  if (
    !session ||
    session.revokedAt !== null ||
    session.expiresAt <= new Date() ||
    !session.user ||
    session.user.id !== payload.sub
  ) {
    return next(
      new AppError("Session is no longer active.", 401, "UNAUTHORIZED"),
    );
  }

  req.user = session.user;
  req.sessionId = session.id;
  return next();
}
