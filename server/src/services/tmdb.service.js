import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_CACHE_ENTRIES = 250;

const LANGUAGE_CONFIG = {
  en: { originalLanguage: "en", tmdbLocale: "en-US" },
  hi: { originalLanguage: "hi", tmdbLocale: "hi-IN" },
  es: { originalLanguage: "es", tmdbLocale: "es-ES" },
  fr: { originalLanguage: "fr", tmdbLocale: "fr-FR" },
  ja: { originalLanguage: "ja", tmdbLocale: "ja-JP" },
  ko: { originalLanguage: "ko", tmdbLocale: "ko-KR" },
};

function resolveLanguageConfig(lang = "en") {
  return LANGUAGE_CONFIG[lang] || LANGUAGE_CONFIG.en;
}

function isoDateMonthsAgo(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

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
  responseCache.delete(key);
  responseCache.set(key, entry);
  return entry.data;
}

function setCachedValue(key, data, ttlMs) {
  if (ttlMs <= 0) return;
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
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

function filterByOriginalLanguage(results = [], originalLanguage) {
  return results.filter(
    (movie) => movie && movie.original_language === originalLanguage,
  );
}

export async function getTrendingMovies(
  timeWindow = "day",
  page = 1,
  lang = "en",
) {
  const { originalLanguage, tmdbLocale } = resolveLanguageConfig(lang);
  const trendingData = await tmdbRequest(
    `/trending/movie/${timeWindow === "week" ? "week" : "day"}`,
    { page, language: tmdbLocale },
    TTL.TRENDING,
  );

  const filteredTrending = filterByOriginalLanguage(
    trendingData.results,
    originalLanguage,
  );

  if (originalLanguage === "en" && filteredTrending.length >= 6) {
    return { ...trendingData, results: filteredTrending };
  }

  // Supplement with recent popular releases in the exact selected language.
  const recentDiscover = await tmdbRequest(
    "/discover/movie",
    {
      include_adult: false,
      include_video: false,
      language: tmdbLocale,
      with_original_language: originalLanguage,
      sort_by: "popularity.desc",
      "primary_release_date.gte": isoDateMonthsAgo(24),
      "primary_release_date.lte": isoToday(),
      "vote_count.gte": originalLanguage === "en" ? 25 : 5,
      page,
    },
    TTL.TRENDING,
  );

  const seen = new Set(filteredTrending.map((m) => m.id));
  const merged = [
    ...filteredTrending,
    ...filterByOriginalLanguage(recentDiscover.results, originalLanguage).filter(
      (m) => !seen.has(m.id),
    ),
  ];

  return {
    ...recentDiscover,
    results: merged.slice(0, 20),
  };
}

export async function getPopularMovies(page = 1, lang = "en") {
  const { originalLanguage, tmdbLocale } = resolveLanguageConfig(lang);
  const data = await tmdbRequest(
    "/discover/movie",
    {
      include_adult: false,
      include_video: false,
      language: tmdbLocale,
      with_original_language: originalLanguage,
      sort_by: "popularity.desc",
      "vote_count.gte": originalLanguage === "en" ? 100 : 20,
      page,
    },
    TTL.STANDARD,
  );
  return {
    ...data,
    results: filterByOriginalLanguage(data.results, originalLanguage),
  };
}

export async function getTopRatedMovies(page = 1, lang = "en") {
  const { originalLanguage, tmdbLocale } = resolveLanguageConfig(lang);
  const data = await tmdbRequest(
    "/discover/movie",
    {
      include_adult: false,
      include_video: false,
      language: tmdbLocale,
      with_original_language: originalLanguage,
      sort_by: "vote_average.desc",
      "vote_count.gte": originalLanguage === "en" ? 300 : 50,
      page,
    },
    TTL.STANDARD,
  );
  return {
    ...data,
    results: filterByOriginalLanguage(data.results, originalLanguage),
  };
}

export async function getNowPlayingMovies(page = 1, lang = "en") {
  const { originalLanguage, tmdbLocale } = resolveLanguageConfig(lang);
  const data = await tmdbRequest(
    "/discover/movie",
    {
      include_adult: false,
      include_video: false,
      language: tmdbLocale,
      with_original_language: originalLanguage,
      sort_by: "primary_release_date.desc",
      "primary_release_date.gte": isoDateMonthsAgo(9),
      "primary_release_date.lte": isoToday(),
      "vote_count.gte": originalLanguage === "en" ? 20 : 3,
      page,
    },
    TTL.TRENDING,
  );
  return {
    ...data,
    results: filterByOriginalLanguage(data.results, originalLanguage),
  };
}

export function getGenres(lang = "en") {
  const { tmdbLocale } = resolveLanguageConfig(lang);
  return tmdbRequest(
    "/genre/movie/list",
    { language: tmdbLocale },
    TTL.GENRES,
  );
}

export async function discoverMovies({
  genres,
  sortBy = "popularity.desc",
  minVotes = 100,
  page = 1,
  lang = "en",
} = {}) {
  const { originalLanguage, tmdbLocale } = resolveLanguageConfig(lang);
  const effectiveMinVotes =
    originalLanguage === "en" ? minVotes : Math.min(minVotes, 20);

  const data = await tmdbRequest(
    "/discover/movie",
    {
      include_adult: false,
      include_video: false,
      language: tmdbLocale,
      with_original_language: originalLanguage,
      page,
      sort_by: sortBy,
      with_genres: genres,
      "vote_count.gte": effectiveMinVotes,
    },
    TTL.STANDARD,
  );

  return {
    ...data,
    results: filterByOriginalLanguage(data.results, originalLanguage),
  };
}

export async function searchMovies(query, page = 1, lang = "en") {
  const { originalLanguage, tmdbLocale } = resolveLanguageConfig(lang);
  const firstPage = await tmdbRequest(
    "/search/movie",
    {
      query,
      page,
      include_adult: false,
      language: tmdbLocale,
    },
    TTL.SHORT,
  );

  let filtered = filterByOriginalLanguage(firstPage.results, originalLanguage);

  // If searching non-English catalog on page 1 yields sparse hits, scan pages 2-3.
  if (page === 1 && filtered.length < 4 && (firstPage.total_pages || 1) > 1) {
    const maxExtraPage = Math.min(firstPage.total_pages, 3);
    const extraPromises = [];
    for (let p = 2; p <= maxExtraPage; p += 1) {
      extraPromises.push(
        tmdbRequest(
          "/search/movie",
          { query, page: p, include_adult: false, language: tmdbLocale },
          TTL.SHORT,
        ).catch(() => null),
      );
    }
    const extraPages = await Promise.all(extraPromises);
    const seen = new Set(filtered.map((m) => m.id));
    for (const extra of extraPages) {
      if (!extra?.results) continue;
      for (const movie of filterByOriginalLanguage(
        extra.results,
        originalLanguage,
      )) {
        if (!seen.has(movie.id)) {
          seen.add(movie.id);
          filtered.push(movie);
        }
      }
    }
  }

  return {
    ...firstPage,
    results: filtered,
    total_results: filtered.length,
  };
}

export async function getMovieDetails(id, lang = "en") {
  const { originalLanguage, tmdbLocale } = resolveLanguageConfig(lang);
  const data = await tmdbRequest(
    `/movie/${encodeURIComponent(id)}`,
    {
      append_to_response: "credits,videos",
      language: tmdbLocale,
      include_video_language: `${originalLanguage},en,null`,
    },
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
      if (a.official !== b.official) {
        return Number(b.official) - Number(a.official);
      }

      const aMatchesSelected = a.iso_639_1 === originalLanguage;
      const bMatchesSelected = b.iso_639_1 === originalLanguage;
      if (aMatchesSelected !== bMatchesSelected) {
        return Number(bMatchesSelected) - Number(aMatchesSelected);
      }

      const aEnglish = a.iso_639_1 === "en";
      const bEnglish = b.iso_639_1 === "en";
      if (aEnglish !== bEnglish) {
        return Number(bEnglish) - Number(aEnglish);
      }

      const dateA = Date.parse(a.published_at || "") || 0;
      const dateB = Date.parse(b.published_at || "") || 0;
      return dateB - dateA;
    });

  const trailer = youtubeVideos[0] || null;

  return {
    id: data.id,
    title: data.title,
    original_title: data.original_title,
    original_language: data.original_language || originalLanguage,
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
    trailerKey: trailer?.key || null,
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

export async function getMovieRecommendations(id, page = 1, lang = "en") {
  const { originalLanguage, tmdbLocale } = resolveLanguageConfig(lang);
  const data = await tmdbRequest(
    `/movie/${encodeURIComponent(id)}/recommendations`,
    { page, language: tmdbLocale },
    TTL.DETAIL,
  );

  const filtered = filterByOriginalLanguage(data.results, originalLanguage);
  if (filtered.length > 0 || page > 1) {
    return {
      ...data,
      results: filtered,
    };
  }

  // Fallback to same-language genre discovery when TMDB recommendations are in other languages.
  const details = await getMovieDetails(id, lang).catch(() => null);
  const genreIds = (details?.genres || []).map((g) => g.id).slice(0, 2).join(",");
  const fallback = await discoverMovies({
    genres: genreIds || undefined,
    sortBy: "popularity.desc",
    minVotes: 15,
    page: 1,
    lang,
  });

  return {
    ...fallback,
    results: fallback.results.filter((m) => m.id !== Number(id)),
  };
}
