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
  const { timeWindow, page, lang } = req.validated.query;
  const data = await getTrendingMovies(timeWindow, page, lang);
  return sendSuccess(res, data);
}

export async function listPopular(req, res) {
  const { page, lang } = req.validated.query;
  const data = await getPopularMovies(page, lang);
  return sendSuccess(res, data);
}

export async function listTopRated(req, res) {
  const { page, lang } = req.validated.query;
  const data = await getTopRatedMovies(page, lang);
  return sendSuccess(res, data);
}

export async function listNowPlaying(req, res) {
  const { page, lang } = req.validated.query;
  const data = await getNowPlayingMovies(page, lang);
  return sendSuccess(res, data);
}

export async function listGenres(req, res) {
  const { lang } = req.validated.query;
  const data = await getGenres(lang);
  return sendSuccess(res, data);
}

export async function listDiscovered(req, res) {
  const { genres, sortBy, minVotes, page, lang } = req.validated.query;
  const data = await discoverMovies({ genres, sortBy, minVotes, page, lang });
  return sendSuccess(res, data);
}

export async function searchCatalog(req, res) {
  const { q, page, lang } = req.validated.query;
  const data = await searchMovies(q, page, lang);
  return sendSuccess(res, data);
}

export async function getDetails(req, res) {
  const { id } = req.validated.params;
  const { lang } = req.validated.query;
  const data = await getMovieDetails(id, lang);
  return sendSuccess(res, data);
}

export async function listRecommendations(req, res) {
  const { id } = req.validated.params;
  const { page, lang } = req.validated.query;
  const data = await getMovieRecommendations(id, page, lang);
  return sendSuccess(res, data);
}
