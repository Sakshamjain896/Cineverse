
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function tmdbRequest(endpoint, params = {}) {
  const token = process.env.TMDB_ACCESS_TOKEN;

  if (!token) {
    throw new Error("TMDB_ACCESS_TOKEN is not configured.");
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = new Error(`TMDB request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export const getTrendingMovies = () =>
  tmdbRequest("/trending/movie/day");

export const getPopularMovies = (page = 1) =>
  tmdbRequest("/movie/popular", { page });

export const getTopRatedMovies = (page = 1) =>
  tmdbRequest("/movie/top_rated", { page });

export const getNowPlayingMovies = (page = 1) =>
  tmdbRequest("/movie/now_playing", { page });

export const searchMovies = (query, page = 1) =>
  tmdbRequest("/search/movie", {
    query,
    page,
    include_adult: false,
  });

export const getMovieDetails = (id) =>
  tmdbRequest(`/movie/${encodeURIComponent(id)}`);

export const getMovieRecommendations = (id, page = 1) =>
  tmdbRequest(`/movie/${encodeURIComponent(id)}/recommendations`, { page });
