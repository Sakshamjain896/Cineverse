import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  CircleUserRound,
  Clapperboard,
  Clock3,
  Compass,
  Film,
  Heart,
  LockKeyhole,
  LogOut,
  Mail,
  Mic,
  MicOff,
  Moon,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  UserRound,
  Volume2,
  X,
} from "lucide-react";

/* --------------------------------------------------
   STORAGE
-------------------------------------------------- */

const STORAGE_KEYS = {
  theme: "cineverse-theme",
  user: "cineverse-user",
  saved: "cineverse-saved",
  profile: "cineverse-profile",
};

function readStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app remains usable if browser storage is unavailable.
  }
}

/* --------------------------------------------------
   MOVIE CATALOG
-------------------------------------------------- */

const MOVIES = [
  {
    id: 1,
    title: "Interstellar",
    year: 2014,
    rating: "8.7",
    runtime: "2h 49m",
    genres: ["Sci-Fi", "Adventure", "Drama"],
    director: "Christopher Nolan",
    poster:
      "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    synopsis:
      "When Earth begins to fail, a former pilot joins a daring mission beyond our galaxy to find a future for humanity. A vast, emotional journey through time, space, and the bonds that connect us.",
    moods: ["Mind-bending", "Feel something", "Big-screen spectacle"],
    featured: true,
    label: "THE HUMAN SPIRIT, INFINITELY",
  },
  {
    id: 2,
    title: "Dune: Part Two",
    year: 2024,
    rating: "8.5",
    runtime: "2h 46m",
    genres: ["Sci-Fi", "Adventure", "Drama"],
    director: "Denis Villeneuve",
    poster:
      "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    synopsis:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Destiny, politics, and survival collide across the sands of Arrakis.",
    moods: ["Dark & intense", "Big-screen spectacle"],
    featured: true,
    label: "FATE IS WRITTEN IN SAND",
  },
  {
    id: 3,
    title: "Blade Runner 2049",
    year: 2017,
    rating: "8.0",
    runtime: "2h 44m",
    genres: ["Sci-Fi", "Mystery", "Thriller"],
    director: "Denis Villeneuve",
    poster:
      "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/sAtoMqDVhNDQBc3QJL3RF6hlhGq.jpg",
    synopsis:
      "A young blade runner uncovers a buried secret that could destabilize what remains of society. His search pulls him into the past and forces him to question what makes someone real.",
    moods: ["Mind-bending", "Dark & intense"],
    featured: true,
    label: "WHAT MAKES US HUMAN?",
  },
  {
    id: 4,
    title: "Inception",
    year: 2010,
    rating: "8.8",
    runtime: "2h 28m",
    genres: ["Sci-Fi", "Action", "Thriller"],
    director: "Christopher Nolan",
    poster:
      "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    synopsis:
      "A skilled thief who steals secrets through dreams is offered a chance at redemption, but his final job may be impossible. The deeper the team goes, the less certain reality becomes.",
    moods: ["Mind-bending", "Dark & intense"],
    featured: true,
    label: "YOUR MIND IS THE SCENE",
  },
  {
    id: 5,
    title: "The Batman",
    year: 2022,
    rating: "7.8",
    runtime: "2h 56m",
    genres: ["Crime", "Mystery", "Action"],
    director: "Matt Reeves",
    poster:
      "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
    synopsis:
      "A relentless detective follows a trail of cryptic clues through Gotham's corruption. Each answer reveals another layer of a city that has learned to live in darkness.",
    moods: ["Dark & intense"],
  },
  {
    id: 6,
    title: "Oppenheimer",
    year: 2023,
    rating: "8.3",
    runtime: "3h 00m",
    genres: ["Drama", "Biography", "History"],
    director: "Christopher Nolan",
    poster:
      "https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    synopsis:
      "The story of J. Robert Oppenheimer and the scientific, political, and personal choices surrounding the creation of the atomic bomb. A portrait of invention and consequence.",
    moods: ["Feel something", "Dark & intense"],
  },
  {
    id: 7,
    title: "Arrival",
    year: 2016,
    rating: "7.9",
    runtime: "1h 56m",
    genres: ["Sci-Fi", "Drama", "Mystery"],
    director: "Denis Villeneuve",
    poster:
      "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/yIZ1xendyqKvY3FGeeUYUd5X9Mm.jpg",
    synopsis:
      "When mysterious spacecraft arrive around the world, a linguist is recruited to decipher their language before fear pushes humanity toward conflict. Communication changes everything.",
    moods: ["Mind-bending", "Feel something"],
  },
  {
    id: 8,
    title: "Spider-Man: Across the Spider-Verse",
    year: 2023,
    rating: "8.6",
    runtime: "2h 20m",
    genres: ["Animation", "Action", "Adventure"],
    director: "Joaquim Dos Santos",
    poster:
      "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
    synopsis:
      "Miles Morales reunites with Gwen Stacy and is pulled into a multiverse of Spider-People. His biggest challenge is deciding what kind of hero he wants to become.",
    moods: ["Big-screen spectacle", "Easy watch"],
  },
  {
    id: 9,
    title: "Whiplash",
    year: 2014,
    rating: "8.5",
    runtime: "1h 47m",
    genres: ["Drama", "Music"],
    director: "Damien Chazelle",
    poster:
      "https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/fRGxZuo7jJUWQsVg9PREb98Aclp.jpg",
    synopsis:
      "An ambitious young drummer enters a punishing conservatory where a ruthless instructor pushes talent toward obsession. Every beat becomes a test of how much excellence costs.",
    moods: ["Dark & intense", "Feel something"],
  },
  {
    id: 10,
    title: "Parasite",
    year: 2019,
    rating: "8.5",
    runtime: "2h 12m",
    genres: ["Thriller", "Drama", "Comedy"],
    director: "Bong Joon-ho",
    poster:
      "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg",
    synopsis:
      "A cash-strapped family finds a way into the life of a wealthy household. Their clever arrangement grows increasingly unstable, turning social satire into a tense, unpredictable thriller.",
    moods: ["Mind-bending", "Dark & intense"],
  },
  {
    id: 11,
    title: "Everything Everywhere All at Once",
    year: 2022,
    rating: "7.8",
    runtime: "2h 20m",
    genres: ["Sci-Fi", "Action", "Comedy"],
    director: "Daniel Kwan",
    poster:
      "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg",
    synopsis:
      "An exhausted laundromat owner is swept into a multiverse-spanning adventure where the fate of existence rests on the person she least expected: herself.",
    moods: ["Mind-bending", "Feel something", "Easy watch"],
  },
  {
    id: 12,
    title: "The Grand Budapest Hotel",
    year: 2014,
    rating: "8.1",
    runtime: "1h 40m",
    genres: ["Comedy", "Adventure", "Drama"],
    director: "Wes Anderson",
    poster:
      "https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
    backdrop:
      "https://image.tmdb.org/t/p/w1280/nX5XotM9yprCKarRH4fzOq1VM1J.jpg",
    synopsis:
      "A legendary concierge and his young protégé become tangled in a stolen painting, a family fortune, and the changing world around their beloved European hotel.",
    moods: ["Easy watch", "Feel something"],
  },
];

