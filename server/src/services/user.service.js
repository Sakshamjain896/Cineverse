import bcrypt from "bcryptjs";
import { prisma } from "../database/prisma.js";
import { SAFE_USER_SELECT } from "./auth.service.js";
import { AppError } from "../utils/AppError.js";
import { CANONICAL_GENRES } from "../validators/auth.validator.js";

const ALLOWED_GENRE_SET = new Set(CANONICAL_GENRES);

export async function updateUserProfile(userId, { name, favoriteGenres }) {
  const data = {};
  if (name !== undefined) {
    data.name = name;
  }
  if (favoriteGenres !== undefined) {
    const normalized = Array.from(
      new Set(favoriteGenres.filter((genre) => ALLOWED_GENRE_SET.has(genre))),
    );
    data.favoriteGenres = normalized;
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: SAFE_USER_SELECT,
  });
}

export async function deleteUserAccount(userId, password) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new AppError("Account not found.", 404, "NOT_FOUND");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(
      "Password is incorrect. Account was not deleted.",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.userSession.deleteMany({ where: { userId } });
    await tx.watchlistItem.deleteMany({ where: { userId } });
    await tx.searchHistory.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
}

export async function getUserSearchHistory(userId) {
  const items = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { id: true, query: true, updatedAt: true },
  });
  return items;
}

export async function recordUserSearchHistory(userId, query) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.searchHistory.upsert({
      where: {
        userId_query: { userId, query },
      },
      update: { updatedAt: new Date() },
      create: { userId, query },
      select: { id: true, query: true, updatedAt: true },
    });

    const older = await tx.searchHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      skip: 12,
      select: { id: true },
    });

    if (older.length > 0) {
      await tx.searchHistory.deleteMany({
        where: { id: { in: older.map((row) => row.id) } },
      });
    }

    return entry;
  });
}

export async function clearUserSearchHistory(userId) {
  await prisma.searchHistory.deleteMany({ where: { userId } });
}
