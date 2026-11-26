
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_CACHE_ENTRIES = 250;

const TTL = {
  SHORT: 3 * 60 * 1000,
  TRENDING: 5 * 60 * 1000,
  STANDARD: 15 * 60 * 1000,
  DETAIL: 30 * 60 * 1000,
  GENRES: 24 * 60 * 60 * 1000,
};

const responseCache = new Map();
const inFlightRequests = new Map();

export function clearTmdbCache() {
  responseCache.clear();
  inFlightRequests.clear();
}

function getCachedValue(key) {
  const entry = responseCache.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }

  // Refresh insertion order for basic LRU behavior.
  responseCache.delete(key);
  responseCache.set(key, entry);

  return entry.data;
}

function setCachedValue(key, data, ttlMs) {
  if (ttlMs <= 0) return;

  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;

    if (oldestKey) {
      responseCache.delete(oldestKey);
    }
  }

  responseCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

async function fetchTmdbJson(url) {
  let response;

  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${env.TMDB_ACCESS_TOKEN}`,
        accept: "application/json",
      },
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new AppError(
        "Movie service timed out. Please try again.",
        504,
        "UPSTREAM_TIMEOUT",
      );
    }

    throw new AppError(
      "Unable to reach movie service.",
      502,
      "UPSTREAM_UNREACHABLE",
    );
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new AppError("Movie not found.", 404, "MOVIE_NOT_FOUND");
    }

    if (response.status === 429) {
      throw new AppError(
        "Movie catalog is temporarily rate-limited. Please retry shortly.",
        503,
        "UPSTREAM_RATE_LIMITED",
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new AppError(
        "Movie catalog authentication failed on server.",
        502,
        "UPSTREAM_AUTH_ERROR",
      );
    }

    throw new AppError(
      "Unable to retrieve movies from TMDB.",
      502,
      "UPSTREAM_ERROR",
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new AppError(
      "Received invalid data from movie service.",
      502,
      "UPSTREAM_INVALID_RESPONSE",
    );
  }

  if (!data || typeof data !== "object") {
    throw new AppError(
      "Received unexpected response from movie service.",
      502,
      "UPSTREAM_INVALID_RESPONSE",
    );
  }

  return data;
}

async function tmdbRequest(endpoint, params = {}, ttlMs = TTL.STANDARD) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const cacheKey = url.toString();

  const cached = getCachedValue(cacheKey);

  if (cached) return cached;

  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = fetchTmdbJson(url)
    .then((data) => {
      setCachedValue(cacheKey, data, ttlMs);
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, promise);

  return promise;
}

export const getTrendingMovies = (timeWindow = "day", page = 1) =>
  tmdbRequest(
    `/trending/movie/${timeWindow === "week" ? "week" : "day"}`,
    { page },
    TTL.TRENDING,
  );

export const getPopularMovies = (page = 1) =>
  tmdbRequest("/movie/popular", { page }, TTL.STANDARD);

export const getTopRatedMovies = (page = 1) =>
  tmdbRequest("/movie/top_rated", { page }, TTL.STANDARD);

export const getNowPlayingMovies = (page = 1) =>
  tmdbRequest("/movie/now_playing", { page }, TTL.TRENDING);

export const getGenres = () =>
  tmdbRequest("/genre/movie/list", { language: "en-US" }, TTL.GENRES);

export const discoverMovies = ({
  genres,
  sortBy = "popularity.desc",
  minVotes = 100,
  page = 1,
} = {}) =>
  tmdbRequest(
    "/discover/movie",
    {
      include_adult: false,
      include_video: false,
      language: "en-US",
      page,
      sort_by: sortBy,
      with_genres: genres,
      "vote_count.gte": minVotes,
    },
    TTL.STANDARD,
  );

export const searchMovies = (query, page = 1) =>
  tmdbRequest(
    "/search/movie",
    {
      query,
      page,
      include_adult: false,
    },
    TTL.SHORT,
  );

export async function getMovieDetails(id) {
  const data = await tmdbRequest(
    `/movie/${encodeURIComponent(id)}`,
    { append_to_response: "credits,videos" },
    TTL.DETAIL,
  );

  const directors = (data.credits?.crew || [])
    .filter((member) => member.job === "Director")
    .map((member) => member.name)
    .filter(Boolean);

  const cast = (data.credits?.cast || [])
    .slice(0, 6)
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character || "",
    }));

  // Collect valid YouTube trailers.
  const youtubeVideos = (data.videos?.results || [])
    .filter(
      (video) =>
        video.site === "YouTube" &&
        typeof video.key === "string" &&
        video.key.length >= 6 &&
        video.key.length <= 20 &&
        /^[a-zA-Z0-9_-]+$/.test(video.key) &&
        video.type === "Trailer",
    )
    .sort((a, b) => {
      // Official trailers first.
      if (a.official !== b.official) {
        return Number(b.official) - Number(a.official);
      }

      // Prefer English trailers.
      const aEnglish = a.iso_639_1 === "en";
      const bEnglish = b.iso_639_1 === "en";

      if (aEnglish !== bEnglish) {
        return Number(bEnglish) - Number(aEnglish);
      }

      // Prefer newer uploads.
      const dateA = Date.parse(a.published_at || "") || 0;
      const dateB = Date.parse(b.published_at || "") || 0;

      return dateB - dateA;
    });

  const trailer = youtubeVideos[0] || null;

  return {
    id: data.id,
    title: data.title,
    original_title: data.original_title,
    tagline: data.tagline || "",
    overview: data.overview || "",
    poster_path: data.poster_path,
    backdrop_path: data.backdrop_path,
    release_date: data.release_date,
    vote_average: data.vote_average,
    vote_count: data.vote_count,
    runtime: data.runtime,
    genres: data.genres || [],
    director: directors.length ? directors.join(", ") : "Not listed",
    cast,

    // Backward compatibility with existing frontend components.
    trailerKey: trailer?.key || null,

    // Structured trailer metadata for the new player.
    trailer: trailer
      ? {
          key: trailer.key,
          name: trailer.name || "",
          site: trailer.site,
          type: trailer.type,
          official: Boolean(trailer.official),
          language: trailer.iso_639_1 || "en",
          publishedAt: trailer.published_at || null,
        }
      : null,
  };
}

export const getMovieRecommendations = (id, page = 1) =>
  tmdbRequest(
    `/movie/${encodeURIComponent(id)}/recommendations`,
    { page },
    TTL.DETAIL,
  );
