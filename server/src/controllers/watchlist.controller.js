import {
  addWatchlistItem,
  listUserWatchlist,
  mergeUserWatchlist,
  removeWatchlistItem,
} from "../services/watchlist.service.js";
import { sendSuccess } from "../utils/AppError.js";

export async function listWatchlist(req, res) {
  const { page, limit } = req.validated.query;
  const data = await listUserWatchlist(req.user.id, { page, limit });
  return sendSuccess(res, data);
}

export async function addToWatchlist(req, res) {
  const { item, created } = await addWatchlistItem(
    req.user.id,
    req.validated.body,
  );
  return sendSuccess(res, { item, alreadySaved: !created }, created ? 201 : 200);
}

export async function mergeWatchlist(req, res) {
  const { items } = req.validated.body;
  const data = await mergeUserWatchlist(req.user.id, items);
  return sendSuccess(res, data);
}

export async function removeFromWatchlist(req, res) {
  const { tmdbId } = req.validated.params;
  const data = await removeWatchlistItem(req.user.id, tmdbId);
  return sendSuccess(res, data);
}
