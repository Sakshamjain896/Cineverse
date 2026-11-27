import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App.jsx";

const INTERSTELLAR = {
  id: 157336,
  title: "Interstellar",
  release_date: "2014-11-05",
  vote_average: 8.4,
  poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  backdrop_path: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
  genre_ids: [878, 12, 18],
  overview: "A team of explorers travel through a wormhole in space.",
};

const INCEPTION = {
  id: 27205,
  title: "Inception",
  release_date: "2010-07-15",
  vote_average: 8.4,
  poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  backdrop_path: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
  genre_ids: [28, 878],
  overview: "A thief steals secrets through dream-sharing technology.",
};

const GENRES_PAYLOAD = {
  success: true,
  genres: [
    { id: 28, name: "Action" },
    { id: 18, name: "Drama" },
    { id: 878, name: "Science Fiction" },
  ],
};

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function createFetchMock({ failMovies = false } = {}) {
  let authedUser = null;
  let serverWatchlist = [];
  let failFlag = failMovies;

  const mockFn = vi.fn((url, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const path = String(url).replace(/^https?:\/\/[^/]+\/api\/v1/, "");

    if (path === "/auth/csrf") {
      return jsonResponse({ success: true, csrfToken: "test-csrf-token" });
    }

    if (path === "/auth/me") {
      if (!authedUser) {
        return jsonResponse({ success: false, message: "Unauthorized" }, 401);
      }
      return jsonResponse({
        success: true,
        user: authedUser,
        csrfToken: "test-csrf-token",
      });
    }

    if (path === "/auth/refresh") {
      return jsonResponse({ success: false, message: "No session" }, 401);
    }

    if (path === "/auth/login" && method === "POST") {
      const body = JSON.parse(options.body || "{}");
      authedUser = {
        id: "user-1",
        name: "Elena Vance",
        email: body.email,
        favoriteGenres: ["Sci-Fi"],
        createdAt: "2026-01-15T00:00:00.000Z",
      };
      return jsonResponse({
        success: true,
        user: authedUser,
        csrfToken: "test-csrf-token",
      });
    }

    if (path === "/watchlist" && method === "GET") {
      return jsonResponse({
        success: true,
        items: serverWatchlist,
        page: 1,
        total: serverWatchlist.length,
        totalPages: 1,
      });
    }

    if (path === "/watchlist/merge" && method === "POST") {
      const body = JSON.parse(options.body || "{}");
      serverWatchlist = (body.items || []).map((item) => ({
        ...item,
        id: `merge-${item.tmdbId}`,
      }));
      return jsonResponse({
        success: true,
        items: serverWatchlist,
        page: 1,
        total: serverWatchlist.length,
        totalPages: 1,
      });
    }

    if (path.startsWith("/users/me/search-history")) {
      return jsonResponse({ success: true, items: [] });
    }

    if (failFlag && path.startsWith("/movies")) {
      return jsonResponse(
        { success: false, message: "Movie server unavailable" },
        502,
      );
    }

    if (path.startsWith("/movies/genres")) {
      return jsonResponse(GENRES_PAYLOAD);
    }

    if (
      path.startsWith("/movies/trending") ||
      path.startsWith("/movies/popular") ||
      path.startsWith("/movies/top-rated") ||
      path.startsWith("/movies/now-playing")
    ) {
      const lang = new URL(`http://localhost${path}`).searchParams.get("lang") || "en";
      if (lang === "hi") {
        return jsonResponse({
          success: true,
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            {
              id: 20453,
              title: "3 ईडियट",
              original_language: "hi",
              release_date: "2009-12-23",
              vote_average: 8.0,
              poster_path: "/66A9MqXOyVFCssoloscw79z8Tew.jpg",
              backdrop_path: "/u7kuUaySqXHkEZq3w4c1iF16w5G.jpg",
              genre_ids: [18, 35],
              overview: "Hindi cinema classic.",
            },
          ],
        });
      }
      return jsonResponse({
        success: true,
        page: 1,
        total_pages: 2,
        total_results: 2,
        results: [INTERSTELLAR, INCEPTION],
      });
    }

    if (path.startsWith("/movies/discover")) {
      return jsonResponse({
        success: true,
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [INCEPTION],
      });
    }

    if (path.startsWith("/movies/search")) {
      const q = new URL(`http://localhost${path}`).searchParams.get("q") || "";
      const results = q.toLowerCase().includes("inception") ? [INCEPTION] : [];
      return jsonResponse({
        success: true,
        page: 1,
        total_pages: 1,
        total_results: results.length,
        results,
      });
    }

    if (path.startsWith("/movies/157336/recommendations")) {
      return jsonResponse({
        success: true,
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [INCEPTION],
      });
    }

    if (path.startsWith("/movies/157336")) {
      return jsonResponse({
        success: true,
        ...INTERSTELLAR,
        runtime: 169,
        director: "Christopher Nolan",
        tagline: "Mankind was born on Earth.",
        genres: [{ id: 878, name: "Science Fiction" }],
        cast: [{ id: 1, name: "Matthew McConaughey", character: "Cooper" }],
      });
    }

    return jsonResponse({ success: false, message: "Unhandled route" }, 404);
  });

  mockFn.setFailMovies = (next) => {
    failFlag = next;
  };

  return mockFn;
}

