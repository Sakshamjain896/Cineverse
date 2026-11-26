import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useScroll,
  useTransform,
} from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Bookmark,
  Check,
  CircleUserRound,
  Compass,
  Film,
  Heart,
  History,
  Menu,
  Mic,
  MicOff,
  Moon,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import { Logo } from "./components/Logo.jsx";
import { OFFLINE_FALLBACK_MOVIES } from "./data/fallbackMovies.js";
import { useDebounce } from "./hooks/useDebounce.js";
import { useSearchHistory } from "./hooks/useSearchHistory.js";
import { useWatchlist } from "./hooks/useWatchlist.js";
import {
  deleteUserAccount,
  getSessionUser,
  loginUserAccount,
  logoutUserAccount,
  registerUserAccount,
  updateUserProfile,
} from "./services/authApi.js";
import {
  buildPosterSrcSet,
  discoverMovies,
  getGenres,
  getMovieDetails,
  getNowPlayingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getTrendingMovies,
  resolveGenreId,
  searchMovies,
} from "./services/movieApi.js";
import TrailerPlayer from "./components/TrailerPlayer.jsx";

const AuthPage = lazy(() => import("./components/AuthPage.jsx"));
const ProfilePage = lazy(() => import("./components/ProfilePage.jsx"));
const MovieModal = lazy(() => import("./components/MovieModal.jsx"));

/* --------------------------------------------------
   STORAGE & CATALOG CONSTANTS
-------------------------------------------------- */

const THEME_STORAGE_KEY = "cineverse-theme";

const DEFAULT_GENRE_PILLS = [
  "All",
  "Sci-Fi",
  "Drama",
  "Thriller",
  "Action",
  "Adventure",
  "Mystery",
  "Crime",
  "Animation",
  "Comedy",
];

const MOODS = [
  {
    name: "Mind-bending",
    description: "Stories that stay with you",
    genreIds: "878,9648",
    sortBy: "vote_average.desc",
  },
  {
    name: "Feel something",
    description: "A little closer to the heart",
    genreIds: "18,10749",
    sortBy: "vote_average.desc",
  },
  {
    name: "Dark & intense",
    description: "Enter the shadows",
    genreIds: "53,80",
    sortBy: "popularity.desc",
  },
  {
    name: "Big-screen spectacle",
    description: "Go wonderfully oversized",
    genreIds: "28,12",
    sortBy: "revenue.desc",
  },
  {
    name: "Easy watch",
    description: "Let the day slow down",
    genreIds: "35,16",
    sortBy: "popularity.desc",
  },
];

/* --------------------------------------------------
   VOICE SEARCH HELPERS
-------------------------------------------------- */

function normalizeMovieTitle(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cleanVoiceQuery(transcript = "") {
  return transcript
    .trim()
    .replace(/[.,!?]+$/g, "")
    .replace(/^(hey\s+)?cineverse[, ]*/i, "")
    .replace(
      /^(please\s+)?(can you\s+)?(search(?: for)?|find(?: me)?|show me|look for|play|open)\s+/i,
      "",
    )
    .replace(/^(the\s+)?(movie|film)\s+/i, "")
    .replace(/\s+(movie|film)$/i, "")
    .trim();
}

function pickBestVoiceMatch(query = "", results = []) {
  if (!results.length) return null;
  const normalizedQuery = normalizeMovieTitle(query);
  if (!normalizedQuery) return results[0];

  const exactMatch = results.find(
    (movie) => normalizeMovieTitle(movie.title) === normalizedQuery,
  );
  if (exactMatch) return exactMatch;

  const startsWithMatch = results.find((movie) =>
    normalizeMovieTitle(movie.title).startsWith(normalizedQuery),
  );
  if (startsWithMatch) return startsWithMatch;

  const containsMatch = results.find((movie) =>
    normalizeMovieTitle(movie.title).includes(normalizedQuery),
  );
  if (containsMatch) return containsMatch;

  const queryWords = normalizedQuery.split(" ").filter(Boolean);
  if (queryWords.length > 1) {
    const wordsMatch = results.find((movie) => {
      const normalizedTitle = normalizeMovieTitle(movie.title);
      return queryWords.every((word) => normalizedTitle.includes(word));
    });
    if (wordsMatch) return wordsMatch;
  }

  return results[0];
}

function renderHeroTitle(title = "") {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return <span className="italic text-[#d9b77b]">{title}</span>;
  }
  const lastWord = words.pop();
  return (
    <>
      {words.join(" ")} <span className="italic text-[#d9b77b]">{lastWord}</span>
    </>
  );
}

function deduplicateMovies(list = []) {
  const seen = new Set();
  return list.filter((movie) => {
    if (!movie || seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

/* --------------------------------------------------
   VOICE SEARCH CONTROLS & TOASTS
-------------------------------------------------- */

function VoiceSearchButton({ status, onClick, compact = false }) {
  const isListening = status === "listening";
  const isSearching = status === "searching";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSearching}
      title={
        isListening
          ? "Stop voice search"
          : "Search for a movie by speaking"
      }
      aria-label={isListening ? "Stop voice search" : "Start voice search"}
      className={`relative grid shrink-0 place-items-center rounded-full transition-all duration-200 ${
        compact ? "h-8 w-8" : "h-9 w-9"
      } ${
        isListening
          ? "cv-mic-listening bg-[#d9b77b] text-[#17130d]"
          : isSearching
            ? "cursor-wait bg-[#d9b77b]/15 text-[#d9b77b]"
            : "text-[#d9b77b] hover:bg-[#d9b77b]/15"
      }`}
    >
      {isListening ? (
        <MicOff size={compact ? 15 : 17} />
      ) : isSearching ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        >
          <Search size={compact ? 15 : 17} />
        </motion.span>
      ) : (
        <Mic size={compact ? 15 : 17} />
      )}
    </button>
  );
}

function VoiceStatusToast({ status, message, onDismiss }) {
  if (!status || status === "idle") return null;

  const isListening = status === "listening";
  const isSearching = status === "searching";
  const isFound = status === "found";
  const isNotFound = status === "not-found";
  const isError = status === "error" || status === "unsupported";

  const icon = isListening ? (
    <Mic size={17} />
  ) : isSearching ? (
    <Search size={17} />
  ) : isFound ? (
    <Check size={17} />
  ) : isNotFound || isError ? (
    <Volume2 size={17} />
  ) : (
    <Mic size={17} />
  );

  return (
    <AnimatePresence>
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.22 }}
        role="status"
        aria-live="polite"
        className="fixed bottom-5 right-4 z-[90] flex w-[calc(100%-2rem)] max-w-[380px] items-start gap-3 rounded-2xl border border-[#d9b77b]/25 bg-[#111214]/95 p-4 text-white shadow-2xl backdrop-blur-2xl sm:bottom-6 sm:right-6"
      >
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            isFound
              ? "bg-emerald-400/15 text-emerald-300"
              : isNotFound || isError
                ? "bg-red-400/10 text-red-300"
                : "bg-[#d9b77b]/15 text-[#d9b77b]"
          }`}
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#d9b77b]">
            {isListening
              ? "Voice search"
              : isSearching
                ? "Searching"
                : isFound
                  ? "Movie found"
                  : isNotFound
                    ? "Not found"
                    : "Voice search"}
          </p>

          <p className="mt-1 text-sm leading-5 text-white/90">{message}</p>

          {isListening && (
            <p className="mt-2 text-[11px] text-white/50">
              Speak clearly, for example: “Find Interstellar”.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss voice search message"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

function ActionToast({ toast, onDismiss }) {
  if (!toast) return null;

  const isError = toast.type === "error";
  return (
    <AnimatePresence>
      <motion.div
        key={toast.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
        className="fixed bottom-5 left-4 z-[85] flex max-w-[360px] items-center gap-3 rounded-2xl border border-[#d9b77b]/25 bg-[#111214]/95 px-4 py-3 text-xs text-white shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-6"
      >
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
            isError
              ? "bg-red-500/15 text-red-300"
              : "bg-[#d9b77b]/15 text-[#d9b77b]"
          }`}
        >
          {isError ? <AlertCircle size={14} /> : <Check size={14} />}
        </span>

        <span className="min-w-0 flex-1 leading-5">{toast.message}</span>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
        >
          <X size={12} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

/* --------------------------------------------------
   SEARCH INPUT WITH SUGGESTIONS & HISTORY
-------------------------------------------------- */

