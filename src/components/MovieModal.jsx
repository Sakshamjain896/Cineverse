
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark,
  CalendarDays,
  Check,
  Clock3,
  Film,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import {
  getMovieDetails,
  getMovieRecommendations,
} from "../services/movieApi.js";
import TrailerPlayer from "./TrailerPlayer.jsx";

function getFocusableElements(container) {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function MovieModalDialog({
  movie,
  onClose,
  onSelectMovie,
  isSaved,
  isAuthenticated,
  onToggleSave,
  language = "en",
  t,
}) {
  const [details, setDetails] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [showHeroTrailer, setShowHeroTrailer] = useState(false);

  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const translate = (key, fallback) => {
    return typeof t === "function" ? t(key) : fallback;
  };

  const activeMovie =
    details && details.tmdbId === movie.tmdbId
      ? { ...movie, ...details }
      : movie;

  const trailerSource =
    activeMovie.trailer ||
    (activeMovie.trailerKey
      ? {
          key: activeMovie.trailerKey,
          site: "YouTube",
          type: "Trailer",
          official: false,
          name: "Movie Trailer",
        }
      : null);

  // Fetch movie details and recommendations.
  useEffect(() => {
    const controller = new AbortController();

    Promise.allSettled([
      getMovieDetails(movie.tmdbId, controller.signal, language),
      getMovieRecommendations(movie.tmdbId, 1, controller.signal, language),
    ])
      .then(([detailRes, recRes]) => {
        if (controller.signal.aborted) return;

        if (detailRes.status === "fulfilled") {
          setDetails(detailRes.value);
          setDetailError("");
        } else {
          setDetails(null);
          setDetailError(
            detailRes.reason?.message ||
              "Could not load full movie details.",
          );
        }

        if (recRes.status === "fulfilled") {
          setRecommendations(
            (recRes.value?.results || []).slice(0, 6),
          );
        } else {
          setRecommendations([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [movie.tmdbId, reloadTick, language]);

  // Start the hero trailer exactly five seconds after opening the modal.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowHeroTrailer(true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [movie.tmdbId]);

  // Focus management, Escape close, and Tab trapping.
  useEffect(() => {
    lastFocusedRef.current = document.activeElement;

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 20);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusables = getFocusableElements(dialogRef.current);

        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);

      if (
        lastFocusedRef.current &&
        typeof lastFocusedRef.current.focus === "function"
      ) {
        lastFocusedRef.current.focus();
      }
    };
  }, [onClose]);

  const heroImage = !backdropFailed
    ? activeMovie.backdrop || activeMovie.poster || ""
    : activeMovie.poster || "";

  const shouldShowTrailer = showHeroTrailer && Boolean(trailerSource);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md sm:p-8"
      role="presentation"
    >
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.985 }}
        transition={{ duration: 0.25 }}
        role="dialog"
        aria-modal="true"
        aria-label={`${activeMovie.title} details`}
        className="cv-theme-panel cv-panel-surface relative my-auto w-full max-w-4xl overflow-hidden rounded-[24px] border bg-[#111214] shadow-2xl"
      >
        {/* HERO */}
        <div className="relative isolate h-[240px] overflow-hidden bg-[#141518] sm:h-[330px]">
          {heroImage ? (
            <>
              <img
                src={heroImage}
                alt=""
                aria-hidden="true"
                onError={() => setBackdropFailed(true)}
                className="absolute inset-0 z-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
              />

              <img
                src={heroImage}
                alt=""
                onError={() => setBackdropFailed(true)}
                className="absolute inset-0 z-[1] h-full w-full object-contain object-center"
              />
            </>
          ) : (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-gradient-to-br from-[#2a2520] via-[#151517] to-[#0e0f11]">
              <Film size={44} className="text-[#d9b77b]/50" />
            </div>
          )}

          {/* TRAILER OVERLAY */}
          <AnimatePresence>
            {shouldShowTrailer && (
              <motion.div
                key={`hero-trailer-${activeMovie.tmdbId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: "easeInOut" }}
                className="absolute inset-0 z-[2] overflow-hidden bg-black"
              >
                <TrailerPlayer
                  trailer={trailerSource}
                  title={`${activeMovie.title} trailer`}
                  autoplay={true}
                  muted={true}
                  controls={true}
                  className="h-full w-full rounded-none border-0"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* HERO GRADIENT */}
          <div className="absolute inset-0 z-[3] bg-gradient-to-t from-[#111214] via-black/30 to-black/15 pointer-events-none" />

          {/* CLOSE BUTTON */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={translate("close", "Close movie details")}
            className="absolute right-4 top-4 z-[5] grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur transition hover:bg-black/75"
          >
            <X size={18} />
          </button>

          {/* HERO TITLE */}
          <div className="absolute bottom-5 left-5 right-5 z-[4] sm:bottom-7 sm:left-8 sm:right-8 pointer-events-none">
            <p className="mb-2 text-[10px] uppercase tracking-[.25em] text-[#f0d6a3]">
              {translate("cineverseSelection", "Cineverse selection")}
            </p>

            <h2 className="font-display text-3xl text-white sm:text-5xl">
              {activeMovie.title}
            </h2>

            {activeMovie.tagline && (
              <p className="mt-1.5 text-xs italic text-white/75 sm:text-sm">
                “{activeMovie.tagline}”
              </p>
            )}
          </div>
        </div>

        {/* MOVIE DETAILS */}
        <div className="grid gap-7 p-5 sm:grid-cols-[1fr_240px] sm:p-8">
          <div>
            {/* METADATA */}
            <div className="cv-quiet-text mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#d9b77b]">
                <Star size={13} className="fill-current" />
                {activeMovie.rating} / 10
              </span>

              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} />
                {activeMovie.year}
              </span>

              <span className="flex items-center gap-1.5">
                <Clock3 size={13} />
                {loading && activeMovie.runtime === "Not listed"
                  ? translate("loading", "Loading...")
                  : activeMovie.runtime}
              </span>
            </div>

            {/* OVERVIEW */}
            <p className="max-w-2xl text-sm leading-7 opacity-90">
              {activeMovie.synopsis}
            </p>

            {/* TRAILER STATUS */}
            {!trailerSource && (
              <p className="cv-quiet-text mt-5 text-xs">
                {translate(
                  "noTrailer",
                  "No trailer available for this movie.",
                )}
              </p>
            )}

            {/* ERROR AND RETRY */}
            {detailError && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-2.5 text-xs text-amber-300">
                <span>{detailError}</span>

                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setDetailError("");
                    setReloadTick((value) => value + 1);
                  }}
                  className="flex items-center gap-1 font-semibold underline"
                >
                  <RefreshCw size={12} />
                  {translate("retry", "Retry")}
                </button>
              </div>
            )}

            {/* GENRES */}
            <div className="mt-5 flex flex-wrap gap-2">
              {(activeMovie.genres || []).map((genre) => (
                <span
                  key={genre}
                  className="cv-pill rounded-full border px-3 py-1.5 text-[11px]"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* CAST */}
            {activeMovie.cast?.length > 0 && (
              <div className="mt-6">
                <p className="cv-quiet-text mb-2.5 text-[10px] font-semibold uppercase tracking-[.22em]">
                  {translate("cast", "Cast")}
                </p>

                <div className="flex flex-wrap gap-2">
                  {activeMovie.cast.map((member) => (
                    <span
                      key={member.id || member.name}
                      className="cv-pill rounded-lg border px-2.5 py-1 text-[11px]"
                    >
                      {member.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="cv-panel-surface cv-hairline rounded-2xl border p-5">
            <p className="cv-quiet-text text-[10px] uppercase tracking-[.2em]">
              {translate("directedBy", "Directed by")}
            </p>

            <p className="mt-2 text-sm font-semibold">
              {loading && activeMovie.director === "Not listed"
                ? translate("loading", "Loading...")
                : activeMovie.director || "Not listed"}
            </p>

            <div className="cv-hairline my-5 border-t" />

            <button
              type="button"
              onClick={() => onToggleSave(activeMovie)}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${
                isSaved
                  ? "border-[#d9b77b]/50 bg-[#d9b77b] text-[#17130d]"
                  : "cv-hairline hover:border-[#d9b77b]/55 hover:text-[#d9b77b]"
              }`}
            >
              {isSaved ? (
                <>
                  <Check size={14} />
                  {translate("inYourWatchlist", "In your watchlist")}
                </>
              ) : (
                <>
                  <Bookmark size={14} />
                  {translate("addToWatchlist", "Add to watchlist")}
                </>
              )}
            </button>

            <p className="cv-quiet-text mt-3 text-[10px] leading-5">
              {isAuthenticated
                ? translate("syncedAccount", "Synced directly to your Cineverse account.")
                : translate("savedLocal", "Saved in this browser. Sign in anytime to sync across devices.")}
            </p>
          </aside>
        </div>

        {/* RECOMMENDATIONS */}
        {(loading || recommendations.length > 0) && (
          <div className="cv-hairline border-t px-5 pb-6 pt-5 sm:px-8 sm:pb-8">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.24em] text-[#d9b77b]">
              {translate("recommendedNext", "Recommended next")}
            </p>

            {loading && recommendations.length === 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="aspect-[2/3] animate-pulse rounded-xl bg-white/10"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {recommendations.map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => onSelectMovie(rec)}
                    className="group text-left"
                  >
                    <div className="cv-hairline aspect-[2/3] overflow-hidden rounded-xl border bg-[#171719]">
                      {rec.poster ? (
                        <img
                          src={rec.poster}
                          alt={`${rec.title} poster`}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-2 text-center">
                          <Film size={18} className="text-[#d9b77b]/60" />
                        </div>
                      )}
                    </div>

                    <p className="mt-1.5 truncate text-[11px] font-medium group-hover:text-[#d9b77b]">
                      {rec.title}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function MovieModal({ movie, language = "en", ...props }) {
  return (
    <AnimatePresence>
      {movie && (
        <MovieModalDialog
          key={`${movie.tmdbId}-${language}`}
          movie={movie}
          language={language}
          {...props}
        />
      )}
    </AnimatePresence>
  );
}
