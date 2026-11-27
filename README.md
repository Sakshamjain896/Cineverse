# Cineverse

Cineverse is a full-stack movie discovery and personal watchlist platform powered by React, Vite, Tailwind CSS v4, Express 5, Prisma ORM, Neon PostgreSQL, and the TMDB API.

---

## Architecture Overview

- **Frontend (`src/`)**: React 19 + Vite + Tailwind CSS v4 + Motion + React Router.
  - Lazy-loaded secondary views (`AuthPage`, `ProfilePage`, `MovieModal`) and inline YouTube trailer previews (`TrailerPlayer`).
  - Debounced search with `AbortController` race-condition protection, keyboard-navigable search suggestions/history, and Web Speech API voice search with text-search fallback.
  - Guest watchlists persist in `localStorage` and automatically merge into PostgreSQL upon login or registration.
- **Backend (`server/src/`)**: Node.js (ESM) + Express 5 layered as `routes -> controllers -> services -> database`.
  - Versioned API mounted at `/api/v1` (with backward-compatible `/api` alias).
  - Server-side TMDB proxy with request timeouts, status mapping, in-memory TTL caching, and in-flight request deduplication.
  - Real authentication (`bcryptjs` cost 12, HTTP-only JWT access cookies + rotated opaque refresh tokens tracked in `UserSession`, signed double-submit CSRF protection, and account deletion cascade).
  - Security middleware: Helmet, strict CORS allowlist, tiered `express-rate-limit`, Zod request validation, Pino structured logging with request IDs and secret redaction.
- **Database (`server/prisma/`)**: Neon PostgreSQL managed with Prisma ORM (`User`, `WatchlistItem`, `UserSession`, `SearchHistory`).

---

## Local Development Setup

### Prerequisites
- Node.js `>= 20` (tested on `v26.13.1`)
- A Neon PostgreSQL database URL
- A TMDB API Read Access Token

### 1. Configure Environment Variables

Copy the example templates and fill in real credentials locally (never commit `.env` files):

```bash
cp .env.example .env
cp server/.env.example server/.env
```

Generate a strong `JWT_SECRET` for `server/.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 2. Install Dependencies & Initialize Database

```bash
# Frontend dependencies
npm install

# Backend dependencies & Prisma client
cd server
npm install
npx prisma generate
npx prisma migrate deploy
```

### 3. Run Development Servers

```bash
# Terminal 1 — Backend API (http://localhost:5000)
cd server
npm run dev

# Terminal 2 — Frontend Vite Dev Server (http://localhost:5173)
npm run dev
```

---

## Verification & Testing

```bash
# Lint across frontend and backend
npm run lint

# Frontend unit & integration tests (Vitest + React Testing Library)
npm test

# Production frontend build
npm run build

# Backend integration tests (runs against configured PostgreSQL + TMDB)
cd server
npm test
npx prisma validate
npx prisma migrate status
```

---

## Environment Variables Reference

### Frontend (`.env`)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `https://api.yourdomain.com/api/v1` | Base URL for backend API calls |

### Backend (`server/.env`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | `development` \| `test` \| `production` |
| `PORT` | No | `5000` | HTTP server port |
| `DATABASE_URL` | Yes | — | Neon PostgreSQL connection string |
| `TMDB_ACCESS_TOKEN` | Yes | — | Server-side TMDB v3 bearer token |
| `JWT_SECRET` | Yes | — | 32+ char secret for JWT & CSRF HMAC |
| `JWT_ISSUER` | No | `cineverse-api` | JWT `iss` claim |
| `JWT_AUDIENCE` | No | `cineverse-web` | JWT `aud` claim |
| `CLIENT_URL` | Prod | `http://localhost:5173` | Primary allowed frontend origin |
| `CORS_ORIGINS` | Prod | — | Comma-separated allowed CORS origins |
| `COOKIE_SAME_SITE` | No | `lax` | `lax` (same-site/proxy) or `none` (cross-origin HTTPS) |
| `TRUST_PROXY` | Prod | `1` in prod | Express `trust proxy` setting behind reverse proxies |
| `LOG_LEVEL` | No | `info` | Pino logger level |

---

## Deployment Sequence (Vercel + Node.js Host + Neon PostgreSQL)

1. **Database (Neon PostgreSQL)**:
   - Provision Neon database and run migrations from CI/deploy release step:
     ```bash
     cd server
     npx prisma migrate deploy
     ```
2. **Backend (Render / Railway / Fly.io)**:
   - Root directory: `server`
   - Build command: `npm ci && npx prisma generate`
   - Start command: `npm start`
   - Set all production environment variables (`NODE_ENV=production`, `DATABASE_URL`, `TMDB_ACCESS_TOKEN`, strong `JWT_SECRET`, `CLIENT_URL`, `CORS_ORIGINS`, `TRUST_PROXY=1`).
   - Verify liveness (`/api/v1/health`) and readiness (`/api/v1/health/ready`).
3. **Frontend (Vercel / Static Host)**:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Set `VITE_API_BASE_URL` to your deployed backend URL (e.g., `https://cineverse-api.example.com/api/v1`).
   - **Cookie Note for Cross-Origin Hosts**: If your frontend (`vercel.app`) and backend (`onrender.com`) are on separate domains, set `COOKIE_SAME_SITE=none` on the backend (HTTPS required), OR proxy `/api/:path*` to the backend via Vercel rewrites so cookies remain first-party (`SameSite=lax`).