function SearchBox({
  value,
  onChange,
  onFocus,
  onSelectSuggestion,
  history,
  suggestions,
  onClearHistory,
  onVoiceSearch,
  voiceStatus,
  placeholder,
  ariaLabel,
  className = "",
  autoFocus = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  const items = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      return history.map((term) => ({
        kind: "history",
        key: `hist-${term}`,
        label: term,
        sublabel: "Recent search",
      }));
    }
    return suggestions.slice(0, 5).map((movie) => ({
      kind: "movie",
      key: `sug-${movie.id}`,
      label: movie.title,
      sublabel: `${movie.year} · ★ ${movie.rating}`,
      movie,
    }));
  }, [value, history, suggestions]);

  useEffect(() => {
    function handleOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const safeActiveIndex =
    activeIndex >= 0 && activeIndex < items.length ? activeIndex : -1;

  function handleKeyDown(event) {
    if (!open || !items.length) {
      if (event.key === "Escape") setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((idx) => (idx + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((idx) => (idx <= 0 ? items.length - 1 : idx - 1));
    } else if (event.key === "Enter" && safeActiveIndex >= 0) {
      event.preventDefault();
      const chosen = items[safeActiveIndex];
      if (chosen) {
        onSelectSuggestion(chosen);
        setActiveIndex(-1);
        setOpen(false);
      }
    } else if (event.key === "Escape") {
      setActiveIndex(-1);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="cv-input flex h-12 w-full items-center gap-2 rounded-full px-3">
        <Search size={17} className="cv-quiet-text ml-1 shrink-0" />

        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setActiveIndex(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setActiveIndex(-1);
            setOpen(true);
            onFocus?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-expanded={open && items.length > 0}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              setActiveIndex(-1);
              onChange("");
            }}
            aria-label="Clear search"
            className="cv-quiet-text grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-white/10"
          >
            <X size={15} />
          </button>
        )}

        <VoiceSearchButton status={voiceStatus} onClick={onVoiceSearch} />
      </div>

      {open && items.length > 0 && (
        <div
          role="listbox"
          className="cv-theme-panel cv-panel-surface cv-hairline absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border p-2 shadow-2xl backdrop-blur-2xl"
        >
          {!value.trim() && (
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="cv-quiet-text flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.2em]">
                <History size={11} />
                Recent searches
              </span>
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setActiveIndex(-1);
                  setOpen(false);
                }}
                className="text-[11px] text-[#d9b77b] hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          {items.map((item, idx) => (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={idx === safeActiveIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelectSuggestion(item);
                setActiveIndex(-1);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition ${
                idx === safeActiveIndex
                  ? "bg-[#d9b77b]/15 text-[#d9b77b]"
                  : "hover:bg-white/[.06]"
              }`}
            >
              <span className="truncate font-medium">{item.label}</span>
              <span className="cv-quiet-text shrink-0 text-[11px]">
                {item.sublabel}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------
   SITE HEADER
-------------------------------------------------- */

function SiteHeader({
  page,
  theme,
  onToggleTheme,
  onNavigate,
  onAccount,
  search,
  onSearchChange,
  onVoiceSearch,
  voiceStatus,
  isLoggedIn,
  watchlistCount,
  searchInputRef,
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function go(dest) {
    setMobileMenuOpen(false);
    onNavigate(dest);
  }

  return (
    <header className="cv-header-surface sticky top-0 z-40 border-b backdrop-blur-2xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={() => go("home")}
          aria-label="Cineverse home"
          className="shrink-0"
        >
          <Logo />
        </button>

        <nav aria-label="Primary navigation" className="hidden items-center gap-8 md:flex">
          <button
            type="button"
            onClick={() => go("home")}
            aria-current={page === "home" ? "page" : undefined}
            className={`text-sm transition-colors ${
              page === "home"
                ? "text-[#d9b77b]"
                : "cv-quiet-text hover:text-current"
            }`}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => go("discover")}
            aria-current={page === "discover" ? "page" : undefined}
            className={`text-sm transition-colors ${
              page === "discover"
                ? "text-[#d9b77b]"
                : "cv-quiet-text hover:text-current"
            }`}
          >
            Discover
          </button>

          <button
            type="button"
            onClick={() => go("watchlist")}
            aria-current={
              page === "profile" || page === "watchlist" ? "page" : undefined
            }
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              page === "profile" || page === "watchlist"
                ? "text-[#d9b77b]"
                : "cv-quiet-text hover:text-current"
            }`}
          >
            My watchlist
            {watchlistCount > 0 && (
              <span className="rounded-full bg-[#d9b77b]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#d9b77b]">
                {watchlistCount}
              </span>
            )}
          </button>
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Desktop search + microphone */}
          <div className="cv-input hidden h-10 w-52 items-center gap-1 rounded-full pl-3.5 pr-1 lg:flex xl:w-64">
            <Search size={16} className="cv-quiet-text shrink-0" />

            <input
              ref={searchInputRef}
              aria-label="Search movies"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onFocus={() => onNavigate("discover", false)}
              placeholder="Find your next film..."
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />

            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
                className="cv-quiet-text grid h-7 w-7 shrink-0 place-items-center"
              >
                <X size={13} />
              </button>
            )}

            <VoiceSearchButton
              status={voiceStatus}
              onClick={onVoiceSearch}
              compact
            />
          </div>

          {/* Mobile search toggle */}
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen((open) => !open);
              setMobileMenuOpen(false);
            }}
            aria-label="Toggle search"
            aria-expanded={mobileSearchOpen}
            className="cv-quiet-text grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/5 hover:text-current lg:hidden"
          >
            <Search size={18} />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="cv-quiet-text grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/5 hover:text-current"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            onClick={onAccount}
            aria-label={isLoggedIn ? "Open profile" : "Sign in"}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#d9b77b]/30 bg-[#d9b77b]/10 text-[#d9b77b] transition hover:bg-[#d9b77b]/20"
          >
            {isLoggedIn ? (
              <CircleUserRound size={19} />
            ) : (
              <UserRound size={18} />
            )}
          </button>

          {/* Mobile navigation menu toggle */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setMobileSearchOpen(false);
            }}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="cv-quiet-text grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/5 hover:text-current md:hidden"
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            aria-label="Mobile navigation"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="cv-hairline overflow-hidden border-t px-5 pb-4 pt-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => go("home")}
                className={`rounded-xl px-3 py-2.5 text-left text-sm ${
                  page === "home"
                    ? "bg-[#d9b77b]/15 font-semibold text-[#d9b77b]"
                    : "cv-quiet-text"
                }`}
              >
                Home
              </button>

              <button
                type="button"
                onClick={() => go("discover")}
                className={`rounded-xl px-3 py-2.5 text-left text-sm ${
                  page === "discover"
                    ? "bg-[#d9b77b]/15 font-semibold text-[#d9b77b]"
                    : "cv-quiet-text"
                }`}
              >
                Discover
              </button>

              <button
                type="button"
                onClick={() => go("watchlist")}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${
                  page === "profile" || page === "watchlist"
                    ? "bg-[#d9b77b]/15 font-semibold text-[#d9b77b]"
                    : "cv-quiet-text"
                }`}
              >
                <span>My watchlist</span>
                {watchlistCount > 0 && (
                  <span className="rounded-full bg-[#d9b77b]/20 px-2 py-0.5 text-[11px] font-semibold text-[#d9b77b]">
                    {watchlistCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onAccount();
                }}
                className="cv-quiet-text rounded-xl px-3 py-2.5 text-left text-sm"
              >
                {isLoggedIn ? "Account & profile" : "Sign in / Create account"}
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Mobile search panel */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="cv-hairline overflow-hidden border-t px-5 pb-4 pt-3 lg:hidden"
          >
            <div className="cv-input flex h-11 items-center gap-2 rounded-full px-3">
              <Search size={16} className="cv-quiet-text shrink-0" />

              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                onFocus={() => onNavigate("discover", false)}
                placeholder="Search films, titles..."
                aria-label="Search movies mobile"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                autoFocus
              />

              <VoiceSearchButton
                status={voiceStatus}
                onClick={onVoiceSearch}
                compact
              />

              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Close search"
                className="cv-quiet-text grid h-8 w-8 shrink-0 place-items-center"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* --------------------------------------------------
   AMBIENT BACKGROUND
-------------------------------------------------- */

function AmbientBackground() {
  const { scrollYProgress } = useScroll();
  const firstY = useTransform(scrollYProgress, [0, 1], [0, 230]);
  const secondY = useTransform(scrollYProgress, [0, 1], [0, -170]);
  const firstX = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <motion.div
        style={{ y: firstY, x: firstX }}
        className="absolute -left-56 top-[8%] h-[430px] w-[430px] rounded-full bg-[#b98142]/[.075] blur-[110px]"
      />

      <motion.div
        style={{ y: secondY }}
        className="absolute -right-48 top-[34%] h-[540px] w-[540px] rounded-full bg-[#5a4c8c]/[.09] blur-[130px]"
      />

      <motion.div
        style={{ y: firstY }}
        className="absolute bottom-[-280px] left-[24%] h-[460px] w-[620px] rounded-full bg-[#a36f3d]/[.045] blur-[120px]"
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.025),transparent_55%)]" />
    </div>
  );
}

/* --------------------------------------------------
   SECTION HEADING & SKELETONS
-------------------------------------------------- */

function SectionHeading({ eyebrow, title, subtitle, action, onAction }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.3em] text-[#d9b77b]">
            {eyebrow}
          </p>
        )}

        <h2 className="font-display text-3xl leading-tight sm:text-[38px]">
          {title}
        </h2>

        {subtitle && (
          <p className="cv-quiet-text mt-2 max-w-xl text-sm leading-6">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={onAction}
          className="group flex shrink-0 items-center gap-2 self-start text-sm text-[#d9b77b] transition hover:text-[#f0d6a3] sm:self-auto"
        >
          {action}
          <ArrowRight
            size={15}
            className="transition-transform group-hover:translate-x-1"
          />
        </button>
      )}
    </div>
  );
}

function MovieGridSkeleton({ count = 6 }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading movies"
      className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="aspect-[2/3] animate-pulse rounded-[13px] border border-white/[.08] bg-white/[.05]"
        />
      ))}
    </div>
  );
}

/* --------------------------------------------------
   MOVIE CARD
-------------------------------------------------- */


function MovieCard({
  movie,
  onOpen,
  isSaved,
  onToggleSave,
  index = 0,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [previewDetails, setPreviewDetails] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const previewTimerRef = useRef(null);
  const requestControllerRef = useRef(null);

  const posterSrcSet = buildPosterSrcSet(movie.poster);

  const isHoverDevice =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Load trailer details when a preview becomes active.
  const activatePreview = useCallback(async () => {
    if (previewActive) return;

    setPreviewActive(true);

    if (movie.trailer || movie.trailerKey) {
      setPreviewDetails(movie);
      return;
    }

    if (!movie.tmdbId) return;

    const controller = new AbortController();
    requestControllerRef.current = controller;

    setPreviewLoading(true);

    try {
      const details = await getMovieDetails(
        movie.tmdbId,
        controller.signal,
      );

      if (!controller.signal.aborted) {
        setPreviewDetails(details);
      }
    } catch (error) {
      if (!controller.signal.aborted && error.name !== "AbortError") {
        console.error(
          `Trailer preview failed for ${movie.title}:`,
          error,
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setPreviewLoading(false);
      }
    }
  }, [movie, previewActive]);

  // Desktop: activate preview after a 700ms hover.
  const startPreview = useCallback(() => {
    if (!isHoverDevice || previewActive) return;

    window.clearTimeout(previewTimerRef.current);

    previewTimerRef.current = window.setTimeout(() => {
      activatePreview();
    }, 700);
  }, [activatePreview, isHoverDevice, previewActive]);

  // Stop preview and cancel pending network requests.
  const stopPreview = useCallback(() => {
    window.clearTimeout(previewTimerRef.current);

    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    setPreviewActive(false);
    setPreviewDetails(null);
    setPreviewLoading(false);
  }, []);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      window.clearTimeout(previewTimerRef.current);
      requestControllerRef.current?.abort();
    };
  }, []);

  const trailer =
    previewDetails?.trailer ||
    (previewDetails?.trailerKey
      ? {
          key: previewDetails.trailerKey,
          site: "YouTube",
          type: "Trailer",
          official: false,
          name: "Movie Trailer",
        }
      : null);

  // Mobile: first tap previews, second tap opens movie details.
  function handleCardClick() {
    if (!isHoverDevice && !previewActive) {
      window.clearTimeout(previewTimerRef.current);
      activatePreview();
      return;
    }

    onOpen(movie);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: 0.42,
        delay: Math.min(index * 0.035, 0.2),
      }}
      onMouseEnter={startPreview}
      onMouseLeave={() => {
        if (isHoverDevice) stopPreview();
      }}
      className={`relative aspect-[2/3] min-w-0 ${
        previewActive ? "z-50" : "z-0"
      }`}
    >
      <motion.div
        animate={{
          width: previewActive ? "155%" : "100%",
          aspectRatio: previewActive ? "16 / 9" : "2 / 3",
          scale: previewActive ? 1.025 : 1,
          x: "-50%",
          y: "-50%",
        }}
        transition={{
          duration: 0.32,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute left-1/2 top-1/2 overflow-hidden rounded-[13px] border border-white/[.10] bg-[#111214] shadow-[0_16px_38px_rgba(0,0,0,.25)]"
      >
        {/* Movie poster */}
        {movie.poster && !imageFailed ? (
          <img
            src={movie.poster}
            srcSet={posterSrcSet}
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 24vw, 18vw"
            alt={`${movie.title} poster`}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${
              trailer && previewActive
                ? "scale-105 opacity-0"
                : "scale-100 opacity-100"
            }`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#34302b] via-[#151517] to-[#111] p-4 text-center text-white">
            <Film size={28} className="text-[#d9b77b]/70" />
            <span className="font-display text-lg">
              {movie.title}
            </span>
          </div>
        )}

        {/* Inline trailer */}
        {previewActive && trailer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-10"
          >
            <TrailerPlayer
              trailer={trailer}
              title={movie.title}
              autoplay
              muted
              controls={false}
              className="h-full w-full"
            />
          </motion.div>
        )}

        {/* Dark cinematic overlay */}
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black via-black/15 to-black/10" />

        {/* Rating */}
        <div className="pointer-events-none absolute left-3 top-3 z-30 flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur-md">
          <Star
            size={11}
            className="fill-[#d9b77b] text-[#d9b77b]"
          />
          {movie.rating}
        </div>

        {/* Watchlist */}
        <button
          type="button"
          aria-label={
            isSaved
              ? `Remove ${movie.title} from watchlist`
              : `Save ${movie.title}`
          }
          onClick={(event) => {
            event.stopPropagation();
            onToggleSave(movie);
          }}
          className={`absolute right-3 top-3 z-40 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition ${
            isSaved
              ? "border-[#d9b77b]/60 bg-[#d9b77b] text-[#17130d]"
              : "border-white/20 bg-black/50 text-white hover:bg-black/80"
          }`}
        >
          {isSaved ? <Check size={15} /> : <Bookmark size={15} />}
        </button>

        {/* Movie information */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 p-4">
          <h3 className="truncate font-brand text-sm font-bold text-white sm:text-base">
            {movie.title}
          </h3>

          <div className="mt-1 flex items-center gap-2 text-[11px] text-white/70">
            <span>{movie.year}</span>

            {movie.genres?.[0] && (
              <>
                <span>•</span>
                <span>{movie.genres[0]}</span>
              </>
            )}
          </div>

          {previewActive && (
            <>
              {previewLoading && (
                <p className="mt-2 text-[10px] text-white/60">
                  Finding trailer...
                </p>
              )}

              {previewDetails?.synopsis && (
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-white/75">
                  {previewDetails.synopsis}
                </p>
              )}

              {!previewLoading && !trailer && (
                <p className="mt-2 text-[10px] text-white/60">
                  Trailer unavailable for this film.
                </p>
              )}
            </>
          )}
        </div>

        {/* Card click target */}
        <button
          type="button"
          onClick={handleCardClick}
          className="absolute inset-0 z-[25] cursor-pointer"
          aria-label={
            previewActive
              ? `Open details for ${movie.title}`
              : `Preview ${movie.title}`
          }
        />

        {/* Details action */}
        {previewActive && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(movie);
            }}
            className="absolute bottom-4 right-4 z-40 flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black transition hover:bg-[#d9b77b]"
          >
            <Play size={12} fill="currentColor" />
            More details
          </button>
        )}
      </motion.div>
    </motion.article>
  );
}


