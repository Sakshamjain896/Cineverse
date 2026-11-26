import { z } from "zod";

export const CANONICAL_GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "TV Movie",
  "Thriller",
  "War",
  "Western",
  "Biography",
];

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(50, "Name cannot exceed 50 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(120, "Email cannot exceed 120 characters."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password cannot exceed 128 characters.")
    .regex(/[A-Za-z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(120),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(128),
});

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Display name must be at least 2 characters.")
      .max(50, "Display name cannot exceed 50 characters.")
      .optional(),
    favoriteGenres: z
      .array(z.string().trim().min(1).max(32))
      .max(15, "Select up to 15 favorite genres.")
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.favoriteGenres !== undefined,
    { message: "Provide at least one profile field to update." },
  );

export const deleteAccountSchema = z.object({
  password: z
    .string()
    .min(1, "Enter your current password to confirm account deletion.")
    .max(128),
});

export const searchHistoryCreateSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Search query cannot be empty.")
    .max(100, "Search query is too long."),
});
