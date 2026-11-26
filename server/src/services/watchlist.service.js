import { prisma } from "../database/prisma.js";
import { getMovieDetails } from "./tmdb.service.js";
import { AppError } from "../utils/AppError.js";

const TMDB_PATH_PREFIX_RE = /^https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)/;
const SAFE_TMDB_PATH_RE = /^\/[a-zA-Z0-9._-]+$/;

function sanitizeImagePath(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().replace(TMDB_PATH_PREFIX_RE, "");
  return SAFE_TMDB_PATH_RE.test(trimmed) ? trimmed : null;
}

function buildSnapshotFields(input = {}) {
  return {
    title: input.title ? input.title.slice(0, 300) : null,
    posterPath: sanitizeImagePath(input.posterPath),
    backdropPath: sanitizeImagePath(input.backdropPath),
    releaseYear: input.releaseYear ? String(input.releaseYear).slice(0, 10) : null,
    voteAverage:
      typeof input.voteAverage === "number" && Number.isFinite(input.voteAverage)
        ? Number(input.voteAverage.toFixed(1))
        : null,
    genres: Array.isArray(input.genres) ? input.genres.slice(0, 10) : [],
  };
}

function detailsToSnapshot(details) {
  return {
    title: details.title || details.original_title || null,
    posterPath: sanitizeImagePath(details.poster_path),
    backdropPath: sanitizeImagePath(details.backdrop_path),
    releaseYear: details.release_date ? details.release_date.slice(0, 4) : null,
    voteAverage:
      typeof details.vote_average === "number"
        ? Number(details.vote_average.toFixed(1))
        : null,
    genres: Array.isArray(details.genres)
      ? details.genres.map((g) => g.name).filter(Boolean).slice(0, 10)
      : [],
  };
}

async function hydrateMissingSnapshots(items) {
  const missing = items.filter((item) => !item.title).slice(0, 6);
  if (!missing.length) return items;

  const updates = await Promise.all(
    missing.map(async (item) => {
      try {
        const details = await getMovieDetails(item.tmdbId);
        const snapshot = detailsToSnapshot(details);
        return await prisma.watchlistItem.update({
          where: { id: item.id },
          data: snapshot,
        });
      } catch {
        return item;
      }
    }),
  );

  const byId = new Map(updates.map((row) => [row.id, row]));
  return items.map((item) => byId.get(item.id) || item);
}

export async function listUserWatchlist(userId, { page = 1, limit = 24 } = {}) {
  const skip = (page - 1) * limit;

  const [total, rawItems] = await prisma.$transaction([
    prisma.watchlistItem.count({ where: { userId } }),
    prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const items = await hydrateMissingSnapshots(rawItems);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function addWatchlistItem(userId, input) {
  let snapshot = buildSnapshotFields(input);

  if (!snapshot.title) {
    try {
      const details = await getMovieDetails(input.tmdbId);
      snapshot = detailsToSnapshot(details);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        throw error;
      }
    }
  }

  const existing = await prisma.watchlistItem.findUnique({
    where: { userId_tmdbId: { userId, tmdbId: input.tmdbId } },
  });

  if (existing) {
    const item =
      !existing.title && snapshot.title
        ? await prisma.watchlistItem.update({
            where: { id: existing.id },
            data: snapshot,
          })
        : existing;

    return { item, created: false };
  }

  const item = await prisma.watchlistItem.create({
    data: {
      userId,
      tmdbId: input.tmdbId,
      ...snapshot,
    },
  });

  return { item, created: true };
}

export async function mergeUserWatchlist(userId, items) {
  const deduped = new Map();
  for (const item of items) {
    if (!deduped.has(item.tmdbId)) {
      deduped.set(item.tmdbId, item);
    }
  }

  const entries = Array.from(deduped.values());
  if (entries.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.watchlistItem.createMany({
        data: entries.map((entry) => ({
          userId,
          tmdbId: entry.tmdbId,
          ...buildSnapshotFields(entry),
        })),
        skipDuplicates: true,
      });
    });
  }

  return listUserWatchlist(userId, { page: 1, limit: 50 });
}

export async function removeWatchlistItem(userId, tmdbId) {
  const result = await prisma.watchlistItem.deleteMany({
    where: { userId, tmdbId },
  });

  if (result.count === 0) {
    throw new AppError(
      "Movie was not found in your watchlist.",
      404,
      "WATCHLIST_ITEM_NOT_FOUND",
    );
  }

  return { tmdbId, removed: true };
}