const FEATURED_MOVIES = MOVIES.filter((movie) => movie.featured);

const GENRES = [
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
  },
  {
    name: "Feel something",
    description: "A little closer to the heart",
  },
  {
    name: "Dark & intense",
    description: "Enter the shadows",
  },
  {
    name: "Big-screen spectacle",
    description: "Go wonderfully oversized",
  },
  {
    name: "Easy watch",
    description: "Let the day slow down",
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

function findMovieByTitle(query = "") {
  const normalizedQuery = normalizeMovieTitle(query);

  if (!normalizedQuery) return null;

  // Exact title match.
  const exactMatch = MOVIES.find(
    (movie) =>
      normalizeMovieTitle(movie.title) === normalizedQuery,
  );

  if (exactMatch) return exactMatch;

  // Title starts with the spoken words.
  const startsWithMatch = MOVIES.find((movie) =>
    normalizeMovieTitle(movie.title).startsWith(normalizedQuery),
  );

  if (startsWithMatch) return startsWithMatch;

  // Full spoken phrase appears inside the title.
  const containsMatch = MOVIES.find((movie) =>
    normalizeMovieTitle(movie.title).includes(normalizedQuery),
  );

  if (containsMatch) return containsMatch;

  // Handle title words spoken with small gaps or punctuation differences.
  const queryWords = normalizedQuery.split(" ").filter(Boolean);

  if (queryWords.length > 1) {
    const wordsMatch = MOVIES.find((movie) => {
      const normalizedTitle = normalizeMovieTitle(movie.title);
      return queryWords.every((word) =>
        normalizedTitle.includes(word),
      );
    });

    if (wordsMatch) return wordsMatch;
  }

  return null;
}

/* --------------------------------------------------
   THEME CSS
-------------------------------------------------- */

const THEME_CSS = `
  .cv-shell {
    min-height: 100vh;
    background: #090a0b;
    color: #f1eee8;
    transition: background-color .35s ease, color .35s ease;
  }

  .cv-header-surface {
    background: rgba(9,10,11,.76);
    border-color: rgba(255,255,255,.08);
  }

  .cv-panel-surface {
    background: rgba(19,20,22,.82);
    border-color: rgba(255,255,255,.09);
  }

  .cv-quiet-text {
    color: #92908a;
  }

  .cv-hairline {
    border-color: rgba(255,255,255,.1);
  }

  .cv-pill {
    background: rgba(255,255,255,.045);
    border-color: rgba(255,255,255,.11);
    color: #dedbd4;
  }

  .cv-input {
    background: rgba(255,255,255,.055);
    border: 1px solid rgba(255,255,255,.12);
    color: inherit;
  }

  .cv-input::placeholder {
    color: #85837e;
  }

  .cv-gold-button {
    background: #d9b77b;
    color: #17130d;
  }

  .cv-shell [data-movie-title] {
    color: #f1eee8;
  }

  [data-theme="light"] .cv-shell {
    background: #f3eee5 !important;
    color: #29231d !important;
  }

  [data-theme="light"] .cv-shell .cv-header-surface {
    background: rgba(247,243,236,.88);
    border-color: rgba(58,45,30,.12);
  }

  [data-theme="light"] .cv-shell .cv-panel-surface {
    background: rgba(255,252,246,.88);
    border-color: rgba(58,45,30,.13);
  }

  [data-theme="light"] .cv-shell .cv-quiet-text {
    color: #71695f;
  }

  [data-theme="light"] .cv-shell .cv-hairline {
    border-color: rgba(58,45,30,.15);
  }

  [data-theme="light"] .cv-shell .cv-pill {
    background: rgba(74,58,37,.045);
    border-color: rgba(58,45,30,.14);
    color: #504537;
  }

  [data-theme="light"] .cv-shell .cv-input {
    background: rgba(255,255,255,.78);
    border-color: rgba(58,45,30,.16);
    color: #29231d;
  }

  [data-theme="light"] .cv-shell .cv-input::placeholder {
    color: #8b8174;
  }

  [data-theme="light"] .cv-shell [data-movie-title] {
    color: #29231d;
  }

  [data-theme="light"] .cv-shell .cv-theme-panel {
    background: rgba(255,252,246,.94) !important;
    border-color: rgba(58,45,30,.14) !important;
    color: #29231d !important;
  }

  [data-theme="light"] .cv-shell .cv-theme-panel .cv-quiet-text {
    color: #71695f;
  }

  .cv-no-scrollbar {
    scrollbar-width: none;
  }

  .cv-no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  @keyframes cv-mic-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(217,183,123,.35);
    }
    50% {
      box-shadow: 0 0 0 7px rgba(217,183,123,0);
    }
  }

  .cv-mic-listening {
    animation: cv-mic-pulse 1.25s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .cv-shell *,
    .cv-shell *::before,
    .cv-shell *::after {
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

/* --------------------------------------------------
   LOGO
-------------------------------------------------- */

function Logo({ compact = false }) {
  return (
    <div className="flex select-none items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-full border border-[#d9b77b]/55 bg-[#d9b77b]/10 text-[#d9b77b]">
        <Clapperboard size={17} strokeWidth={1.5} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#d9b77b] shadow-[0_0_12px_#d9b77b]" />
      </div>

      {!compact && (
        <span className="font-brand text-[17px] font-extrabold tracking-[.19em]">
          CINE<span className="text-[#d9b77b]">VERSE</span>
        </span>
      )}
    </div>
  );
}

/* --------------------------------------------------
   DYNAMIC MIC BUTTON
-------------------------------------------------- */

function VoiceSearchButton({
  status,
  onClick,
  compact = false,
}) {
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
      aria-label={
        isListening
          ? "Stop voice search"
          : "Start voice search"
      }
      className={`relative grid shrink-0 place-items-center rounded-full transition-all duration-200 ${compact ? "h-8 w-8" : "h-9 w-9"
        } ${isListening
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
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Search size={compact ? 15 : 17} />
        </motion.span>
      ) : (
        <Mic size={compact ? 15 : 17} />
      )}
    </button>
  );
}