/* --------------------------------------------------
   MOVIE ROW
-------------------------------------------------- */

function MovieRow({
  title,
  eyebrow,
  movies,
  loading = false,
  onOpen,
  isMovieSaved,
  onToggleSave,
  onAction,
  action = "Explore collection",
}) {
  if (!loading && !movies.length) return null;

  return (
    <section className="mb-14">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        action={action}
        onAction={onAction}
      />

      {loading && !movies.length ? (
        <MovieGridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {movies.map((movie, index) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              index={index}
              onOpen={onOpen}
              isSaved={isMovieSaved(movie)}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------
   HERO CAROUSEL
-------------------------------------------------- */

function HeroCarousel({ movies = [], loading = false, onOpenMovie, onDiscover }) {
  const heroMovies = useMemo(() => movies.slice(0, 5), [movies]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (heroMovies.length <= 1 || paused) return undefined;

    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroMovies.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [heroMovies.length, paused]);

  const safeHeroIndex = heroMovies.length ? heroIndex % heroMovies.length : 0;
  const featured = heroMovies[safeHeroIndex] || heroMovies[0];

  if (loading && !featured) {
    return (
      <section
        id="home"
        aria-busy="true"
        className="relative isolate flex min-h-[590px] items-center bg-[#101217] sm:min-h-[650px] lg:min-h-[700px]"
      >
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="max-w-[620px] space-y-5">
            <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="h-16 w-4/5 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-20 w-full animate-pulse rounded-2xl bg-white/10" />
          </div>
        </div>
      </section>
    );
  }

  if (!featured) return null;

  const heroBackdrop = featured.backdrop || featured.poster;

  return (
    <section
      id="home"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative isolate min-h-[590px] overflow-hidden sm:min-h-[650px] lg:min-h-[700px]"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={featured.id}
          initial={{ opacity: 0, scale: 1.035 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute inset-0 -z-20"
        >
          {heroBackdrop ? (
            <img
              src={heroBackdrop}
              alt=""
              onError={(event) => {
                if (featured.poster && event.currentTarget.src !== featured.poster) {
                  event.currentTarget.src = featured.poster;
                } else {
                  event.currentTarget.style.display = "none";
                }
              }}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#1f1c18] via-[#101217] to-[#090a0b]" />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#090a0b] via-[#090a0b]/80 to-[#090a0b]/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#090a0b] via-[#090a0b]/20 to-[#090a0b]/25" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_42%,transparent_0%,rgba(9,10,11,.15)_57%,rgba(9,10,11,.55)_100%)]" />

      <div className="mx-auto flex min-h-[590px] max-w-[1440px] items-center px-5 pb-16 pt-12 sm:min-h-[650px] sm:px-8 lg:min-h-[700px] lg:px-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={featured.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.55 }}
            className="max-w-[660px]"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-[#d9b77b]" />
              <span className="text-[10px] font-semibold uppercase tracking-[.32em] text-[#f0d6a3]">
                THE CINEVERSE EDIT
              </span>
            </div>

            {featured.genres?.length > 0 && (
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[.26em] text-white/65">
                {featured.genres.slice(0, 3).join(" · ")}
              </p>
            )}

            <h1 className="max-w-[620px] font-display text-5xl leading-[.98] tracking-[-.035em] text-white sm:text-6xl lg:text-[82px]">
              {renderHeroTitle(featured.title)}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/75">
              <span>{featured.year}</span>
              <span className="h-1 w-1 rounded-full bg-[#d9b77b]" />

              <span className="flex items-center gap-1">
                <Star size={12} className="fill-[#d9b77b] text-[#d9b77b]" />
                {featured.rating} / 10
              </span>

              {featured.runtime && featured.runtime !== "Not listed" && (
                <>
                  <span className="h-1 w-1 rounded-full bg-[#d9b77b]" />
                  <span>{featured.runtime}</span>
                </>
              )}
            </div>

            <p className="mt-5 max-w-[510px] line-clamp-3 text-sm leading-7 text-white/70 sm:text-[15px]">
              {featured.synopsis}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenMovie(featured)}
                className="cv-gold-button group flex h-12 items-center gap-3 rounded-full px-6 text-sm font-semibold transition hover:bg-[#f0d6a3]"
              >
                <Play size={14} fill="currentColor" />
                Explore film
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>

              <button
                type="button"
                onClick={onDiscover}
                className="flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/[.04] px-5 text-sm text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white/10"
              >
                <Compass size={15} />
                Discover more
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-7 left-5 right-5 mx-auto flex max-w-[1440px] items-end justify-between sm:bottom-8 sm:left-8 sm:right-8 lg:left-12 lg:right-12">
        <div className="flex items-center gap-2.5">
          {heroMovies.map((movie, index) => (
            <button
              type="button"
              aria-label={`Show ${movie.title}`}
              key={movie.id}
              onClick={() => setHeroIndex(index)}
              className={`relative h-[3px] overflow-hidden rounded-full transition-all ${
                index === safeHeroIndex
                  ? "w-12 bg-white/25"
                  : "w-5 bg-white/25 hover:bg-white/50"
              }`}
            >
              {index === safeHeroIndex && (
                <motion.span
                  key={`${movie.id}-${paused}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 8, ease: "linear" }}
                  className="absolute inset-0 origin-left bg-[#d9b77b]"
                />
              )}
            </button>
          ))}

          <span className="ml-2 text-[10px] tracking-[.18em] text-white/55">
            0{safeHeroIndex + 1} <span className="mx-1 text-white/25">/</span> 0
            {heroMovies.length}
          </span>
        </div>

        <button
          type="button"
          onClick={onDiscover}
          className="hidden items-center gap-2 text-[10px] uppercase tracking-[.2em] text-white/60 transition hover:text-white sm:flex"
        >
          Scroll to explore <ArrowDown size={13} />
        </button>
      </div>
    </section>
  );
}

/* --------------------------------------------------
   MOOD EXPLORER
-------------------------------------------------- */

function MoodExplorer({ activeMood, onSelectMood }) {
  return (
    <section className="mb-16">
      <SectionHeading
        eyebrow="A feeling, not a filter"
        title="What are you in the mood for?"
        subtitle="Pick the feeling. We'll handle the opening credits."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {MOODS.map((mood, index) => {
          const active = activeMood === mood.name;

          return (
            <button
              type="button"
              key={mood.name}
              onClick={() => onSelectMood(active ? "" : mood.name)}
              className={`group relative min-h-[142px] overflow-hidden rounded-2xl border p-5 text-left transition duration-300 ${
                active
                  ? "border-[#d9b77b]/65 bg-[#d9b77b]/[.12]"
                  : "cv-panel-surface hover:border-[#d9b77b]/35 hover:bg-white/[.04]"
              }`}
            >
              <span
                className={`mb-7 grid h-9 w-9 place-items-center rounded-xl border transition ${
                  active
                    ? "border-[#d9b77b]/50 bg-[#d9b77b]/15 text-[#d9b77b]"
                    : "cv-pill group-hover:text-[#d9b77b]"
                }`}
              >
                {index === 0 ? (
                  <Sparkles size={16} />
                ) : index === 1 ? (
                  <Heart size={16} />
                ) : index === 2 ? (
                  <Moon size={16} />
                ) : index === 3 ? (
                  <Film size={16} />
                ) : (
                  <Play size={16} />
                )}
              </span>

              <span className="block text-sm font-semibold">{mood.name}</span>

              <span className="cv-quiet-text mt-1 block text-xs">
                {mood.description}
              </span>

              {active && (
                <Check
                  size={15}
                  className="absolute right-4 top-4 text-[#d9b77b]"
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------------------------------
   DISCOVER PAGE
-------------------------------------------------- */

function DiscoverPage({
  movies,
  loading,
  loadingMore,
  error,
  hasMore,
  totalResults,
  genresList,
  search,
  onSearchChange,
  onSelectSuggestion,
  searchHistory,
  onClearHistory,
  activeGenre,
  onGenreChange,
  activeMood,
  onMoodChange,
  onOpenMovie,
  isMovieSaved,
  onToggleSave,
  onClearFilters,
  onLoadMore,
  onRetry,
  onVoiceSearch,
  voiceStatus,
}) {
  return (
    <section
      id="discover"
      className="mx-auto min-h-[75vh] max-w-[1440px] scroll-mt-24 px-5 py-12 sm:px-8 sm:py-16 lg:px-12"
    >
      <div className="mb-10 flex flex-col justify-between gap-7 md:flex-row md:items-end">
        <div>
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.3em] text-[#d9b77b]">
            <Compass size={13} /> Your next favourite is here
          </p>

          <h1 className="font-display text-5xl leading-none sm:text-6xl">
            Discover <span className="italic text-[#d9b77b]">cinema.</span>
          </h1>

          <p className="cv-quiet-text mt-4 max-w-xl text-sm leading-6">
            Explore live TMDB releases, timeless classics, and curated mood
            collections.
          </p>
        </div>

        {/* Discover search + suggestions + voice search */}
        <SearchBox
          value={search}
          onChange={onSearchChange}
          onSelectSuggestion={onSelectSuggestion}
          history={searchHistory}
          suggestions={movies}
          onClearHistory={onClearHistory}
          onVoiceSearch={onVoiceSearch}
          voiceStatus={voiceStatus}
          placeholder="Search any film title..."
          ariaLabel="Search the movie catalog"
          className="w-full md:max-w-[380px]"
        />
      </div>

      <div className="cv-hairline mb-8 border-y py-5">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-[#d9b77b]">
          <SlidersHorizontal size={13} />
          Browse by genre
        </div>

        <div className="cv-no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {genresList.map((genre) => (
            <button
              type="button"
              key={genre}
              onClick={() => onGenreChange(genre)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs transition ${
                activeGenre === genre
                  ? "border-[#d9b77b] bg-[#d9b77b] text-[#17130d]"
                  : "cv-pill hover:border-[#d9b77b]/45"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="cv-quiet-text mr-1 flex items-center text-xs">
            Mood:
          </span>

          {MOODS.map((mood) => (
            <button
              type="button"
              key={mood.name}
              onClick={() =>
                onMoodChange(activeMood === mood.name ? "" : mood.name)
              }
              className={`rounded-full border px-3 py-1.5 text-[11px] transition ${
                activeMood === mood.name
                  ? "border-[#d9b77b]/60 bg-[#d9b77b]/15 text-[#d9b77b]"
                  : "cv-pill hover:border-[#d9b77b]/35"
              }`}
            >
              {mood.name}
            </button>
          ))}

          {(activeGenre !== "All" || activeMood || search) && (
            <button
              type="button"
              onClick={onClearFilters}
              className="ml-auto flex items-center gap-1.5 px-2 text-xs text-[#d9b77b] hover:text-[#f0d6a3]"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="cv-quiet-text text-sm">
          <span className="font-semibold text-current">
            {totalResults > 0 ? totalResults.toLocaleString() : movies.length}
          </span>{" "}
          {totalResults === 1 ? "film" : "films"} to explore
        </p>

        <span className="cv-quiet-text hidden items-center gap-1.5 text-xs sm:flex">
          <Sparkles size={13} className="text-[#d9b77b]" />
          Powered by live TMDB catalog
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="cv-panel-surface mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-400/25 p-5"
        >
          <div className="flex items-center gap-3 text-sm text-red-400">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="cv-pill flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold hover:border-[#d9b77b]/50"
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      )}

      {loading && !movies.length ? (
        <MovieGridSkeleton count={12} />
      ) : movies.length ? (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {movies.map((movie, index) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                index={index % 12}
                onOpen={onOpenMovie}
                isSaved={isMovieSaved(movie)}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-12 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={onLoadMore}
                className="cv-pill rounded-full border px-7 py-3 text-xs font-semibold transition hover:border-[#d9b77b] hover:text-[#d9b77b] disabled:opacity-50"
              >
                {loadingMore ? "Loading more films..." : "Load more films"}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="cv-panel-surface flex min-h-[300px] flex-col items-center justify-center rounded-3xl border p-8 text-center">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[#d9b77b]/25 bg-[#d9b77b]/10 text-[#d9b77b]">
            <Film size={23} />
          </div>

          <h2 className="font-display text-2xl">Nothing on this reel. Yet.</h2>

          <p className="cv-quiet-text mt-2 max-w-sm text-sm leading-6">
            Try a different title, genre, or mood. The perfect film may simply
            be hiding.
          </p>

          <button
            type="button"
            onClick={onClearFilters}
            className="cv-gold-button mt-5 rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            Reset discovery
          </button>
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------
   FOOTER
-------------------------------------------------- */

function Footer({ onNavigate }) {
  return (
    <footer className="cv-hairline relative z-10 border-t px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Logo compact />

          <div>
            <p className="font-brand text-xs font-extrabold tracking-[.16em]">
              CINEVERSE
            </p>

            <p className="cv-quiet-text mt-1 text-[10px]">
              For the love of the story.
            </p>
          </div>
        </div>

        <div className="cv-quiet-text flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="transition hover:text-current"
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => onNavigate("discover")}
            className="transition hover:text-current"
          >
            Discover
          </button>

          <button
            type="button"
            onClick={() => onNavigate("watchlist")}
            className="transition hover:text-current"
          >
            Watchlist
          </button>

          <span>Film data powered by TMDB</span>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------------------------------
   MAIN APP
-------------------------------------------------- */

export default function App() {
  const location = useLocation();
  const routerNavigate = useNavigate();

  const page = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.startsWith("/discover")) return "discover";
    if (path.startsWith("/auth")) return "auth";
    if (path.startsWith("/profile")) return "profile";
    if (path.startsWith("/watchlist")) return "watchlist";
    return "home";
  }, [location.pathname]);

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" ? "light" : "dark";
  });

  // Search & filter state (hydrated from URL query if present on /discover)
  const initialParams = useMemo(
    () => new URLSearchParams(location.search),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [search, setSearch] = useState(() => initialParams.get("q") || "");
  const [activeGenre, setActiveGenre] = useState(
    () => initialParams.get("genre") || "All",
  );
  const [activeMood, setActiveMood] = useState(
    () => initialParams.get("mood") || "",
  );
  const debouncedSearch = useDebounce(search.trim(), 350);

  const [selectedMovie, setSelectedMovie] = useState(null);

  // Auth user session state
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const notify = useCallback((type, message) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), type, message });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3600);
  }, []);

  const {
    watchlistMovies,
    watchlistLoading,
    watchlistError,
    isMovieSaved,
    toggleSaveMovie,
  } = useWatchlist(currentUser, notify);

  const {
    history: searchHistory,
    recordSearch,
    clearHistory: clearSearchHistory,
  } = useSearchHistory(currentUser);

  // Live catalog state (Home)
  const [genresMeta, setGenresMeta] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [preferredMovies, setPreferredMovies] = useState([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeError, setHomeError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);
  const [homeReloadTick, setHomeReloadTick] = useState(0);

  // Live Discover state
  const [discoverList, setDiscoverList] = useState([]);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverTotalPages, setDiscoverTotalPages] = useState(1);
  const [discoverTotalResults, setDiscoverTotalResults] = useState(0);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverLoadingMore, setDiscoverLoadingMore] = useState(false);
  const [discoverError, setDiscoverError] = useState("");
  const [discoverReloadTick, setDiscoverReloadTick] = useState(0);

  const discoverReqIdRef = useRef(0);
  const desktopSearchInputRef = useRef(null);

  // Voice search state
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceQuery, setVoiceQuery] = useState("");
  const recognitionRef = useRef(null);
  const voiceAbortRef = useRef(null);

  const genrePills = useMemo(() => {
    if (!genresMeta.length) return DEFAULT_GENRE_PILLS;
    const names = genresMeta
      .map((g) => g.name)
      .filter((name) => name !== "TV Movie");
    return ["All", ...Array.from(new Set(names))];
  }, [genresMeta]);

  /* Theme updates */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  /* Restore backend session on mount */
  useEffect(() => {
    const controller = new AbortController();
    getSessionUser(controller.signal)
      .then((user) => {
        if (!controller.signal.aborted) {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAuthReady(true);
        }
      });

    return () => controller.abort();
  }, []);

  /* Clean up timers/voice resources on unmount */
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      voiceAbortRef.current?.abort();
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore recognition cleanup errors.
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /* Fetch live TMDB collections for Home & Genres */
  useEffect(() => {
    const controller = new AbortController();

    Promise.allSettled([
      getTrendingMovies({ timeWindow: "day", page: 1 }, controller.signal),
      getPopularMovies(1, controller.signal),
      getTopRatedMovies(1, controller.signal),
      getNowPlayingMovies(1, controller.signal),
      getGenres(controller.signal),
    ])
      .then(([trendRes, popRes, topRes, nowRes, genresRes]) => {
        if (controller.signal.aborted) return;

        const trendList =
          trendRes.status === "fulfilled" ? trendRes.value.results : [];
        const popList =
          popRes.status === "fulfilled" ? popRes.value.results : [];
        const topList =
          topRes.status === "fulfilled" ? topRes.value.results : [];
        const nowList =
          nowRes.status === "fulfilled" ? nowRes.value.results : [];

        if (genresRes.status === "fulfilled") {
          setGenresMeta(genresRes.value);
        }

        const allFailed =
          trendRes.status === "rejected" &&
          popRes.status === "rejected" &&
          topRes.status === "rejected" &&
          nowRes.status === "rejected";

        if (allFailed) {
          setTrendingMovies(OFFLINE_FALLBACK_MOVIES);
          setPopularMovies(OFFLINE_FALLBACK_MOVIES);
          setTopRatedMovies([]);
          setNowPlayingMovies([]);
          setUsingFallback(true);
          setHomeError(
            "Unable to reach the Cineverse movie server. Showing offline preview titles.",
          );
        } else {
          setUsingFallback(false);
          setHomeError("");
          setTrendingMovies(trendList);
          setPopularMovies(popList);
          setTopRatedMovies(topList);
          setNowPlayingMovies(nowList);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setHomeLoading(false);
        }
      });

    return () => controller.abort();
  }, [homeReloadTick]);

  /* Fetch personalized genre recommendations for authenticated users */
  useEffect(() => {
    const favs = currentUser?.favoriteGenres || [];
    if (!favs.length) return undefined;

    const ids = favs
      .map((label) => resolveGenreId(label, genresMeta))
      .filter(Boolean)
      .slice(0, 3);

    if (!ids.length) return undefined;

    const controller = new AbortController();
    discoverMovies(
      { genres: ids.join(","), sortBy: "vote_average.desc", page: 1 },
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setPreferredMovies(data.results.slice(0, 6));
        }
      })
      .catch(() => {
        // Non-critical home section; keep empty on error.
      });

    return () => controller.abort();
  }, [currentUser?.favoriteGenres, genresMeta]);

  /* Sync URL search params when on /discover */
  useEffect(() => {
    if (page !== "discover") return;
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (activeGenre !== "All") params.set("genre", activeGenre);
    if (activeMood) params.set("mood", activeMood);
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `/discover?${nextSearch}` : "/discover";
    if (`${location.pathname}${location.search}` !== nextUrl) {
      routerNavigate(nextUrl, { replace: true });
    }
  }, [
    page,
    debouncedSearch,
    activeGenre,
    activeMood,
    location.pathname,
    location.search,
    routerNavigate,
  ]);

  const isVoiceNotFoundMatch =
    voiceStatus === "not-found" &&
    normalizeMovieTitle(search) === normalizeMovieTitle(voiceQuery);

  /* Fetch live Discover results when filters or search change */
  useEffect(() => {
    if (page !== "discover" || isVoiceNotFoundMatch) return undefined;

    const reqId = ++discoverReqIdRef.current;
    const controller = new AbortController();

    async function loadInitialDiscover() {
      let data;
      if (debouncedSearch) {
        data = await searchMovies(debouncedSearch, 1, controller.signal);
        if (activeGenre !== "All") {
          data = {
            ...data,
            results: data.results.filter((movie) =>
              movie.genres.includes(activeGenre),
            ),
          };
        }
      } else if (activeGenre !== "All" || activeMood) {
        const moodConfig = MOODS.find((m) => m.name === activeMood);
        const genreId = resolveGenreId(activeGenre, genresMeta);
        const combinedGenres = [
          genreId ? String(genreId) : "",
          moodConfig?.genreIds || "",
        ]
          .filter(Boolean)
          .join(",");

        data = await discoverMovies(
          {
            genres: combinedGenres || undefined,
            sortBy: moodConfig?.sortBy || "popularity.desc",
            page: 1,
          },
          controller.signal,
        );
      } else {
        data = await getPopularMovies(1, controller.signal);
      }

      if (controller.signal.aborted || reqId !== discoverReqIdRef.current) {
        return;
      }

      setDiscoverError("");
      setDiscoverList(deduplicateMovies(data.results));
      setDiscoverPage(data.page);
      setDiscoverTotalPages(data.totalPages);
      setDiscoverTotalResults(data.totalResults);

      if (debouncedSearch.length >= 2) {
        recordSearch(debouncedSearch);
      }
    }

    Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted && reqId === discoverReqIdRef.current) {
          setDiscoverLoading(true);
        }
        return loadInitialDiscover();
      })
      .catch((error) => {
        if (controller.signal.aborted || reqId !== discoverReqIdRef.current) {
          return;
        }
        setDiscoverError(
          error?.message || "Unable to load films right now. Please retry.",
        );
        if (usingFallback && !debouncedSearch) {
          setDiscoverList(OFFLINE_FALLBACK_MOVIES);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && reqId === discoverReqIdRef.current) {
          setDiscoverLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    page,
    debouncedSearch,
    activeGenre,
    activeMood,
    genresMeta,
    discoverReloadTick,
    isVoiceNotFoundMatch,
    usingFallback,
    recordSearch,
  ]);

  /* Load next Discover page */
  const handleLoadMoreDiscover = useCallback(async () => {
    if (discoverLoadingMore || discoverPage >= discoverTotalPages) return;
    const nextPage = discoverPage + 1;
    const reqId = discoverReqIdRef.current;

    setDiscoverLoadingMore(true);
    try {
      let data;
      if (debouncedSearch) {
        data = await searchMovies(debouncedSearch, nextPage);
      } else if (activeGenre !== "All" || activeMood) {
        const moodConfig = MOODS.find((m) => m.name === activeMood);
        const genreId = resolveGenreId(activeGenre, genresMeta);
        const combinedGenres = [
          genreId ? String(genreId) : "",
          moodConfig?.genreIds || "",
        ]
          .filter(Boolean)
          .join(",");

        data = await discoverMovies({
          genres: combinedGenres || undefined,
          sortBy: moodConfig?.sortBy || "popularity.desc",
          page: nextPage,
        });
      } else {
        data = await getPopularMovies(nextPage);
      }

      if (reqId !== discoverReqIdRef.current) return;

      setDiscoverList((prev) => deduplicateMovies([...prev, ...data.results]));
      setDiscoverPage(data.page);
      setDiscoverTotalPages(data.totalPages);
    } catch (error) {
      notify("error", error?.message || "Could not load more films.");
    } finally {
      setDiscoverLoadingMore(false);
    }
  }, [
    discoverLoadingMore,
    discoverPage,
    discoverTotalPages,
    debouncedSearch,
    activeGenre,
    activeMood,
    genresMeta,
    notify,
  ]);

  /* Redirect authenticated users away from /auth */
  useEffect(() => {
    if (authReady && currentUser && page === "auth") {
      routerNavigate("/profile", { replace: true });
    }
  }, [authReady, currentUser, page, routerNavigate]);

  const isLoggedIn = Boolean(currentUser?.id);

  /* --------------------------------------------------
     TEXT-TO-SPEECH & VOICE SEARCH
  -------------------------------------------------- */

  function speakMessage(message, cancelPrevious = false) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      return;
    }

    if (cancelPrevious) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  }

  async function processVoiceQuery(transcript) {
    const cleanedQuery = cleanVoiceQuery(transcript);
    const finalQuery = cleanedQuery || transcript.trim();

    if (!finalQuery) {
      setVoiceStatus("error");
      setVoiceMessage("I couldn't hear a movie title. Please try again.");
      speakMessage("I couldn't hear a movie title. Please try again.", true);
      return;
    }

    voiceAbortRef.current?.abort();
    const controller = new AbortController();
    voiceAbortRef.current = controller;

    setVoiceQuery(finalQuery);
    setVoiceMessage(`Searching for "${finalQuery}"...`);
    setVoiceStatus("searching");

    setSearch(finalQuery);
    setActiveGenre("All");
    setActiveMood("");
    routerNavigate("/discover");

    speakMessage("Searching", true);

    try {
      const data = await searchMovies(finalQuery, 1, controller.signal);
      if (controller.signal.aborted) return;

      const foundMovie = pickBestVoiceMatch(finalQuery, data.results || []);

      if (foundMovie) {
        setSearch(foundMovie.title);
        setVoiceMessage(`Found this movie: ${foundMovie.title}`);
        setVoiceStatus("found");
        setSelectedMovie(foundMovie);
        recordSearch(foundMovie.title);
        speakMessage(`Found this movie: ${foundMovie.title}`);
      } else {
        setSelectedMovie(null);
        setVoiceMessage(
          `Not Found. "${finalQuery}" returned no matching films on TMDB.`,
        );
        setVoiceStatus("not-found");
        speakMessage("Not Found");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setVoiceStatus("error");
      setVoiceMessage(
        error?.message || "Voice search failed while contacting the catalog.",
      );
    }
  }

  function startVoiceSearch() {
    if (voiceStatus === "listening") {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Recognition might already have stopped.
      }

      recognitionRef.current = null;
      setVoiceStatus("idle");
      setVoiceMessage("");
      return;
    }

    if (voiceStatus === "searching") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus("unsupported");
      setVoiceMessage(
        "Voice search isn't supported in this browser. Using text search instead.",
      );
      routerNavigate("/discover");
      requestAnimationFrame(() => {
        desktopSearchInputRef.current?.focus();
      });
      speakMessage("Voice search is not supported by this browser.", true);
      return;
    }

    voiceAbortRef.current?.abort();

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognitionRef.current = recognition;

      setVoiceStatus("listening");
      setVoiceMessage("Listening. Say the name of a movie.");
      setVoiceQuery("");

      recognition.onstart = () => {
        setVoiceStatus("listening");
        setVoiceMessage("Listening. Say the name of a movie.");
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        processVoiceQuery(transcript);
      };

      recognition.onerror = (event) => {
        const recognitionError = event.error;

        if (recognitionError === "aborted") {
          setVoiceStatus((current) =>
            current === "listening" ? "idle" : current,
          );
          return;
        }

        let message =
          "Voice search encountered a problem. Try again or use text search.";

        if (recognitionError === "not-allowed") {
          message =
            "Microphone access was blocked. Allow microphone permission in your browser settings and try again.";
        } else if (recognitionError === "no-speech") {
          message = "No speech detected. Click the microphone and try again.";
        } else if (recognitionError === "audio-capture") {
          message =
            "No microphone was detected. Check your microphone connection and system settings.";
        } else if (recognitionError === "network") {
          message =
            "The browser's speech recognition service couldn't connect. Check your internet connection and retry.";
        }

        setVoiceStatus("error");
        setVoiceMessage(message);

        if (recognitionError === "not-allowed") {
          speakMessage("Microphone access denied", true);
        } else if (recognitionError === "no-speech") {
          speakMessage("No speech detected. Please try again.", true);
        } else {
          speakMessage("Voice search error", true);
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setVoiceStatus((current) =>
          current === "listening" ? "idle" : current,
        );
      };

      recognition.start();
    } catch {
      setVoiceStatus("error");
      setVoiceMessage(
        "Couldn't start the microphone. Check your browser permissions and try again.",
      );
      speakMessage("Could not start the microphone", true);
    }
  }

  function dismissVoiceMessage() {
    setVoiceStatus("idle");
    setVoiceMessage("");
  }

  /* --------------------------------------------------
     NAVIGATION AND ACTIONS
  -------------------------------------------------- */

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function clearFilters() {
    setActiveGenre("All");
    setActiveMood("");
    setSearch("");
    setVoiceStatus("idle");
    setVoiceMessage("");
  }

  function openDiscover() {
    clearFilters();
    routerNavigate("/discover");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function navigate(destination, resetSearch = true) {
    if (destination === "discover") {
      if (resetSearch) {
        openDiscover();
      } else {
        routerNavigate("/discover");
      }
      return;
    }

    if (destination === "watchlist") {
      routerNavigate(isLoggedIn ? "/profile" : "/watchlist");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (destination === "profile") {
      routerNavigate(isLoggedIn ? "/profile" : "/auth");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (destination === "auth") {
      routerNavigate("/auth");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    routerNavigate("/");
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function handleSearchChange(value) {
    setSearch(value);
    setVoiceStatus("idle");
    setVoiceMessage("");

    if (value.trim() && page !== "discover") {
      routerNavigate("/discover");
    }
  }

  function handleSelectSuggestion(item) {
    if (item.kind === "movie" && item.movie) {
      setSelectedMovie(item.movie);
      recordSearch(item.movie.title);
    } else if (item.label) {
      setSearch(item.label);
      setActiveGenre("All");
      setActiveMood("");
      if (page !== "discover") {
        routerNavigate("/discover");
      }
    }
  }

  function handleAccount() {
    navigate(isLoggedIn ? "profile" : "auth");
  }

  async function handleLogin({ email, password }) {
    const user = await loginUserAccount({ email, password });
    setCurrentUser(user);
    notify("success", `Welcome back, ${user.name}.`);
    routerNavigate("/profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleRegister({ name, email, password }) {
    const user = await registerUserAccount({ name, email, password });
    setCurrentUser(user);
    notify("success", `Welcome to Cineverse, ${user.name}.`);
    routerNavigate("/profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveProfile({ name, favoriteGenres }) {
    const updatedUser = await updateUserProfile({ name, favoriteGenres });
    setCurrentUser(updatedUser);
    notify("success", "Profile preferences saved.");
  }

  async function handleLogout() {
    try {
      await logoutUserAccount();
    } finally {
      setCurrentUser(null);
      notify("info", "Signed out cleanly.");
      routerNavigate("/");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleDeleteAccount(password) {
    await deleteUserAccount(password);
    setCurrentUser(null);
    notify("info", "Your Cineverse account has been deleted.");
    routerNavigate("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  const displayedDiscoverMovies = isVoiceNotFoundMatch ? [] : discoverList;
  const displayedDiscoverTotal = isVoiceNotFoundMatch ? 0 : discoverTotalResults;
  const displayedDiscoverHasMore =
    !isVoiceNotFoundMatch && discoverPage < discoverTotalPages;
  const displayedPreferredMovies = currentUser?.favoriteGenres?.length
    ? preferredMovies
    : [];

  return (
    <MotionConfig reducedMotion="user">
      <div className="cv-shell relative isolate overflow-clip font-sans">
        <AmbientBackground />

        <div className="relative z-10">
          <SiteHeader
            page={page}
            theme={theme}
            onToggleTheme={toggleTheme}
            onNavigate={navigate}
            onAccount={handleAccount}
            search={search}
            onSearchChange={handleSearchChange}
            onVoiceSearch={startVoiceSearch}
            voiceStatus={voiceStatus}
            isLoggedIn={isLoggedIn}
            watchlistCount={watchlistMovies.length}
            searchInputRef={desktopSearchInputRef}
          />

          <Suspense
            fallback={
              <div className="mx-auto flex min-h-[60vh] max-w-[1440px] items-center justify-center px-5">
                <p className="cv-quiet-text text-sm">Loading view...</p>
              </div>
            }
          >
            {page === "auth" && (
              <AuthPage
                onLogin={handleLogin}
                onRegister={handleRegister}
                onBack={() => navigate("home")}
              />
            )}

            {(page === "profile" || page === "watchlist") && (
              <ProfilePage
                key={currentUser?.id || "guest"}
                user={currentUser}
                watchlistMovies={watchlistMovies}
                watchlistLoading={watchlistLoading}
                watchlistError={watchlistError}
                onSaveProfile={handleSaveProfile}
                onLogout={handleLogout}
                onDeleteAccount={handleDeleteAccount}
                onOpenAuth={() => navigate("auth")}
                onDiscover={openDiscover}
                onOpenMovie={setSelectedMovie}
                onToggleSave={toggleSaveMovie}
                MovieCardComponent={MovieCard}
              />
            )}
          </Suspense>

          {page === "discover" && (
            <DiscoverPage
              movies={displayedDiscoverMovies}
              loading={discoverLoading}
              loadingMore={discoverLoadingMore}
              error={discoverError}
              hasMore={displayedDiscoverHasMore}
              totalResults={displayedDiscoverTotal}
              genresList={genrePills}
              search={search}
              onSearchChange={handleSearchChange}
              onSelectSuggestion={handleSelectSuggestion}
              searchHistory={searchHistory}
              onClearHistory={clearSearchHistory}
              activeGenre={activeGenre}
              onGenreChange={(genre) => {
                setActiveGenre(genre);
                setVoiceStatus("idle");
                setVoiceMessage("");
              }}
              activeMood={activeMood}
              onMoodChange={(mood) => {
                setActiveMood(mood);
                setVoiceStatus("idle");
                setVoiceMessage("");
              }}
              onOpenMovie={setSelectedMovie}
              isMovieSaved={isMovieSaved}
              onToggleSave={toggleSaveMovie}
              onClearFilters={clearFilters}
              onLoadMore={handleLoadMoreDiscover}
              onRetry={() => {
                setDiscoverError("");
                setDiscoverLoading(true);
                setDiscoverReloadTick((t) => t + 1);
              }}
              onVoiceSearch={startVoiceSearch}
              voiceStatus={voiceStatus}
            />
          )}

          {page === "home" && (
            <>
              <HeroCarousel
                movies={trendingMovies}
                loading={homeLoading}
                onOpenMovie={setSelectedMovie}
                onDiscover={openDiscover}
              />

              <main className="mx-auto max-w-[1440px] px-5 pb-8 sm:px-8 lg:px-12">
                {homeError && (
                  <div
                    role="alert"
                    className="cv-panel-surface mb-8 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-400/25 p-4 text-xs"
                  >
                    <span className="flex items-center gap-2 text-amber-300">
                      <AlertCircle size={15} />
                      {homeError}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHomeLoading(true);
                        setHomeError("");
                        setHomeReloadTick((t) => t + 1);
                      }}
                      className="cv-pill flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-semibold hover:border-[#d9b77b]/50"
                    >
                      <RefreshCw size={12} />
                      Retry live catalog
                    </button>
                  </div>
                )}

                <div className="cv-hairline mb-16 flex flex-wrap items-center justify-between gap-5 border-y py-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-[#d9b77b]/25 bg-[#d9b77b]/10 text-[#d9b77b]">
                      <Sparkles size={15} />
                    </span>

                    <div>
                      <p className="text-xs font-semibold">
                        Not just what’s popular.
                      </p>

                      <p className="cv-quiet-text mt-1 text-[11px]">
                        What’s worth your time.
                      </p>
                    </div>
                  </div>

                  <div className="cv-quiet-text flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[.18em]">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#d9b77b]" />
                      Live TMDB catalog
                    </span>

                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#d9b77b]" />
                      Always a new perspective
                    </span>
                  </div>
                </div>

                <MovieRow
                  title="Trending across cinema"
                  eyebrow="Right now on TMDB"
                  movies={trendingMovies.slice(0, 6)}
                  loading={homeLoading}
                  onOpen={setSelectedMovie}
                  isMovieSaved={isMovieSaved}
                  onToggleSave={toggleSaveMovie}
                  onAction={openDiscover}
                  action="Explore all films"
                />

                <MovieRow
                  title="Critically acclaimed"
                  eyebrow="Top rated films"
                  movies={topRatedMovies.slice(0, 6)}
                  loading={homeLoading}
                  onOpen={setSelectedMovie}
                  isMovieSaved={isMovieSaved}
                  onToggleSave={toggleSaveMovie}
                  onAction={openDiscover}
                  action="See more classics"
                />

                <MoodExplorer
                  activeMood={activeMood}
                  onSelectMood={(mood) => {
                    setActiveMood(mood);
                    setActiveGenre("All");
                    setVoiceStatus("idle");
                    setVoiceMessage("");
                    routerNavigate("/discover");
                  }}
                />

                <section id="discover-home" className="mb-16 scroll-mt-28">
                  <SectionHeading
                    eyebrow="Find your next favourite"
                    title="The Cineverse collection"
                    subtitle="Filter by genre or dive straight into the full live collection."
                    action="Open discovery"
                    onAction={openDiscover}
                  />

                  <div className="cv-no-scrollbar mb-7 flex gap-2 overflow-x-auto pb-1">
                    {genrePills.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => {
                          setActiveGenre(genre);
                          setActiveMood("");
                          setVoiceStatus("idle");
                          setVoiceMessage("");
                          routerNavigate("/discover");
                        }}
                        className={`shrink-0 rounded-full border px-4 py-2 text-xs transition ${
                          activeGenre === genre
                            ? "border-[#d9b77b] bg-[#d9b77b] text-[#17130d]"
                            : "cv-pill hover:border-[#d9b77b]/45"
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>

                  {homeLoading && !popularMovies.length ? (
                    <MovieGridSkeleton count={6} />
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {popularMovies.slice(0, 6).map((movie, index) => (
                        <MovieCard
                          key={movie.id}
                          movie={movie}
                          index={index}
                          onOpen={setSelectedMovie}
                          isSaved={isMovieSaved(movie)}
                          onToggleSave={toggleSaveMovie}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <MovieRow
                  title="Now in theatres"
                  eyebrow="Now playing"
                  movies={nowPlayingMovies.slice(0, 6)}
                  loading={homeLoading}
                  onOpen={setSelectedMovie}
                  isMovieSaved={isMovieSaved}
                  onToggleSave={toggleSaveMovie}
                  onAction={openDiscover}
                  action="Browse releases"
                />

                {watchlistMovies.length > 0 && (
                  <MovieRow
                    title="Saved for your next movie night"
                    eyebrow="Your personal reel"
                    movies={watchlistMovies.slice(0, 6)}
                    onOpen={setSelectedMovie}
                    isMovieSaved={isMovieSaved}
                    onToggleSave={toggleSaveMovie}
                    onAction={() => navigate("watchlist")}
                    action="Open watchlist"
                  />
                )}

                {displayedPreferredMovies.length > 0 ? (
                  <MovieRow
                    title="Picked for your taste"
                    eyebrow={`Based on ${(currentUser?.favoriteGenres || []).slice(0, 2).join(" & ")}`}
                    movies={displayedPreferredMovies}
                    onOpen={setSelectedMovie}
                    isMovieSaved={isMovieSaved}
                    onToggleSave={toggleSaveMovie}
                    onAction={() => navigate("profile")}
                    action="Tune preferences"
                  />
                ) : (
                  <section className="mb-16">
                    <div className="cv-panel-surface relative overflow-hidden rounded-[26px] border p-7 sm:p-10">
                      <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-[#d9b77b]/[.06] blur-3xl" />

                      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                        <div>
                          <p className="mb-2 text-[10px] uppercase tracking-[.27em] text-[#d9b77b]">
                            A little more your style
                          </p>

                          <h2 className="font-display text-3xl sm:text-4xl">
                            Your taste has a{" "}
                            <span className="italic text-[#d9b77b]">
                              story.
                            </span>
                          </h2>

                          <p className="cv-quiet-text mt-3 max-w-xl text-sm leading-6">
                            {isLoggedIn
                              ? "Set your favourite genres in your profile to curate personalised picks here."
                              : "Sign in and pick your favourite genres to sync your watchlist and personal picks."}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(isLoggedIn ? "profile" : "auth")
                          }
                          className="group flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#d9b77b]/35 px-5 text-sm text-[#d9b77b] transition hover:bg-[#d9b77b]/10"
                        >
                          Personalise
                          <ArrowRight
                            size={14}
                            className="transition-transform group-hover:translate-x-1"
                          />
                        </button>
                      </div>
                    </div>
                  </section>
                )}
              </main>
            </>
          )}

          <Footer onNavigate={navigate} />
        </div>

        <Suspense fallback={null}>
          {selectedMovie && (
            <MovieModal
              movie={selectedMovie}
              onClose={() => setSelectedMovie(null)}
              onSelectMovie={setSelectedMovie}
              isSaved={isMovieSaved(selectedMovie)}
              isAuthenticated={isLoggedIn}
              onToggleSave={toggleSaveMovie}
            />
          )}
        </Suspense>

        <VoiceStatusToast
          status={voiceStatus}
          message={voiceMessage}
          onDismiss={dismissVoiceMessage}
        />

        <ActionToast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    </MotionConfig>
  );
}
