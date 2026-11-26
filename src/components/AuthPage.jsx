import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Logo } from "./Logo.jsx";

export default function AuthPage({ onLogin, onRegister, onBack }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (mode === "signup") {
      if (trimmedName.length < 2) {
        setError("Enter your name (at least 2 characters).");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        setError("Password must include at least one letter and one number.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await onLogin({ email: trimmedEmail, password });
      } else {
        await onRegister({
          name: trimmedName,
          email: trimmedEmail,
          password,
        });
      }
    } catch (err) {
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
            <span className="italic text-[#d9b77b]">little universe</span>{" "}
            behind.
          </h1>

          <p className="mt-5 max-w-md text-sm leading-7 text-white/65">
            Save the films you love across devices. Find the ones you missed.
            Make your next watch count.
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
              : "Build a persistent watchlist synced to your Cineverse account."}
          </p>
        </div>

        <div className="cv-panel-surface mb-6 grid grid-cols-2 rounded-full border p-1">
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`rounded-full py-2.5 text-sm transition ${
              mode === "login"
                ? "bg-[#d9b77b] font-semibold text-[#17130d]"
                : "cv-quiet-text"
            }`}
          >
            Sign in
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            className={`rounded-full py-2.5 text-sm transition ${
              mode === "signup"
                ? "bg-[#d9b77b] font-semibold text-[#17130d]"
                : "cv-quiet-text"
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {mode === "signup" && (
            <label className="block">
              <span className="cv-quiet-text mb-2 block text-xs">
                Your name
              </span>

              <span className="cv-input flex h-12 items-center gap-3 rounded-xl px-4">
                <UserRound size={16} className="cv-quiet-text shrink-0" />

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="How should we call you?"
                  maxLength={50}
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
              <Mail size={16} className="cv-quiet-text shrink-0" />

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                maxLength={120}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                autoComplete="email"
              />
            </span>
          </label>

          <label className="block">
            <span className="cv-quiet-text mb-2 block text-xs">Password</span>

            <span className="cv-input flex h-12 items-center gap-3 rounded-xl px-4">
              <LockKeyhole size={16} className="cv-quiet-text shrink-0" />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={
                  mode === "signup"
                    ? "8+ characters with a letter & number"
                    : "Your password"
                }
                maxLength={128}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
              />

              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((show) => !show)}
                className="cv-quiet-text px-1 text-[11px] font-medium hover:text-current"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="cv-gold-button group flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition hover:bg-[#f0d6a3] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Sign in to Cineverse"
                : "Create my account"}

            {!submitting && (
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-1"
              />
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
