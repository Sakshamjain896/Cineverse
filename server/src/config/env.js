import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TMDB_ACCESS_TOKEN: z.string().min(1, "TMDB_ACCESS_TOKEN is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_ISSUER: z.string().min(1).default("cineverse-api"),
  JWT_AUDIENCE: z.string().min(1).default("cineverse-web"),
  CLIENT_URL: z.string().optional().default(""),
  CORS_ORIGINS: z.string().optional().default(""),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY: z.string().optional().default(""),
  LOG_LEVEL: z.string().optional().default(""),
});

function buildEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment configuration: ${missing}`);
  }

  const data = parsed.data;
  const originCandidates = [data.CLIENT_URL, data.CORS_ORIGINS]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (data.NODE_ENV !== "production" && originCandidates.length === 0) {
    originCandidates.push("http://localhost:5173", "http://127.0.0.1:5173");
  }

  const trustProxyRaw = data.TRUST_PROXY.trim().toLowerCase();
  let trustProxy = data.NODE_ENV === "production" ? 1 : false;
  if (trustProxyRaw === "true") trustProxy = true;
  else if (trustProxyRaw === "false") trustProxy = false;
  else if (/^\d+$/.test(trustProxyRaw)) trustProxy = Number(trustProxyRaw);

  return {
    ...data,
    isProduction: data.NODE_ENV === "production",
    isTest: data.NODE_ENV === "test",
    allowedOrigins: Array.from(new Set(originCandidates)),
    trustProxy,
  };
}

export const env = buildEnv();
