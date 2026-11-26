
import { apiRequest } from "./apiClient.js";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const SAFE_YOUTUBE_KEY_RE = /^[a-zA-Z0-9_-]{6,20}$/;

export const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const GENRE_NAME_ALIASES = {
  "Sci-Fi": "Science Fiction",
  "Science Fiction": "Sci-Fi",
};

export function normalizeGenreLabel(name = "") {
  return name === "Science Fiction" ? "Sci-Fi" : name;
}

export function resolveGenreId(label, genresList = []) {
  if (!label || label === "All") return null;

  const targetNames = [label, GENRE_NAME_ALIASES[label]].filter(Boolean);
  const found = genresList.find((g) => targetNames.includes(g.name));

  if (found) return found.id;

  const entry = Object.entries(GENRE_MAP).find(([, name]) =>
    targetNames.includes(name),
  );

  return entry ? Number(entry[0]) : null;
}

function buildPosterUrl(path, size = "w500") {
  if (!path) return "";
  if (path.startsWith("https://")) return path;

  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function buildPosterSrcSet(posterUrl = "") {
  const match = posterUrl.match(
    /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+(\/.+)$/,
  );

  if (!match) return undefined;

  const path = match[1];

  return `${TMDB_IMAGE_BASE}/w342${path} 342w, ${TMDB_IMAGE_BASE}/w500${path} 500w, ${TMDB_IMAGE_BASE}/w780${path} 780w`;
}

export function normalizeMovie(movie) {
  const numericId = Number(movie.tmdbId ?? movie.id);

  const posterPath = movie.poster_path ?? movie.posterPath ?? null;
  const backdropPath = movie.backdrop_path ?? movie.backdropPath ?? null;

  const poster = movie.poster || buildPosterUrl(posterPath, "w500");

  const backdrop =
    movie.backdrop || buildPosterUrl(backdropPath, "w1280") || poster;

  const rawGenres = Array.isArray(movie.genres)
    ? movie.genres
        .map((genre) =>
          typeof genre === "string"
            ? normalizeGenreLabel(genre)
            : normalizeGenreLabel(genre?.name || ""),
        )
        .filter(Boolean)
    : (movie.genre_ids || [])
        .map((id) => GENRE_MAP[id])
        .filter(Boolean);

  const rawRating =
    movie.vote_average ?? movie.voteAverage ?? movie.rating ?? 0;

  const numericRating = Number(rawRating);

  const formattedRating = Number.isFinite(numericRating)
    ? numericRating.toFixed(1)
    : "0.0";

  const releaseYear = movie.release_date
    ? movie.release_date.slice(0, 4)
    : movie.releaseYear || (movie.year ? String(movie.year) : "Unknown");

  const runtimeValue =
    typeof movie.runtime === "number" && movie.runtime > 0
      ? `${movie.runtime} min`
      : typeof movie.runtime === "string" && movie.runtime
        ? movie.runtime
        : "Not listed";

  // Validate the legacy trailer key.
  const trailerKey =
    typeof movie.trailerKey === "string" &&
    SAFE_YOUTUBE_KEY_RE.test(movie.trailerKey)
      ? movie.trailerKey
      : null;

  // Normalize trailer metadata returned by the backend.
  const trailer =
    movie.trailer &&
    movie.trailer.site === "YouTube" &&
    typeof movie.trailer.key === "string" &&
    SAFE_YOUTUBE_KEY_RE.test(movie.trailer.key)
      ? {
          key: movie.trailer.key,
          name: movie.trailer.name || "",
          site: "YouTube",
          type: movie.trailer.type || "Trailer",
          official: Boolean(movie.trailer.official),
          language: movie.trailer.language || "en",
          publishedAt: movie.trailer.publishedAt || null,
        }
      : trailerKey
        ? {
            key: trailerKey,
            name: "",
            site: "YouTube",
            type: "Trailer",
            official: false,
            language: "en",
            publishedAt: null,
          }
        : null;

  return {
    id: `tmdb-${numericId}`,
    tmdbId: numericId,
    title: movie.title || movie.original_title || "Untitled",
    tagline: movie.tagline || "",
    year: releaseYear,
    rating: formattedRating,
    runtime: runtimeValue,
    genres: rawGenres,
    director: movie.director || "Not listed",
    cast: Array.isArray(movie.cast) ? movie.cast : [],

    // Trailer data
    trailerKey,
    trailer,

    poster,
    backdrop,
    posterPath: posterPath || null,
    backdropPath: backdropPath || null,
    synopsis: movie.overview || movie.synopsis || "No synopsis available.",
    isOfflineFallback: Boolean(movie.isOfflineFallback),
  };
}

export function toWatchlistPayload(movie) {
  const tmdbId = Number(movie.tmdbId);
  const voteAvg = Number(movie.rating);

  return {
    tmdbId,
    title: movie.title,
    posterPath: movie.posterPath || null,
    backdropPath: movie.backdropPath || null,
    releaseYear: movie.year ? String(movie.year) : null,
    voteAverage: Number.isFinite(voteAvg) ? voteAvg : null,
    genres: Array.isArray(movie.genres) ? movie.genres.slice(0, 10) : [],
  };
}

function normalizePagedResponse(data) {
  return {
    results: (data.results || []).map(normalizeMovie),
    page: Number(data.page || 1),
    totalPages: Number(data.total_pages || 1),
    totalResults: Number(
      data.total_results || (data.results || []).length,
    ),
  };
}

export async function getTrendingMovies(
  { timeWindow = "day", page = 1 } = {},
  signal,
) {
  const data = await apiRequest(
    `/movies/trending?timeWindow=${encodeURIComponent(timeWindow)}&page=${page}`,
    { signal },
  );

  return normalizePagedResponse(data);
}

export async function getPopularMovies(page = 1, signal) {
  const data = await apiRequest(`/movies/popular?page=${page}`, { signal });

  return normalizePagedResponse(data);
}

export async function getTopRatedMovies(page = 1, signal) {
  const data = await apiRequest(`/movies/top-rated?page=${page}`, { signal });

  return normalizePagedResponse(data);
}

export async function getNowPlayingMovies(page = 1, signal) {
  const data = await apiRequest(`/movies/now-playing?page=${page}`, { signal });

  return normalizePagedResponse(data);
}

export async function getGenres(signal) {
  const data = await apiRequest("/movies/genres", { signal });

  return (data.genres || []).map((genre) => ({
    id: genre.id,
    name: normalizeGenreLabel(genre.name),
  }));
}

export async function discoverMovies(
  { genres, sortBy = "popularity.desc", page = 1, minVotes = 100 } = {},
  signal,
) {
  const params = new URLSearchParams();

  if (genres) params.set("genres", String(genres));
  if (sortBy) params.set("sortBy", sortBy);

  params.set("minVotes", String(minVotes));
  params.set("page", String(page));

  const data = await apiRequest(`/movies/discover?${params.toString()}`, {
    signal,
  });

  return normalizePagedResponse(data);
}

export async function searchMovies(query, page = 1, signal) {
  const data = await apiRequest(
    `/movies/search?q=${encodeURIComponent(query)}&page=${page}`,
    { signal },
  );

  return normalizePagedResponse(data);
}

export async function getMovieDetails(tmdbId, signal) {
  const data = await apiRequest(`/movies/${tmdbId}`, { signal });

  return normalizeMovie(data);
}

export async function getMovieRecommendations(tmdbId, page = 1, signal) {
  const data = await apiRequest(
    `/movies/${tmdbId}/recommendations?page=${page}`,
    { signal },
  );

  return normalizePagedResponse(data);
}
