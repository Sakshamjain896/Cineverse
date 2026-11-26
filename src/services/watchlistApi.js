import { apiRequest } from "./apiClient.js";
import { normalizeMovie } from "./movieApi.js";

export async function fetchServerWatchlist(
  { page = 1, limit = 50 } = {},
  signal,
) {
  const data = await apiRequest(`/watchlist?page=${page}&limit=${limit}`, {
    signal,
  });
  return {
    items: (data.items || []).map(normalizeMovie),
    page: data.page || 1,
    total: data.total || 0,
    totalPages: data.totalPages || 1,
  };
}

export async function addServerWatchlistItem(moviePayload) {
  const data = await apiRequest("/watchlist", {
    method: "POST",
    body: moviePayload,
  });
  return {
    item: normalizeMovie(data.item),
    alreadySaved: Boolean(data.alreadySaved),
  };
}

export async function mergeServerWatchlist(items) {
  const data = await apiRequest("/watchlist/merge", {
    method: "POST",
    body: { items },
  });
  return (data.items || []).map(normalizeMovie);
}

export async function removeServerWatchlistItem(tmdbId) {
  return apiRequest(`/watchlist/${tmdbId}`, {
    method: "DELETE",
  });
}
