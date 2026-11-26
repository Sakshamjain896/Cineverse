import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  CircleUserRound,
  LogOut,
  Trash2,
} from "lucide-react";

const PROFILE_GENRES = [
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
  "Fantasy",
  "Horror",
  "Romance",
];

function formatMemberSince(createdAt) {
  if (!createdAt) return "Member";
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return "Member";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export default function ProfilePage({
  user,
  watchlistMovies,
  watchlistLoading,
  watchlistError,
  onSaveProfile,
  onLogout,
  onDeleteAccount,
  onOpenAuth,
  onDiscover,
  onOpenMovie,
  onToggleSave,
  MovieCardComponent,
}) {
  const [name, setName] = useState(user?.name || "Film lover");
  const [selectedGenres, setSelectedGenres] = useState(
    () => user?.favoriteGenres || [],
  );
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [showAllWatchlist, setShowAllWatchlist] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const visibleWatchlist = showAllWatchlist
    ? watchlistMovies
    : watchlistMovies.slice(0, 6);

  async function handleSave(event) {
    event.preventDefault();
    setProfileError("");

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setProfileError("Display name must be at least 2 characters.");
      return;
    }

    setSaving(true);
    try {
      await onSaveProfile({
        name: trimmed,
        favoriteGenres: selectedGenres,
      });
      setSavedMessage(true);
      window.setTimeout(() => setSavedMessage(false), 2200);
    } catch (err) {
      setProfileError(err?.message || "Unable to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  function toggleGenre(genre) {
    setSelectedGenres((current) =>
      current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre],
    );
  }

  async function handleConfirmDelete(event) {
    event.preventDefault();
    setDeleteError("");
    if (!deletePassword) {
      setDeleteError("Enter your password to confirm deletion.");
      return;
    }

    setDeleting(true);
    try {
      await onDeleteAccount(deletePassword);
    } catch (err) {
      setDeleteError(err?.message || "Could not delete account.");
      setDeleting(false);
    }
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

        {user ? (
          <button
            type="button"
            onClick={onLogout}
            className="cv-quiet-text cv-hairline flex items-center gap-2 self-start rounded-full border px-4 py-2.5 text-xs transition hover:border-red-400/40 hover:text-red-400 sm:self-auto"
          >
            <LogOut size={14} />
            Sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="cv-gold-button self-start rounded-full px-5 py-2.5 text-xs font-semibold sm:self-auto"
          >
            Sign in to sync
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        {user ? (
          <div className="space-y-6">
            <section className="cv-panel-surface cv-theme-panel rounded-3xl border p-6 sm:p-8">
              <div className="mb-7 flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[#d9b77b]/30 bg-[#d9b77b]/10 text-[#d9b77b]">
                  <CircleUserRound size={31} strokeWidth={1.3} />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate font-display text-2xl">
                    {name || "Film lover"}
                  </h2>

                  <p className="cv-quiet-text mt-1 truncate text-xs">
                    {user?.email}
                  </p>

                  <p className="cv-quiet-text mt-1.5 flex items-center gap-1.5 text-[11px]">
                    <CalendarDays size={12} className="text-[#d9b77b]" />
                    Member since {formatMemberSince(user?.createdAt)}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave}>
                <label className="block">
                  <span className="cv-quiet-text mb-2 block text-xs">
                    Display name
                  </span>

                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={50}
                    className="cv-input mb-6 h-11 w-full rounded-xl px-3 text-sm outline-none"
                  />
                </label>

                <p className="cv-quiet-text mb-3 text-xs">
                  Your favourite genres
                </p>

                <div className="mb-6 flex flex-wrap gap-2">
                  {PROFILE_GENRES.map((genre) => (
                    <button
                      type="button"
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`rounded-full border px-3 py-2 text-xs transition ${
                        selectedGenres.includes(genre)
                          ? "border-[#d9b77b]/55 bg-[#d9b77b]/15 text-[#d9b77b]"
                          : "cv-pill"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>

                {profileError && (
                  <p
                    role="alert"
                    className="mb-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-400"
                  >
                    {profileError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="cv-gold-button flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition hover:bg-[#f0d6a3] disabled:opacity-60"
                >
                  {saving ? (
                    "Saving..."
                  ) : savedMessage ? (
                    <>
                      <Check size={15} />
                      Saved to account
                    </>
                  ) : (
                    "Save preferences"
                  )}
                </button>
              </form>
            </section>

            <section className="cv-panel-surface cv-theme-panel rounded-3xl border p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Danger zone</h3>
                  <p className="cv-quiet-text mt-1 text-xs">
                    Permanently delete your account, sessions, and watchlist.
                  </p>
                </div>

                {!deleteOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteOpen(true);
                      setDeleteError("");
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-400/30 px-3.5 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                  >
                    <Trash2 size={13} />
                    Delete account
                  </button>
                )}
              </div>

              {deleteOpen && (
                <form
                  onSubmit={handleConfirmDelete}
                  className="mt-4 space-y-3 rounded-2xl border border-red-400/25 bg-red-500/[.06] p-4"
                >
                  <p className="flex items-center gap-2 text-xs font-semibold text-red-400">
                    <AlertTriangle size={14} />
                    This action cannot be undone.
                  </p>

                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    placeholder="Enter your password to confirm"
                    className="cv-input h-10 w-full rounded-xl px-3 text-xs outline-none"
                    autoComplete="current-password"
                  />

                  {deleteError && (
                    <p role="alert" className="text-xs text-red-400">
                      {deleteError}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={deleting}
                      className="rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                    >
                      {deleting ? "Deleting..." : "Confirm deletion"}
                    </button>

                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeletePassword("");
                        setDeleteError("");
                      }}
                      className="cv-pill rounded-xl border px-4 py-2 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        ) : (
          <section className="cv-panel-surface cv-theme-panel flex flex-col justify-between rounded-3xl border p-6 sm:p-8">
            <div>
              <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-[#d9b77b]/30 bg-[#d9b77b]/10 text-[#d9b77b]">
                <CircleUserRound size={28} strokeWidth={1.3} />
              </div>

              <h2 className="font-display text-3xl">
                Guest <span className="italic text-[#d9b77b]">watchlist</span>
              </h2>

              <p className="cv-quiet-text mt-3 text-sm leading-6">
                Films you save right now stay in this browser. Sign in or create
                a Cineverse account to merge them automatically and access your
                watchlist from anywhere.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenAuth}
              className="cv-gold-button mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
            >
              Sign in or create account
              <ArrowRight size={15} />
            </button>
          </section>
        )}

        <section className="cv-panel-surface cv-theme-panel rounded-3xl border p-6 sm:p-8">
          <div className="mb-7 flex items-end justify-between gap-3">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[.26em] text-[#d9b77b]">
                Saved for later
              </p>

              <h2 className="font-display text-3xl">Your watchlist</h2>
            </div>

            <span className="cv-quiet-text text-xs">
              {watchlistMovies.length}{" "}
              {watchlistMovies.length === 1 ? "film" : "films"}
            </span>
          </div>

          {watchlistError && (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400"
            >
              {watchlistError}
            </p>
          )}

          {watchlistLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[2/3] animate-pulse rounded-[13px] bg-white/10"
                />
              ))}
            </div>
          ) : watchlistMovies.length ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {visibleWatchlist.map((movie, index) => (
                  <MovieCardComponent
                    key={movie.id}
                    movie={movie}
                    index={index}
                    onOpen={onOpenMovie}
                    isSaved
                    onToggleSave={() => onToggleSave(movie)}
                  />
                ))}
              </div>

              {watchlistMovies.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllWatchlist((open) => !open)}
                  className="cv-pill mt-6 rounded-full border px-4 py-2 text-xs font-medium transition hover:border-[#d9b77b]/50"
                >
                  {showAllWatchlist
                    ? "Show fewer"
                    : `Show all ${watchlistMovies.length} saved films`}
                </button>
              )}
            </>
          ) : (
            <div className="cv-hairline flex min-h-[235px] flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center">
              <Bookmark size={25} className="mb-4 text-[#d9b77b]" />

              <h3 className="font-display text-xl">
                Keep the good ones close.
              </h3>

              <p className="cv-quiet-text mt-2 max-w-sm text-xs leading-5">
                Save films while exploring and they will be waiting here when
                movie night arrives.
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
