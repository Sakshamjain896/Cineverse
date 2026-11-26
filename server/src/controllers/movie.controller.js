import {
  discoverMovies,
  getGenres,
  getMovieDetails,
  getMovieRecommendations,
  getNowPlayingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getTrendingMovies,
  searchMovies,
} from "../services/tmdb.service.js";
import { sendSuccess } from "../utils/AppError.js";

export async function listTrending(req, res) {
  const { timeWindow, page } = req.validated.query;
  const data = await getTrendingMovies(timeWindow, page);
  return sendSuccess(res, data);
}

export async function listPopular(req, res) {
  const { page } = req.validated.query;
  const data = await getPopularMovies(page);
  return sendSuccess(res, data);
}

export async function listTopRated(req, res) {
  const { page } = req.validated.query;
  const data = await getTopRatedMovies(page);
  return sendSuccess(res, data);
}

export async function listNowPlaying(req, res) {
  const { page } = req.validated.query;
  const data = await getNowPlayingMovies(page);
  return sendSuccess(res, data);
}

export async function listGenres(_req, res) {
  const data = await getGenres();
  return sendSuccess(res, data);
}

export async function listDiscovered(req, res) {
  const { genres, sortBy, minVotes, page } = req.validated.query;
  const data = await discoverMovies({ genres, sortBy, minVotes, page });
  return sendSuccess(res, data);
}

export async function searchCatalog(req, res) {
  const { q, page } = req.validated.query;
  const data = await searchMovies(q, page);
  return sendSuccess(res, data);
}

export async function getDetails(req, res) {
  const { id } = req.validated.params;
  const data = await getMovieDetails(id);
  return sendSuccess(res, data);
}

export async function listRecommendations(req, res) {
  const { id } = req.validated.params;
  const { page } = req.validated.query;
  const data = await getMovieRecommendations(id, page);
  return sendSuccess(res, data);
}
