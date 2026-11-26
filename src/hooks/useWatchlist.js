import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeMovie, toWatchlistPayload } from "../services/movieApi.js";
import {
  addServerWatchlistItem,
  fetchServerWatchlist,
  mergeServerWatchlist,
  removeServerWatchlistItem,
} from "../services/watchlistApi.js";

const GUEST_STORAGE_KEY = "cineverse-guest-watchlist-v2";
const LEGACY_SAVED_KEY = "cineverse-saved";

function readGuestWatchlist() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (item) =>
              item &&
              Number.isInteger(Number(item.tmdbId)) &&
              Number(item.tmdbId) > 0,
          )
          .map(normalizeMovie);
      }
    }
    window.localStorage.removeItem(LEGACY_SAVED_KEY);
    return [];
  } catch {
    return [];
  }
}

function writeGuestWatchlist(items) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      GUEST_STORAGE_KEY,
      JSON.stringify(items.map(toWatchlistPayload)),
    );
  } catch {
    // Ignore storage quota / privacy mode errors.
  }
}

function clearGuestWatchlist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_SAVED_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function useWatchlist(user, onNotify) {
  const [guestMovies, setGuestMovies] = useState(() => readGuestWatchlist());
  const [serverState, setServerState] = useState({
    userId: null,
    items: [],
    error: "",
  });

  useEffect(() => {
    const userId = user?.id || null;
    if (!userId) return undefined;

    const controller = new AbortController();
    const guestItems = readGuestWatchlist();

    const syncPromise =
      guestItems.length > 0
        ? mergeServerWatchlist(guestItems.map(toWatchlistPayload)).then(
            (items) => {
              clearGuestWatchlist();
              setGuestMovies([]);
              onNotify?.(
                "success",
                `Synced ${guestItems.length} saved film${guestItems.length === 1 ? "" : "s"} to your account.`,
              );
              return items;
            },
          )
        : fetchServerWatchlist(
            { page: 1, limit: 50 },
            controller.signal,
          ).then((data) => data.items);

    syncPromise
      .then((items) => {
        if (!controller.signal.aborted) {
          setServerState({ userId, items, error: "" });
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const message = error?.message || "Unable to load your watchlist.";
        setServerState({
          userId,
          items: guestItems,
          error: message,
        });
        onNotify?.("error", message);
      });

    return () => controller.abort();
  }, [user?.id, onNotify]);

  // Persist guest watchlist changes locally.
  useEffect(() => {
    if (!user?.id) {
      writeGuestWatchlist(guestMovies);
    }
  }, [user?.id, guestMovies]);

  const watchlistLoading = Boolean(user?.id) && serverState.userId !== user.id;
  const watchlistError = user?.id ? serverState.error : "";
  const watchlistMovies = useMemo(
    () => (user?.id ? serverState.items : guestMovies),
    [user?.id, serverState.items, guestMovies],
  );

  const savedIdSet = useMemo(
    () => new Set(watchlistMovies.map((item) => item.id)),
    [watchlistMovies],
  );

  const isMovieSaved = useCallback(
    (movieOrId) => {
      if (!movieOrId) return false;
      const key =
        typeof movieOrId === "object"
          ? movieOrId.id || `tmdb-${movieOrId.tmdbId}`
          : typeof movieOrId === "number"
            ? `tmdb-${movieOrId}`
            : String(movieOrId);
      return savedIdSet.has(key);
    },
    [savedIdSet],
  );

  const toggleSaveMovie = useCallback(
    async (movieOrId) => {
      const movieObj =
        typeof movieOrId === "object"
          ? normalizeMovie(movieOrId)
          : watchlistMovies.find((item) => item.id === movieOrId) || null;

      if (
        !movieObj ||
        !Number.isInteger(movieObj.tmdbId) ||
        movieObj.tmdbId <= 0
      ) {
        return;
      }

      const currentlySaved = savedIdSet.has(movieObj.id);
      const previousList = watchlistMovies;

      const optimisticList = currentlySaved
        ? watchlistMovies.filter((item) => item.id !== movieObj.id)
        : [
            movieObj,
            ...watchlistMovies.filter((item) => item.id !== movieObj.id),
          ];

      if (!user?.id) {
        setGuestMovies(optimisticList);
        onNotify?.(
          "info",
          currentlySaved
            ? `Removed "${movieObj.title}" from your local watchlist.`
            : `Saved "${movieObj.title}" to your local watchlist.`,
        );
        return;
      }

      setServerState((prev) => ({ ...prev, items: optimisticList }));

      try {
        if (currentlySaved) {
          await removeServerWatchlistItem(movieObj.tmdbId);
          onNotify?.(
            "info",
            `Removed "${movieObj.title}" from your watchlist.`,
          );
        } else {
          const { item } = await addServerWatchlistItem(
            toWatchlistPayload(movieObj),
          );
          setServerState((prev) => ({
            ...prev,
            items: [item, ...prev.items.filter((entry) => entry.id !== item.id)],
          }));
          onNotify?.("success", `Saved "${movieObj.title}" to your watchlist.`);
        }
      } catch (error) {
        setServerState((prev) => ({ ...prev, items: previousList }));
        onNotify?.(
          "error",
          error.message || "Could not update your watchlist. Please try again.",
        );
      }
    },
    [user?.id, watchlistMovies, savedIdSet, onNotify],
  );

  const savedIds = useMemo(
    () => watchlistMovies.map((item) => item.id),
    [watchlistMovies],
  );

  return {
    watchlistMovies,
    savedIds,
    watchlistLoading,
    watchlistError,
    isMovieSaved,
    toggleSaveMovie,
  };
}
