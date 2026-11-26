import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../database/prisma.js";
import { AppError } from "../utils/AppError.js";

export const ACCESS_COOKIE_NAME = "cv_access";
export const REFRESH_COOKIE_NAME = "cv_refresh";

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = env.isTest ? 8 : 12;

// Precomputed valid bcrypt hash for constant-time dummy verification on missing emails.
const DUMMY_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8uY5rL0E3J1xH7kH9M1mQJmO7uN0W2";

export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  favoriteGenres: true,
  createdAt: true,
  updatedAt: true,
};

export function hashOpaqueToken(rawToken) {
  return crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`refresh:${rawToken}`)
    .digest("hex");
}

export function signAccessToken(userId, sessionId) {
  return jwt.sign(
    { sub: userId, sid: sessionId, type: "access" },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresIn: "15m",
    },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
}

export function getAuthCookieOptions(maxAgeMs) {
  const secure = env.isProduction || env.COOKIE_SAME_SITE === "none";
  return {
    httpOnly: true,
    secure,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/",
    ...(typeof maxAgeMs === "number" ? { maxAge: maxAgeMs } : {}),
  };
}

export const ACCESS_TTL = ACCESS_TTL_MS;
export const REFRESH_TTL = REFRESH_TTL_MS;

export async function registerUser({ name, email, password, userAgent }) {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new AppError(
      "An account with this email already exists.",
      409,
      "EMAIL_EXISTS",
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const rawRefreshToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashOpaqueToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  const { user, session } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: SAFE_USER_SELECT,
    });

    const createdSession = await tx.userSession.create({
      data: {
        userId: createdUser.id,
        tokenHash,
        userAgent: userAgent ? userAgent.slice(0, 250) : null,
        expiresAt,
      },
    });

    return { user: createdUser, session: createdSession };
  });

  const accessToken = signAccessToken(user.id, session.id);
  return { user, accessToken, refreshToken: rawRefreshToken };
}

export async function loginUser({ email, password, userAgent }) {
  const userRecord = await prisma.user.findUnique({
    where: { email },
    select: {
      ...SAFE_USER_SELECT,
      passwordHash: true,
    },
  });

  const hashToVerify = userRecord?.passwordHash || DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(password, hashToVerify);

  if (!userRecord || !passwordMatches) {
    throw new AppError(
      "Invalid email or password.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const rawRefreshToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashOpaqueToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  const session = await prisma.userSession.create({
    data: {
      userId: userRecord.id,
      tokenHash,
      userAgent: userAgent ? userAgent.slice(0, 250) : null,
      expiresAt,
    },
  });

  const { passwordHash: _omitted, ...safeUser } = userRecord;
  void _omitted;
  const accessToken = signAccessToken(safeUser.id, session.id);

  return { user: safeUser, accessToken, refreshToken: rawRefreshToken };
}

export async function refreshUserSession(rawRefreshToken, userAgent) {
  if (!rawRefreshToken) {
    throw new AppError("Session expired. Please sign in again.", 401, "UNAUTHORIZED");
  }

  const tokenHash = hashOpaqueToken(rawRefreshToken);
  const existingSession = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: { user: { select: SAFE_USER_SELECT } },
  });

  if (!existingSession) {
    throw new AppError("Session invalid. Please sign in again.", 401, "UNAUTHORIZED");
  }

  // Token reuse detection: revoke all sessions for this user.
  if (existingSession.revokedAt) {
    await prisma.userSession.updateMany({
      where: { userId: existingSession.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError(
      "Session was already revoked. Please sign in again.",
      401,
      "SESSION_REVOKED",
    );
  }

  if (existingSession.expiresAt <= new Date()) {
    throw new AppError("Session expired. Please sign in again.", 401, "SESSION_EXPIRED");
  }

  const newRawRefreshToken = crypto.randomBytes(48).toString("hex");
  const newTokenHash = hashOpaqueToken(newRawRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  const nextSession = await prisma.$transaction(async (tx) => {
    await tx.userSession.update({
      where: { id: existingSession.id },
      data: { revokedAt: new Date() },
    });

    return tx.userSession.create({
      data: {
        userId: existingSession.userId,
        tokenHash: newTokenHash,
        userAgent: userAgent ? userAgent.slice(0, 250) : null,
        expiresAt: newExpiresAt,
      },
    });
  });

  const accessToken = signAccessToken(existingSession.user.id, nextSession.id);
  return {
    user: existingSession.user,
    accessToken,
    refreshToken: newRawRefreshToken,
  };
}

export async function logoutSession({ sessionId, rawRefreshToken }) {
  const now = new Date();
  if (sessionId) {
    await prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
    return;
  }

  if (rawRefreshToken) {
    const tokenHash = hashOpaqueToken(rawRefreshToken);
    await prisma.userSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
