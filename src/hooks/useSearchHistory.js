import { useCallback, useEffect, useState } from "react";
import {
  clearServerSearchHistory,
  fetchServerSearchHistory,
  recordServerSearchHistory,
} from "../services/authApi.js";

const LOCAL_HISTORY_KEY = "cineverse-search-history";
const MAX_ITEMS = 8;

function readLocalHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((q) => typeof q === "string" && q.trim()).slice(0, MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

function writeLocalHistory(items) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors.
  }
}

export function useSearchHistory(user) {
  const [localHistory, setLocalHistory] = useState(() => readLocalHistory());
  const [serverHistory, setServerHistory] = useState([]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const controller = new AbortController();
    fetchServerSearchHistory(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setServerHistory(items.map((item) => item.query).slice(0, MAX_ITEMS));
        }
      })
      .catch(() => {
        // Fallback silently if search history API is unavailable.
      });

    return () => controller.abort();
  }, [user?.id]);

  const history = user?.id ? serverHistory : localHistory;

  const recordSearch = useCallback(
    (rawQuery) => {
      const cleaned = String(rawQuery || "").trim();
      if (cleaned.length < 2) return;

      const updater = (prev) =>
        [
          cleaned,
          ...prev.filter((item) => item.toLowerCase() !== cleaned.toLowerCase()),
        ].slice(0, MAX_ITEMS);

      if (user?.id) {
        setServerHistory(updater);
        recordServerSearchHistory(cleaned).catch(() => {});
      } else {
        setLocalHistory((prev) => {
          const next = updater(prev);
          writeLocalHistory(next);
          return next;
        });
      }
    },
    [user?.id],
  );

  const clearHistory = useCallback(() => {
    if (user?.id) {
      setServerHistory([]);
      clearServerSearchHistory().catch(() => {});
    } else {
      setLocalHistory([]);
      writeLocalHistory([]);
    }
  }, [user?.id]);

  return { history, recordSearch, clearHistory };
}