/* --------------------------------------------------
   VOICE STATUS TOAST
-------------------------------------------------- */

function VoiceStatusToast({
  status,
  message,
  onDismiss,
}) {
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
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isFound
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

          <p className="mt-1 text-sm leading-5 text-white/90">
            {message}
          </p>

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
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="cv-header-surface sticky top-0 z-40 border-b backdrop-blur-2xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          aria-label="Cineverse home"
          className="shrink-0"
        >
          <Logo />
        </button>

        <nav className="hidden items-center gap-8 md:flex">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className={`text-sm transition-colors ${page === "home"
                ? "text-[#d9b77b]"
                : "cv-quiet-text hover:text-current"
              }`}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => onNavigate("discover")}
            className={`text-sm transition-colors ${page === "discover"
                ? "text-[#d9b77b]"
                : "cv-quiet-text hover:text-current"
              }`}
          >
            Discover
          </button>

          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className="cv-quiet-text text-sm transition-colors hover:text-current"
          >
            My watchlist
          </button>
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Desktop search + microphone */}
          <div className="cv-input hidden h-10 w-52 items-center gap-1 rounded-full pl-3.5 pr-1 lg:flex xl:w-64">
            <Search size={16} className="cv-quiet-text shrink-0" />

            <input
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
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label="Toggle search"
            className="cv-quiet-text grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/5 hover:text-current lg:hidden"
          >
            <Search size={18} />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"
              } theme`}
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
        </div>
      </div>

      {/* Mobile search panel */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 px-5 pb-4 pt-3 lg:hidden"
          >
            <div className="cv-input flex h-11 items-center gap-2 rounded-full px-3">
              <Search size={16} className="cv-quiet-text shrink-0" />

              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                onFocus={() => onNavigate("discover", false)}
                placeholder="Search films, genres, moods..."
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
   SECTION HEADING
-------------------------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  onAction,
}) {
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

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: 0.42,
        delay: Math.min(index * 0.035, 0.2),
      }}
      className="group min-w-0"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-[13px] border border-white/[.08] bg-[#171719] shadow-[0_16px_38px_rgba(0,0,0,.18)]">
        {!imageFailed ? (
          <img
            src={movie.poster}
            alt={`${movie.title} poster`}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.055]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#34302b] via-[#151517] to-[#111] p-4 text-center">
            <Film size={28} className="text-[#d9b77b]/70" />
            <span className="font-display text-xl">{movie.title}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/15 opacity-90 transition-opacity group-hover:opacity-100" />

        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] text-white backdrop-blur-md">
          <Star size={11} className="fill-[#d9b77b] text-[#d9b77b]" />
          {movie.rating}
        </div>

        <button
          type="button"
          aria-label={
            isSaved
              ? `Remove ${movie.title} from watchlist`
              : `Save ${movie.title}`
          }
          onClick={(event) => {
            event.stopPropagation();
            onToggleSave(movie.id);
          }}
          className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-md transition ${isSaved
              ? "border-[#d9b77b]/60 bg-[#d9b77b] text-[#17130d]"
              : "border-white/20 bg-black/40 text-white hover:bg-black/70"
            }`}
        >
          {isSaved ? <Check size={15} /> : <Bookmark size={15} />}
        </button>

        <button
          type="button"
          onClick={() => onOpen(movie)}
          className="absolute inset-0 flex items-end p-3 text-left sm:p-4"
          aria-label={`View details for ${movie.title}`}
        >
          <span className="flex w-full items-center justify-between gap-2">
            <span className="min-w-0">
              <span
                data-movie-title
                className="block truncate font-brand text-sm font-bold text-white sm:text-base"
              >
                {movie.title}
              </span>

              <span className="mt-1 block text-[11px] text-white/70">
                {movie.year} <span className="mx-1">·</span>{" "}
                {movie.genres[0]}
              </span>
            </span>

            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/35 bg-white/10 text-white backdrop-blur transition group-hover:border-[#d9b77b] group-hover:bg-[#d9b77b] group-hover:text-[#17130d]">
              <Play size={13} fill="currentColor" />
            </span>
          </span>
        </button>
      </div>
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
  onOpen,
  savedMovies,
  onToggleSave,
  onAction,
  action = "Explore collection",
}) {
  if (!movies.length) return null;

  return (
    <section className="mb-14">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        action={action}
        onAction={onAction}
      />

      <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {movies.map((movie, index) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            index={index}
            onOpen={onOpen}
            isSaved={savedMovies.includes(movie.id)}
            onToggleSave={onToggleSave}
          />
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------
   HERO CAROUSEL
-------------------------------------------------- */

function HeroCarousel({ onOpenMovie, onDiscover }) {
  const [heroIndex, setHeroIndex] = useState(0);
  const featured = FEATURED_MOVIES[heroIndex] || FEATURED_MOVIES[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex(
        (current) => (current + 1) % FEATURED_MOVIES.length,
      );
    }, 8000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative isolate min-h-[590px] overflow-hidden sm:min-h-[650px] lg:min-h-[700px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={featured.id}
          initial={{ opacity: 0, scale: 1.035 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute inset-0 -z-20"
        >
          <img
            src={featured.backdrop || featured.poster}
            alt=""
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = featured.poster;
            }}
            className="h-full w-full object-cover object-center"
          />
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

            <p className="mb-4 text-[11px] font-medium uppercase tracking-[.26em] text-white/65">
              {featured.label}
            </p>

            <h1 className="max-w-[620px] font-display text-5xl leading-[.98] tracking-[-.035em] text-white sm:text-6xl lg:text-[82px]">
              {featured.title === "Blade Runner 2049" ? (
                <>
                  Blade Runner{" "}
                  <span className="italic text-[#d9b77b]">2049</span>
                </>
              ) : featured.title === "Dune: Part Two" ? (
                <>
                  Dune:{" "}
                  <span className="italic text-[#d9b77b]">Part Two</span>
                </>
              ) : featured.title === "Inception" ? (
                <>
                  Enter the{" "}
                  <span className="italic text-[#d9b77b]">dream.</span>
                </>
              ) : (
                <>
                  Inter
                  <span className="italic text-[#d9b77b]">stellar.</span>
                </>
              )}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/75">
              <span>{featured.year}</span>
              <span className="h-1 w-1 rounded-full bg-[#d9b77b]" />

              <span className="flex items-center gap-1">
                <Star
                  size={12}
                  className="fill-[#d9b77b] text-[#d9b77b]"
                />
                {featured.rating} / 10
              </span>

              <span className="h-1 w-1 rounded-full bg-[#d9b77b]" />
              <span>{featured.runtime}</span>
            </div>

            <p className="mt-5 max-w-[510px] text-sm leading-7 text-white/70 sm:text-[15px]">
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
          {FEATURED_MOVIES.map((movie, index) => (
            <button
              type="button"
              aria-label={`Show ${movie.title}`}
              key={movie.id}
              onClick={() => setHeroIndex(index)}
              className={`relative h-[3px] overflow-hidden rounded-full transition-all ${index === heroIndex
                  ? "w-12 bg-white/25"
                  : "w-5 bg-white/25 hover:bg-white/50"
                }`}
            >
              {index === heroIndex && (
                <motion.span
                  key={movie.id}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 8, ease: "linear" }}
                  className="absolute inset-0 origin-left bg-[#d9b77b]"
                />
              )}
            </button>
          ))}

          <span className="ml-2 text-[10px] tracking-[.18em] text-white/55">
            0{heroIndex + 1}{" "}
            <span className="mx-1 text-white/25">/</span>{" "}
            0{FEATURED_MOVIES.length}
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
              className={`group relative min-h-[142px] overflow-hidden rounded-2xl border p-5 text-left transition duration-300 ${active
                  ? "border-[#d9b77b]/65 bg-[#d9b77b]/[.12]"
                  : "cv-panel-surface hover:border-[#d9b77b]/35 hover:bg-white/[.04]"
                }`}
            >
              <span
                className={`mb-7 grid h-9 w-9 place-items-center rounded-xl border transition ${active
                    ? "border-[#d9b77b]/50 bg-[#d9b77b]/15 text-[#d9b77b]"
                    : "border-white/10 bg-white/[.04] text-white/65 group-hover:text-[#d9b77b]"
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

              <span className="block text-sm font-semibold">
                {mood.name}
              </span>

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
  search,
  onSearchChange,
  activeGenre,
  onGenreChange,
  activeMood,
  onMoodChange,
  onOpenMovie,
  savedMovies,
  onToggleSave,
  onClearFilters,
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
            Curated stories, cult favourites, and films worth staying up for.
          </p>
        </div>

        {/* Discover search + voice search */}
        <div className="cv-input flex h-12 w-full items-center gap-2 rounded-full px-3 md:max-w-[380px]">
          <Search size={17} className="cv-quiet-text ml-1 shrink-0" />

          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Title, genre, director..."
            aria-label="Search the movie catalog"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />

          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="cv-quiet-text grid h-8 w-8 shrink-0 place-items-center"
            >
              <X size={15} />
            </button>
          )}

          <VoiceSearchButton
            status={voiceStatus}
            onClick={onVoiceSearch}
          />
        </div>
      </div>

      <div className="cv-hairline mb-8 border-y py-5">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-[#d9b77b]">
          <SlidersHorizontal size={13} />
          Browse by genre
        </div>

        <div className="cv-no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {GENRES.map((genre) => (
            <button
              type="button"
              key={genre}
              onClick={() => onGenreChange(genre)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs transition ${activeGenre === genre
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
                onMoodChange(
                  activeMood === mood.name ? "" : mood.name,
                )
              }
              className={`rounded-full border px-3 py-1.5 text-[11px] transition ${activeMood === mood.name
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
            {movies.length}
          </span>{" "}
          films to explore
        </p>

        <span className="cv-quiet-text hidden items-center gap-1.5 text-xs sm:flex">
          <Sparkles size={13} className="text-[#d9b77b]" />
          Curated for curious minds
        </span>
      </div>

      {movies.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {movies.map((movie, index) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              index={index}
              onOpen={onOpenMovie}
              isSaved={savedMovies.includes(movie.id)}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      ) : (
        <div className="cv-panel-surface flex min-h-[300px] flex-col items-center justify-center rounded-3xl border p-8 text-center">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[#d9b77b]/25 bg-[#d9b77b]/10 text-[#d9b77b]">
            <Film size={23} />
          </div>

          <h2 className="font-display text-2xl">
            Nothing on this reel. Yet.
          </h2>

          <p className="cv-quiet-text mt-2 max-w-sm text-sm leading-6">
            Try a different title, genre, or mood. The perfect film may
            simply be hiding.
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
   AUTH PAGE
-------------------------------------------------- */

function AuthPage({ onSuccess, onBack }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password to continue.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }

    const fallbackName = email
      .trim()
      .split("@")[0]
      .replace(/[._-]+/g, " ");

    onSuccess({
      name:
        mode === "signup" && name.trim()
          ? name.trim()
          : fallbackName,
      email: email.trim().toLowerCase(),
    });
  }

  return (
    <main className="relative mx-auto grid min-h-[calc(100vh-76px)] max-w-[1440px] items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:py-16">
      <div className="relative hidden min-h-[520px] overflow-hidden rounded-[28px] border border-white/10 bg-[#121214] lg:block">
        <img
          src="https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg"
          alt="Stars in deep space"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0b] via-[#090a0b]/25 to-[#090a0b]/15" />

        <div className="absolute bottom-0 left-0 right-0 p-10 xl:p-14">
          <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[.28em] text-[#d9b77b]">
            <Sparkles size={13} />
            For the love of the story
          </div>

          <h1 className="max-w-lg font-display text-5xl leading-[1.05] text-white xl:text-6xl">
            Every great film leaves a{" "}
            <span className="italic text-[#d9b77b]">
              little universe
            </span>{" "}
            behind.
          </h1>

          <p className="mt-5 max-w-md text-sm leading-7 text-white/65">
            Save the films you love. Find the ones you missed. Make your
            next watch count.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[440px]">
        <button
          type="button"
          onClick={onBack}
          className="cv-quiet-text mb-9 flex items-center gap-2 text-xs transition hover:text-current"
        >
          <ArrowLeft size={14} />
          Back to Cineverse
        </button>

        <div className="mb-8">
          <Logo />

          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[.28em] text-[#d9b77b]">
            Your seat is waiting
          </p>

          <h2 className="mt-3 font-display text-4xl">
            {mode === "login" ? "Welcome back." : "Join the story."}
          </h2>

          <p className="cv-quiet-text mt-3 text-sm leading-6">
            {mode === "login"
              ? "Pick up where your film journey left off."
              : "Build a watchlist that feels unmistakably yours."}
          </p>
        </div>

        <div className="cv-panel-surface mb-6 grid grid-cols-2 rounded-full border p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`rounded-full py-2.5 text-sm transition ${mode === "login"
                ? "bg-[#d9b77b] font-semibold text-[#17130d]"
                : "cv-quiet-text"
              }`}
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`rounded-full py-2.5 text-sm transition ${mode === "signup"
                ? "bg-[#d9b77b] font-semibold text-[#17130d]"
                : "cv-quiet-text"
              }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="cv-quiet-text mb-2 block text-xs">
                Your name
              </span>

              <span className="cv-input flex h-12 items-center gap-3 rounded-xl px-4">
                <UserRound size={16} className="cv-quiet-text" />

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="How should we call you?"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  autoComplete="name"
                />
              </span>
            </label>
          )}

          <label className="block">
            <span className="cv-quiet-text mb-2 block text-xs">
              Email address
            </span>

            <span className="cv-input flex h-12 items-center gap-3 rounded-xl px-4">
              <Mail size={16} className="cv-quiet-text" />

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                autoComplete="email"
              />
            </span>
          </label>

          <label className="block">
            <span className="cv-quiet-text mb-2 block text-xs">
              Password
            </span>

            <span className="cv-input flex h-12 items-center gap-3 rounded-xl px-4">
              <LockKeyhole size={16} className="cv-quiet-text" />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === "signup"
                    ? "At least 6 characters"
                    : "Your password"
                }
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                autoComplete={
                  mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
              />

              <button
                type="button"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                onClick={() => setShowPassword((show) => !show)}
                className="cv-quiet-text"
              >
                <span className="text-[11px]">
                  {showPassword ? "Hide" : "Show"}
                </span>
              </button>
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-400/20 bg-red-400/[.08] px-3 py-2 text-xs text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="cv-gold-button group flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition hover:bg-[#f0d6a3]"
          >
            {mode === "login"
              ? "Sign in to Cineverse"
              : "Create my account"}

            <ArrowRight
              size={15}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
        </form>

        <p className="cv-quiet-text mt-5 text-center text-[11px] leading-5">
          Demo account UI only. Connect a real authentication backend
          before using it with real credentials.
        </p>
      </div>
    </main>
  );
}

/* --------------------------------------------------
   PROFILE PAGE
-------------------------------------------------- */

function ProfilePage({
  user,
  savedMovies,
  movies,
  onSaveProfile,
  onLogout,
  onDiscover,
  onOpenMovie,
  onToggleSave,
}) {
  const [name, setName] = useState(user?.name || "Film lover");

  const [selectedGenres, setSelectedGenres] = useState(
    () =>
      readStorage(STORAGE_KEYS.profile, {
        genres: ["Sci-Fi", "Drama"],
      }).genres || ["Sci-Fi", "Drama"],
  );

  const [savedMessage, setSavedMessage] = useState(false);

  const watchlist = movies.filter((movie) =>
    savedMovies.includes(movie.id),
  );

  const profileGenres = [
    "Sci-Fi",
    "Drama",
    "Thriller",
    "Action",
    "Adventure",
    "Mystery",
    "Crime",
    "Animation",
    "Comedy",
    "Biography",
  ];

  function saveProfile(event) {
    event.preventDefault();

    onSaveProfile(
      {
        name: name.trim() || "Film lover",
        email: user?.email || "",
      },
      selectedGenres,
    );

    setSavedMessage(true);
    window.setTimeout(() => setSavedMessage(false), 2200);
  }

  function toggleGenre(genre) {
    setSelectedGenres((current) =>
      current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre],
    );
  }

  return (
    <main className="mx-auto min-h-[80vh] max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.3em] text-[#d9b77b]">
            Your corner of cinema
          </p>

          <h1 className="font-display text-5xl sm:text-6xl">
            The <span className="italic text-[#d9b77b]">film room.</span>
          </h1>

          <p className="cv-quiet-text mt-3 text-sm">
            Your profile, your taste, your next great watch.
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="cv-quiet-text flex items-center gap-2 self-start rounded-full border border-white/10 px-4 py-2.5 text-xs transition hover:border-red-300/30 hover:text-red-300 sm:self-auto"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <section className="cv-panel-surface cv-theme-panel rounded-3xl border p-6 sm:p-8">
          <div className="mb-7 flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[#d9b77b]/30 bg-[#d9b77b]/10 text-[#d9b77b]">
              <CircleUserRound size={31} strokeWidth={1.3} />
            </div>

            <div className="min-w-0">
              <h2 className="truncate font-display text-2xl">
                {name || "Film lover"}
              </h2>

              <p className="cv-quiet-text mt-1 truncate text-xs">
                {user?.email}
              </p>
            </div>
          </div>

          <form onSubmit={saveProfile}>
            <label className="cv-quiet-text mb-2 block text-xs">
              Display name
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
              className="cv-input mb-6 h-11 w-full rounded-xl px-3 text-sm outline-none"
            />

            <p className="cv-quiet-text mb-3 text-xs">
              Your favourite genres
            </p>

            <div className="mb-7 flex flex-wrap gap-2">
              {profileGenres.map((genre) => (
                <button
                  type="button"
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`rounded-full border px-3 py-2 text-xs transition ${selectedGenres.includes(genre)
                      ? "border-[#d9b77b]/55 bg-[#d9b77b]/15 text-[#d9b77b]"
                      : "cv-pill"
                    }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="cv-gold-button flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition hover:bg-[#f0d6a3]"
            >
              {savedMessage ? (
                <>
                  <Check size={15} />
                  Saved
                </>
              ) : (
                "Save preferences"
              )}
            </button>
          </form>
        </section>

        <section className="cv-panel-surface cv-theme-panel rounded-3xl border p-6 sm:p-8">
          <div className="mb-7 flex items-end justify-between gap-3">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[.26em] text-[#d9b77b]">
                Saved for later
              </p>

              <h2 className="font-display text-3xl">Your watchlist</h2>
            </div>

            <span className="cv-quiet-text text-xs">
              {watchlist.length}{" "}
              {watchlist.length === 1 ? "film" : "films"}
            </span>
          </div>

          {watchlist.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {watchlist.slice(0, 6).map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onOpen={onOpenMovie}
                  isSaved={savedMovies.includes(movie.id)}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[235px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 p-6 text-center">
              <Bookmark
                size={25}
                className="mb-4 text-[#d9b77b]"
              />

              <h3 className="font-display text-xl">
                Keep the good ones close.
              </h3>

              <p className="cv-quiet-text mt-2 max-w-sm text-xs leading-5">
                Save films while exploring and they will be waiting here
                when movie night arrives.
              </p>

              <button
                type="button"
                onClick={onDiscover}
                className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#d9b77b]"
              >
                Explore films <ArrowRight size={13} />
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* --------------------------------------------------
   MOVIE DETAILS MODAL
-------------------------------------------------- */

function MovieModal({
  movie,
  onClose,
  isSaved,
  onToggleSave,
}) {
  useEffect(() => {
    if (!movie) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movie, onClose]);

  return (
    <AnimatePresence>
      {movie && (
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
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${movie.title} details`}
            className="cv-theme-panel relative my-auto w-full max-w-4xl overflow-hidden rounded-[24px] border border-white/10 bg-[#111214] shadow-2xl"
          >
            <div className="relative h-[240px] sm:h-[330px]">
              <img
                src={movie.backdrop || movie.poster}
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = movie.poster;
                }}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#111214] via-black/25 to-black/15" />

              <button
                type="button"
                onClick={onClose}
                aria-label="Close movie details"
                className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/70"
              >
                <X size={18} />
              </button>

              <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-8 sm:right-8">
                <p className="mb-2 text-[10px] uppercase tracking-[.25em] text-[#f0d6a3]">
                  Cineverse selection
                </p>

                <h2 className="font-display text-4xl text-white sm:text-5xl">
                  {movie.title}
                </h2>
              </div>
            </div>

            <div className="grid gap-7 p-5 sm:grid-cols-[1fr_240px] sm:p-8">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/65">
                  <span className="flex items-center gap-1.5 text-[#d9b77b]">
                    <Star size={13} className="fill-current" />
                    {movie.rating} / 10
                  </span>

                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={13} />
                    {movie.year}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Clock3 size={13} />
                    {movie.runtime}
                  </span>
                </div>

                <p className="max-w-2xl text-sm leading-7 text-white/75">
                  {movie.synopsis}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[11px] text-white/70"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              <aside className="cv-theme-panel rounded-2xl border border-white/10 bg-white/[.025] p-5">
                <p className="cv-quiet-text text-[10px] uppercase tracking-[.2em]">
                  Directed by
                </p>

                <p className="mt-2 text-sm font-semibold">
                  {movie.director || "Not listed"}
                </p>

                <div className="cv-hairline my-5 border-t" />

                <button
                  type="button"
                  onClick={() => onToggleSave(movie.id)}
                  className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${isSaved
                      ? "border-[#d9b77b]/50 bg-[#d9b77b] text-[#17130d]"
                      : "border-white/15 hover:border-[#d9b77b]/55 hover:text-[#d9b77b]"
                    }`}
                >
                  {isSaved ? (
                    <>
                      <Check size={14} />
                      In your watchlist
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} />
                      Add to watchlist
                    </>
                  )}
                </button>

                <p className="cv-quiet-text mt-3 text-[10px] leading-5">
                  Your saved films stay in this browser on this device.
                </p>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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

          <span>Made for curious movie minds</span>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------------------------------
   MAIN APP
-------------------------------------------------- */

export default function App() {
  const [page, setPage] = useState("home");

  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";

    const saved = window.localStorage.getItem(STORAGE_KEYS.theme);
    return saved === "light" ? "light" : "dark";
  });

  const [search, setSearch] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [activeMood, setActiveMood] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);

  const [savedMovies, setSavedMovies] = useState(() =>
    readStorage(STORAGE_KEYS.saved, []),
  );

  const [currentUser, setCurrentUser] = useState(() =>
    readStorage(STORAGE_KEYS.user, null),
  );

  /* Voice search state */
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceQuery, setVoiceQuery] = useState("");
  const [voiceFoundTitle, setVoiceFoundTitle] = useState("");

  const recognitionRef = useRef(null);
  const voiceResultTimerRef = useRef(null);

  /* Theme updates */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  /* Keep watchlist in local storage */
  useEffect(() => {
    writeStorage(STORAGE_KEYS.saved, savedMovies);
  }, [savedMovies]);

  /* Clean up voice resources on unmount */
  useEffect(() => {
    return () => {
      if (voiceResultTimerRef.current) {
        window.clearTimeout(voiceResultTimerRef.current);
      }

      try {
        recognitionRef.current?.stop();
      } catch {
        // Recognition may already have stopped.
      }

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const isLoggedIn = Boolean(currentUser?.email);

  /* --------------------------------------------------
     TEXT-TO-SPEECH
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

  /* --------------------------------------------------
     VOICE SEARCH RESULT HANDLER
  -------------------------------------------------- */

  function processVoiceQuery(transcript) {
    const cleanedQuery = cleanVoiceQuery(transcript);
    const finalQuery = cleanedQuery || transcript.trim();

    if (!finalQuery) {
      setVoiceStatus("error");
      setVoiceMessage("I couldn't hear a movie title. Please try again.");
      speakMessage("I couldn't hear a movie title. Please try again.", true);
      return;
    }

    setVoiceQuery(finalQuery);
    setVoiceFoundTitle("");
    setVoiceMessage(`Searching for "${finalQuery}"...`);
    setVoiceStatus("searching");

    setSearch(finalQuery);
    setActiveGenre("All");
    setActiveMood("");
    setPage("discover");

    // Give the Searching message time to be heard before the result.
    speakMessage("Searching", true);

    if (voiceResultTimerRef.current) {
      window.clearTimeout(voiceResultTimerRef.current);
    }

    voiceResultTimerRef.current = window.setTimeout(() => {
      const foundMovie = findMovieByTitle(finalQuery);

      if (foundMovie) {
        setSearch(foundMovie.title);
        setVoiceFoundTitle(foundMovie.title);
        setVoiceMessage(`Found this movie: ${foundMovie.title}`);
        setVoiceStatus("found");

        // Show the selected movie's details automatically.
        setSelectedMovie(foundMovie);

        speakMessage(`Found this movie: ${foundMovie.title}`);
      } else {
        setSelectedMovie(null);
        setVoiceMessage(
          `Not Found. "${finalQuery}" isn't in the current Cineverse catalog.`,
        );
        setVoiceStatus("not-found");

        speakMessage("Not Found");
      }
    }, 850);
  }

  /* --------------------------------------------------
     START / STOP SPEECH RECOGNITION
  -------------------------------------------------- */

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
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatus("unsupported");
      setVoiceMessage(
        "Voice search isn't supported by this browser. Try the latest version of Chrome or use text search.",
      );

      speakMessage(
        "Voice search is not supported by this browser.",
        true,
      );

      return;
    }

    // Cancel an older unfinished result when starting a new search.
    if (voiceResultTimerRef.current) {
      window.clearTimeout(voiceResultTimerRef.current);
      voiceResultTimerRef.current = null;
    }

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
      setVoiceFoundTitle("");

      recognition.onstart = () => {
        setVoiceStatus("listening");
        setVoiceMessage("Listening. Say the name of a movie.");
      };

      recognition.onresult = (event) => {
        const transcript =
          event.results?.[0]?.[0]?.transcript || "";

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

        // Do not replace Searching / Found / Not Found with idle.
        setVoiceStatus((current) =>
          current === "listening" ? "idle" : current,
        );
      };

      recognition.start();
    } catch (error) {
      console.error("Voice search could not start:", error);

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
     FILTERED MOVIES
  -------------------------------------------------- */

  const filteredMovies = useMemo(() => {
    // If voice search explicitly reported no matching title,
    // display an empty result instead of unrelated catalog matches.
    if (
      voiceStatus === "not-found" &&
      normalizeMovieTitle(search) === normalizeMovieTitle(voiceQuery)
    ) {
      return [];
    }

    const normalizedSearch = search.trim().toLowerCase();

    return MOVIES.filter((movie) => {
      const matchesGenre =
        activeGenre === "All" || movie.genres.includes(activeGenre);

      const matchesMood =
        !activeMood || movie.moods?.includes(activeMood);

      const searchableText = [
        movie.title,
        movie.director,
        movie.synopsis,
        ...movie.genres,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesGenre && matchesMood && matchesSearch;
    });
  }, [
    activeGenre,
    activeMood,
    search,
    voiceStatus,
    voiceQuery,
  ]);

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
    setPage("discover");
    setActiveGenre("All");
    setActiveMood("");
    setSearch("");
    setVoiceStatus("idle");
    setVoiceMessage("");

    requestAnimationFrame(() => {
      document.getElementById("discover")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function navigate(destination, resetSearch = true) {
    if (destination === "discover") {
      if (resetSearch) {
        openDiscover();
      } else {
        setPage("discover");

        requestAnimationFrame(() => {
          document.getElementById("discover")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }

      return;
    }

    setPage(destination);

    if (destination === "home") {
      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    }
  }

  function handleSearchChange(value) {
    setSearch(value);

    // Manual typing replaces the previous voice-search result state.
    setVoiceStatus("idle");
    setVoiceMessage("");

    if (value.trim() && page !== "discover") {
      setPage("discover");
    }
  }

  function handleAccount() {
    setPage(isLoggedIn ? "profile" : "auth");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleAuthSuccess(user) {
    setCurrentUser(user);
    writeStorage(STORAGE_KEYS.user, user);

    const existingProfile = readStorage(STORAGE_KEYS.profile, {});

    writeStorage(STORAGE_KEYS.profile, {
      ...existingProfile,
      name: user.name,
    });

    setPage("profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSaveProfile(user, genres) {
    setCurrentUser(user);
    writeStorage(STORAGE_KEYS.user, user);

    writeStorage(STORAGE_KEYS.profile, {
      name: user.name,
      genres,
    });
  }

  function handleLogout() {
    setCurrentUser(null);

    try {
      window.localStorage.removeItem(STORAGE_KEYS.user);
    } catch {
      // Ignore storage errors.
    }

    setPage("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSavedMovie(movieId) {
    setSavedMovies((current) =>
      current.includes(movieId)
        ? current.filter((id) => id !== movieId)
        : [...current, movieId],
    );
  }

  const watchlistMovies = MOVIES.filter((movie) =>
    savedMovies.includes(movie.id),
  );

  const savedProfile = readStorage(STORAGE_KEYS.profile, {
    genres: ["Sci-Fi", "Drama"],
  });

  const preferredMovies = MOVIES.filter((movie) =>
    movie.genres.some((genre) =>
      (savedProfile.genres || []).includes(genre),
    ),
  );

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  return (
    <div className="cv-shell relative isolate overflow-clip font-sans">
      <style>{THEME_CSS}</style>

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
        />

        {page === "auth" && (
          <AuthPage
            onSuccess={handleAuthSuccess}
            onBack={() => navigate("home")}
          />
        )}

        {page === "profile" && (
          <ProfilePage
            user={currentUser}
            savedMovies={savedMovies}
            movies={MOVIES}
            onSaveProfile={handleSaveProfile}
            onLogout={handleLogout}
            onDiscover={openDiscover}
            onOpenMovie={setSelectedMovie}
            onToggleSave={toggleSavedMovie}
          />
        )}

        {page === "discover" && (
          <DiscoverPage
            movies={filteredMovies}
            search={search}
            onSearchChange={handleSearchChange}
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
            savedMovies={savedMovies}
            onToggleSave={toggleSavedMovie}
            onClearFilters={clearFilters}
            onVoiceSearch={startVoiceSearch}
            voiceStatus={voiceStatus}
          />
        )}

        {page === "home" && (
          <>
            <HeroCarousel
              onOpenMovie={setSelectedMovie}
              onDiscover={openDiscover}
            />

            <main className="mx-auto max-w-[1440px] px-5 pb-8 sm:px-8 lg:px-12">
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

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[.18em] text-white/45">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d9b77b]" />
                    Thoughtfully curated
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d9b77b]" />
                    Always a new perspective
                  </span>
                </div>
              </div>

              <MovieRow
                title="The films that stay with you"
                eyebrow="Hand-picked for the curious"
                movies={MOVIES.filter((movie) =>
                  [1, 4, 7, 9, 10, 11].includes(movie.id),
                )}
                onOpen={setSelectedMovie}
                savedMovies={savedMovies}
                onToggleSave={toggleSavedMovie}
                onAction={openDiscover}
                action="Explore all films"
              />

              <MoodExplorer
                activeMood={activeMood}
                onSelectMood={(mood) => {
                  setActiveMood(mood);
                  setActiveGenre("All");
                  setVoiceStatus("idle");
                  setVoiceMessage("");
                  setPage("discover");

                  requestAnimationFrame(() => {
                    document.getElementById("discover")?.scrollIntoView({
                      behavior: "smooth",
                    });
                  });
                }}
              />

              <section
                id="discover-home"
                className="scroll-mt-28 mb-16"
              >
                <SectionHeading
                  eyebrow="Find your next favourite"
                  title="The Cineverse collection"
                  subtitle="Filter by genre or dive straight into the full collection."
                  action="Open discovery"
                  onAction={openDiscover}
                />

                <div className="cv-no-scrollbar mb-7 flex gap-2 overflow-x-auto pb-1">
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => {
                        setActiveGenre(genre);
                        setActiveMood("");
                        setVoiceStatus("idle");
                        setVoiceMessage("");
                        setPage("discover");

                        requestAnimationFrame(() => {
                          document.getElementById("discover")?.scrollIntoView({
                            behavior: "smooth",
                          });
                        });
                      }}
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs transition ${activeGenre === genre
                          ? "border-[#d9b77b] bg-[#d9b77b] text-[#17130d]"
                          : "cv-pill hover:border-[#d9b77b]/45"
                        }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {MOVIES.slice(0, 6).map((movie, index) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      index={index}
                      onOpen={setSelectedMovie}
                      isSaved={savedMovies.includes(movie.id)}
                      onToggleSave={toggleSavedMovie}
                    />
                  ))}
                </div>
              </section>

              {watchlistMovies.length > 0 && (
                <MovieRow
                  title="Saved for your next movie night"
                  eyebrow="Your personal reel"
                  movies={watchlistMovies}
                  onOpen={setSelectedMovie}
                  savedMovies={savedMovies}
                  onToggleSave={toggleSavedMovie}
                  onAction={() => navigate("profile")}
                  action="Open watchlist"
                />
              )}

              {preferredMovies.length > 0 && (
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
                          Set your favourite genres in your profile to make
                          this space feel more like you.
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

      <MovieModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        isSaved={
          selectedMovie
            ? savedMovies.includes(selectedMovie.id)
            : false
        }
        onToggleSave={toggleSavedMovie}
      />

      <VoiceStatusToast
        status={voiceStatus}
        message={voiceMessage}
        onDismiss={dismissVoiceMessage}
      />
    </div>
  );
}