describe("Cineverse Frontend Application", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders live TMDB rows on Home and opens MovieModal with details & recommendations", async () => {
    globalThis.fetch = createFetchMock();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Trending across cinema/i),
    ).toBeInTheDocument();

    const previewButtons = await screen.findAllByRole("button", {
      name: /Preview Interstellar/i,
    });
    fireEvent.click(previewButtons[0]);

    const openDetailsBtn = await screen.findByRole("button", {
      name: /Open details for Interstellar/i,
    });
    fireEvent.click(openDetailsBtn);

    expect(
      await screen.findByRole("dialog", { name: /Interstellar details/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Christopher Nolan")).toBeInTheDocument();
    expect(await screen.findByText(/Recommended next/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Interstellar details/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("supports debounced search, empty states, genre filtering, and mobile menu navigation", async () => {
    globalThis.fetch = createFetchMock();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    const menuToggle = screen.getByRole("button", { name: /Open menu/i });
    fireEvent.click(menuToggle);

    const mobileNav = screen.getByRole("navigation", {
      name: /Mobile navigation/i,
    });
    expect(mobileNav).toBeInTheDocument();

    const discoverNavBtns = screen.getAllByRole("button", {
      name: /^Discover$/i,
    });
    fireEvent.click(discoverNavBtns[0]);

    expect(
      await screen.findByRole("heading", { name: /Discover/i }),
    ).toBeInTheDocument();

    const catalogInput = screen.getByLabelText(/^Search movies$/i);
    fireEvent.change(catalogInput, { target: { value: "zzzzzz" } });

    expect(
      await screen.findByText(/Nothing on this reel\. Yet\./i, {}, { timeout: 2500 }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reset discovery/i }));
    await waitFor(() => {
      expect(catalogInput).toHaveValue("");
    });

    const sciFiButton = await screen.findByRole("button", { name: "Sci-Fi" });
    fireEvent.click(sciFiButton);
    await waitFor(() => {
      expect(
        globalThis.fetch.mock.calls.some(([url]) =>
          String(url).includes("/movies/discover?genres=878"),
        ),
      ).toBe(true);
    });
  });

  it("shows error banner when API fails and recovers on Retry", async () => {
    const fetchMock = createFetchMock({ failMovies: true });
    globalThis.fetch = fetchMock;

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Unable to reach the Cineverse movie server/i),
    ).toBeInTheDocument();

    fetchMock.setFailMovies(false);
    fireEvent.click(screen.getByRole("button", { name: /Retry live catalog/i }));

    expect(
      await screen.findByText(/Trending across cinema/i),
    ).toBeInTheDocument();
  });

  it("persists guest watchlist in localStorage and merges it after real login", async () => {
    globalThis.fetch = createFetchMock();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    const saveBtns = await screen.findAllByRole("button", {
      name: /Save Interstellar/i,
    });
    fireEvent.click(saveBtns[0]);

    await waitFor(() => {
      const raw = window.localStorage.getItem("cineverse-guest-watchlist-v2");
      expect(raw).toContain("157336");
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    expect(
      await screen.findByRole("heading", { name: /Welcome back\./i }),
    ).toBeInTheDocument();

    // Validation check before valid login
    fireEvent.click(
      screen.getByRole("button", { name: /Sign in to Cineverse/i }),
    );
    expect(
      await screen.findByText(/Enter your email and password/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "elena@cineverse.example" },
    });
    fireEvent.change(screen.getByPlaceholderText("Your password"), {
      target: { value: "Cineverse123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Sign in to Cineverse/i }),
    );

    expect(await screen.findByText("Elena Vance")).toBeInTheDocument();
    expect(await screen.findByText(/Member since/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        globalThis.fetch.mock.calls.some(([url]) =>
          String(url).includes("/watchlist/merge"),
        ),
      ).toBe(true);
    });
  });

  it("filters movie content and translates UI when switching language", async () => {
    globalThis.fetch = createFetchMock();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Trending across cinema/i),
    ).toBeInTheDocument();

    const langSelect = screen.getByRole("combobox", { name: /Language/i });
    fireEvent.change(langSelect, { target: { value: "hi" } });

    expect(await screen.findByText("अभी ट्रेंडिंग")).toBeInTheDocument();
    expect(screen.getAllByText("3 ईडियट").length).toBeGreaterThan(0);
    await waitFor(
      () => {
        expect(screen.queryByText("Interstellar")).not.toBeInTheDocument();
      },
      { timeout: 2500 },
    );

    expect(
      globalThis.fetch.mock.calls.some(([url]) =>
        String(url).includes("lang=hi"),
      ),
    ).toBe(true);
  });
});
