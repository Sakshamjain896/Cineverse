import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import express from "express";

process.env.NODE_ENV = "test";

const { default: app } = await import("../src/app.js");
const { prisma, disconnectDatabase } = await import("../src/database/prisma.js");
const { createRateLimiter } = await import("../src/middleware/rateLimit.js");

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  capture(response) {
    const rawCookies = response.headers.getSetCookie?.() || [];
    for (const raw of rawCookies) {
      const [pair] = raw.split(";");
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const name = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      if (!value) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header() {
    if (this.cookies.size === 0) return "";
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  has(name) {
    return this.cookies.has(name);
  }
}

async function apiFetch(baseUrl, path, { method = "GET", body, jar, headers = {} } = {}) {
  const reqHeaders = {
    Accept: "application/json",
    ...headers,
  };
  if (body !== undefined) {
    reqHeaders["Content-Type"] = "application/json";
  }
  const cookieHeader = jar?.header();
  if (cookieHeader) {
    reqHeaders.Cookie = cookieHeader;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  jar?.capture(res);
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

describe("Cineverse API Integration Suite", () => {
  let server;
  let baseUrl;
  const runId = Date.now();
  const userAEmail = `test-a-${runId}@cineverse.example`;
  const userBEmail = `test-b-${runId}@cineverse.example`;
  const password = "Cineverse123";

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    await prisma.user
      .deleteMany({
        where: { email: { in: [userAEmail, userBEmail] } },
      })
      .catch(() => {});

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDatabase();
  });

  it("serves health, readiness, security headers, and request IDs", async () => {
    const health = await apiFetch(baseUrl, "/health");
    assert.equal(health.status, 200);
    assert.equal(health.data.success, true);
    assert.equal(health.data.status, "healthy");
    assert.ok(health.headers.get("x-request-id"));
    assert.ok(health.headers.get("x-content-type-options"));

    const ready = await apiFetch(baseUrl, "/health/ready");
    assert.equal(ready.status, 200);
    assert.equal(ready.data.database, "connected");
    assert.equal(ready.data.tmdbConfigured, true);

    const legacyHealth = await fetch(
      baseUrl.replace("/api/v1", "/api/health"),
    );
    assert.equal(legacyHealth.status, 200);
  });

  it("handles malformed JSON, unknown routes, and unauthorized CORS origins safely", async () => {
    const badJsonRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad-json",
    });
    assert.equal(badJsonRes.status, 400);
    const badJson = await badJsonRes.json();
    assert.equal(badJson.code, "INVALID_JSON");

    const notFound = await apiFetch(baseUrl, "/does-not-exist");
    assert.equal(notFound.status, 404);
    assert.equal(notFound.data.code, "NOT_FOUND");

    const corsDenied = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "https://evil.example.com" },
    });
    assert.equal(corsDenied.headers.get("access-control-allow-origin"), null);
  });

  it("validates TMDB routes and serves live movie catalog data", async () => {
    const emptySearch = await apiFetch(baseUrl, "/movies/search");
    assert.equal(emptySearch.status, 400);
    assert.equal(emptySearch.data.code, "VALIDATION_ERROR");

    const invalidId = await apiFetch(baseUrl, "/movies/not-a-number");
    assert.equal(invalidId.status, 400);

    const missingMovie = await apiFetch(baseUrl, "/movies/999999999");
    assert.equal(missingMovie.status, 404);

    const [trending, popular, topRated, nowPlaying, genres, discover, search, details, recs] =
      await Promise.all([
        apiFetch(baseUrl, "/movies/trending"),
        apiFetch(baseUrl, "/movies/popular?page=1"),
        apiFetch(baseUrl, "/movies/top-rated?page=1"),
        apiFetch(baseUrl, "/movies/now-playing?page=1"),
        apiFetch(baseUrl, "/movies/genres"),
        apiFetch(baseUrl, "/movies/discover?genres=878&page=1"),
        apiFetch(baseUrl, "/movies/search?q=Inception"),
        apiFetch(baseUrl, "/movies/157336"),
        apiFetch(baseUrl, "/movies/157336/recommendations"),
      ]);

    assert.equal(trending.status, 200);
    assert.ok(trending.data.results.length > 0);
    assert.equal(popular.status, 200);
    assert.equal(topRated.status, 200);
    assert.equal(nowPlaying.status, 200);
    assert.equal(genres.status, 200);
    assert.ok(genres.data.genres.length > 0);
    assert.equal(discover.status, 200);
    assert.ok(discover.data.results.length > 0);
    assert.equal(search.status, 200);
    assert.ok(search.data.results.length > 0);
    assert.equal(details.status, 200);
    assert.equal(details.data.title, "Interstellar");
    assert.equal(details.data.director, "Christopher Nolan");
    assert.equal(recs.status, 200);
    assert.ok(recs.data.results.length > 0);

    // Language filtering guarantees only the selected original_language is returned
    const hindiPopular = await apiFetch(baseUrl, "/movies/popular?page=1&lang=hi");
    assert.equal(hindiPopular.status, 200);
    assert.ok(hindiPopular.data.results.length > 0);
    assert.ok(
      hindiPopular.data.results.every((m) => m.original_language === "hi"),
    );

    const invalidLang = await apiFetch(baseUrl, "/movies/popular?lang=xx");
    assert.equal(invalidLang.status, 400);
  });

  it("enforces secure registration, login, CSRF, session refresh/revocation, profile, watchlist isolation, and account deletion", async () => {
    const jarA = new CookieJar();
    const jarB = new CookieJar();

    // Unauthenticated access rejected
    const unauthMe = await apiFetch(baseUrl, "/auth/me");
    assert.equal(unauthMe.status, 401);
    const unauthWatchlist = await apiFetch(baseUrl, "/watchlist");
    assert.equal(unauthWatchlist.status, 401);

    // Weak password rejected
    const weakReg = await apiFetch(baseUrl, "/auth/register", {
      method: "POST",
      body: { name: "Test", email: userAEmail, password: "123" },
    });
    assert.equal(weakReg.status, 400);

    // Register User A
    const regA = await apiFetch(baseUrl, "/auth/register", {
      method: "POST",
      jar: jarA,
      body: { name: "User A", email: userAEmail, password },
    });
    assert.equal(regA.status, 201);
    assert.equal(regA.data.user.email, userAEmail);
    assert.equal(regA.data.user.passwordHash, undefined);
    assert.ok(regA.data.csrfToken);
    assert.ok(jarA.has("cv_access"));
    assert.ok(jarA.has("cv_refresh"));
    assert.ok(jarA.has("cv_csrf"));

    let csrfA = regA.data.csrfToken;

    // Duplicate email rejected
    const dupReg = await apiFetch(baseUrl, "/auth/register", {
      method: "POST",
      body: { name: "Dup", email: userAEmail, password },
    });
    assert.equal(dupReg.status, 409);

    // Login errors return generic message
    const wrongPass = await apiFetch(baseUrl, "/auth/login", {
      method: "POST",
      body: { email: userAEmail, password: "WrongPassword1" },
    });
    const wrongEmail = await apiFetch(baseUrl, "/auth/login", {
      method: "POST",
      body: { email: "nobody@cineverse.example", password: "WrongPassword1" },
    });
    assert.equal(wrongPass.status, 401);
    assert.equal(wrongEmail.status, 401);
    assert.equal(wrongPass.data.message, wrongEmail.data.message);

    // CSRF protection blocks missing token
    const missingCsrf = await apiFetch(baseUrl, "/users/me", {
      method: "PATCH",
      jar: jarA,
      body: { name: "Blocked Update" },
    });
    assert.equal(missingCsrf.status, 403);

    // Profile update succeeds with CSRF token
    const updateProfile = await apiFetch(baseUrl, "/users/me", {
      method: "PATCH",
      jar: jarA,
      headers: { "X-CSRF-Token": csrfA },
      body: { name: "User A Updated", favoriteGenres: ["Sci-Fi", "Drama"] },
    });
    assert.equal(updateProfile.status, 200);
    assert.equal(updateProfile.data.user.name, "User A Updated");
    assert.deepEqual(updateProfile.data.user.favoriteGenres, ["Sci-Fi", "Drama"]);

    // Watchlist add + duplicate prevention + merge
    const addMovie = await apiFetch(baseUrl, "/watchlist", {
      method: "POST",
      jar: jarA,
      headers: { "X-CSRF-Token": csrfA },
      body: { tmdbId: 157336, title: "Interstellar" },
    });
    assert.equal(addMovie.status, 201);

    const dupMovie = await apiFetch(baseUrl, "/watchlist", {
      method: "POST",
      jar: jarA,
      headers: { "X-CSRF-Token": csrfA },
      body: { tmdbId: 157336, title: "Interstellar" },
    });
    assert.equal(dupMovie.status, 200);
    assert.equal(dupMovie.data.alreadySaved, true);

    const merged = await apiFetch(baseUrl, "/watchlist/merge", {
      method: "POST",
      jar: jarA,
      headers: { "X-CSRF-Token": csrfA },
      body: {
        items: [
          { tmdbId: 157336, title: "Interstellar" },
          { tmdbId: 27205, title: "Inception" },
          { tmdbId: 693134, title: "Dune: Part Two" },
        ],
      },
    });
    assert.equal(merged.status, 200);
    assert.equal(merged.data.total, 3);

    // Search history CRUD
    const addHist = await apiFetch(baseUrl, "/users/me/search-history", {
      method: "POST",
      jar: jarA,
      headers: { "X-CSRF-Token": csrfA },
      body: { query: "Interstellar" },
    });
    assert.equal(addHist.status, 201);
    const listHist = await apiFetch(baseUrl, "/users/me/search-history", {
      jar: jarA,
    });
    assert.equal(listHist.status, 200);
    assert.equal(listHist.data.items.length, 1);

    // Register User B and verify strict isolation
    const regB = await apiFetch(baseUrl, "/auth/register", {
      method: "POST",
      jar: jarB,
      body: { name: "User B", email: userBEmail, password },
    });
    assert.equal(regB.status, 201);
    const csrfB = regB.data.csrfToken;

    const listB = await apiFetch(baseUrl, "/watchlist", { jar: jarB });
    assert.equal(listB.status, 200);
    assert.equal(listB.data.total, 0);

    const crossDelete = await apiFetch(baseUrl, "/watchlist/157336", {
      method: "DELETE",
      jar: jarB,
      headers: { "X-CSRF-Token": csrfB },
    });
    assert.equal(crossDelete.status, 404);

    // Refresh token rotation & reuse detection
    const oldRefreshCookie = jarA.cookies.get("cv_refresh");
    const refreshed = await apiFetch(baseUrl, "/auth/refresh", {
      method: "POST",
      jar: jarA,
    });
    assert.equal(refreshed.status, 200);
    assert.ok(refreshed.data.csrfToken);
    assert.notEqual(jarA.cookies.get("cv_refresh"), oldRefreshCookie);

    const replayRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `cv_refresh=${oldRefreshCookie}` },
    });
    assert.equal(replayRes.status, 401);

    // Active session should now be revoked due to reuse detection
    const meAfterReplay = await apiFetch(baseUrl, "/auth/me", { jar: jarA });
    assert.equal(meAfterReplay.status, 401);

    // Re-login User A and test logout invalidation
    const loginA = await apiFetch(baseUrl, "/auth/login", {
      method: "POST",
      jar: jarA,
      body: { email: userAEmail, password },
    });
    assert.equal(loginA.status, 200);
    csrfA = loginA.data.csrfToken;
    const savedAccessCookie = jarA.cookies.get("cv_access");

    const logoutA = await apiFetch(baseUrl, "/auth/logout", {
      method: "POST",
      jar: jarA,
      headers: { "X-CSRF-Token": csrfA },
    });
    assert.equal(logoutA.status, 200);

    const staleAccessCheck = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: `cv_access=${savedAccessCookie}` },
    });
    assert.equal(staleAccessCheck.status, 401);

    // Re-login and test account deletion workflow
    const loginA2 = await apiFetch(baseUrl, "/auth/login", {
      method: "POST",
      jar: jarA,
      body: { email: userAEmail, password },
    });
    csrfA = loginA2.data.csrfToken;

    const badDelete = await apiFetch(baseUrl, "/users/me", {
      method: "DELETE",
      jar: jarA,
      headers: { "X-CSRF-Token": csrfA },
      body: { password: "WrongPassword1" },
    });
    assert.equal(badDelete.status, 401);

    const delA = await apiFetch(baseUrl, "/users/me", {
      method: "DELETE",
      jar: jarA,
      headers: { "X-CSRF-Token": csrfA },
      body: { password },
    });
    assert.equal(delA.status, 200);

    const delB = await apiFetch(baseUrl, "/users/me", {
      method: "DELETE",
      jar: jarB,
      headers: { "X-CSRF-Token": csrfB },
      body: { password },
    });
    assert.equal(delB.status, 200);
  });

  it("enforces rate limiting with HTTP 429", async () => {
    const limitedApp = express();
    limitedApp.use(
      createRateLimiter({ windowMs: 60_000, limit: 2, skipInTest: false }),
    );
    limitedApp.get("/ping", (_req, res) => res.json({ ok: true }));

    const s = await new Promise((resolve) => {
      const srv = limitedApp.listen(0, "127.0.0.1", () => resolve(srv));
    });

    try {
      const url = `http://127.0.0.1:${s.address().port}/ping`;
      const r1 = await fetch(url);
      const r2 = await fetch(url);
      const r3 = await fetch(url);
      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);
      assert.equal(r3.status, 429);
      const body3 = await r3.json();
      assert.equal(body3.code, "RATE_LIMITED");
    } finally {
      await new Promise((resolve) => s.close(resolve));
    }
  });
});
