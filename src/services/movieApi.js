
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const GENRE_MAP = {
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

async function request(endpoint, signal) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Cineverse API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Unable to load movies.");
  }

  return data;
}

export function normalizeMovie(movie) {
  const poster = movie.poster_path
    ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}`
    : "";

  const backdrop = movie.backdrop_path
    ? `${TMDB_IMAGE_BASE}/w1280${movie.backdrop_path}`
    : poster;

  return {
    id: `tmdb-${movie.id}`,
    tmdbId: movie.id,
    title: movie.title || movie.original_title || "Untitled",
    year: movie.release_date
      ? movie.release_date.slice(0, 4)
      : "Unknown",
    rating: Number(movie.vote_average || 0).toFixed(1),
    runtime: movie.runtime
      ? `${movie.runtime} min`
      : "Not listed",
    genres: movie.genres
      ? movie.genres.map((genre) => genre.name)
      : (movie.genre_ids || [])
          .map((id) => GENRE_MAP[id])
          .filter(Boolean),
    director: movie.director || "Not listed",
    poster,
    backdrop,
    synopsis: movie.overview || "No synopsis available.",
    moods: [],
    featured: false,
    label: "",
  };
}

export async function getTrendingMovies(signal) {
  const data = await request("/movies/trending", signal);
  return (data.results || []).map(normalizeMovie);
}

export async function getPopularMovies(signal) {
  const data = await request("/movies/popular", signal);
  return (data.results || []).map(normalizeMovie);
}

export async function searchMovies(query, signal) {
  const data = await request(
    `/movies/search?q=${encodeURIComponent(query)}`,
    signal,
  );

  return (data.results || []).map(normalizeMovie);
}

export async function getMovieDetails(tmdbId, signal) {
  const data = await request(`/movies/${tmdbId}`, signal);
  return normalizeMovie(data);
}
