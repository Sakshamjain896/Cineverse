import { z } from "zod";

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export const trendingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  timeWindow: z.enum(["day", "week"]).default("day"),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required.").max(100),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export const discoverQuerySchema = z.object({
  genres: z
    .string()
    .trim()
    .regex(/^\d+(,\d+)*$/, "Genres must be comma-separated numeric TMDB IDs.")
    .optional(),
  sortBy: z
    .enum([
      "popularity.desc",
      "vote_average.desc",
      "primary_release_date.desc",
      "revenue.desc",
    ])
    .default("popularity.desc"),
  minVotes: z.coerce.number().int().min(0).max(5000).default(100),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export const movieIdParamsSchema = z.object({
  id: z.coerce.number().int().positive("Invalid movie ID."),
});
