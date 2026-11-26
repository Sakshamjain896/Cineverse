import { z } from "zod";

export const watchlistQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

export const watchlistItemInputSchema = z.object({
  tmdbId: z.coerce
    .number()
    .int("TMDB ID must be an integer.")
    .positive("TMDB ID must be positive."),
  title: z.string().trim().min(1).max(300).optional(),
  posterPath: z.string().trim().max(300).nullable().optional(),
  backdropPath: z.string().trim().max(300).nullable().optional(),
  releaseYear: z.string().trim().max(10).nullable().optional(),
  voteAverage: z.coerce.number().min(0).max(10).nullable().optional(),
  genres: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});

export const mergeWatchlistSchema = z.object({
  items: z
    .array(watchlistItemInputSchema)
    .max(100, "Cannot merge more than 100 items at once."),
});

export const watchlistParamsSchema = z.object({
  tmdbId: z.coerce
    .number()
    .int("TMDB ID must be an integer.")
    .positive("Invalid TMDB movie ID."),
});
