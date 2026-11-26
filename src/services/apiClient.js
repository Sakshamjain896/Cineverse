const RAW_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

let csrfTokenCache = "";
let refreshInFlight = null;

export function setCsrfToken(token) {
  csrfTokenCache = typeof token === "string" ? token : "";
}

export function clearCsrfToken() {
  csrfTokenCache = "";
}

export class ApiError extends Error {
  constructor(message, status = 500, code = "API_ERROR", details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function fetchCsrfToken(signal) {
  const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
    method: "GET",
    credentials: "include",
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return "";
  const data = await response.json().catch(() => null);
  if (data?.csrfToken) {
    setCsrfToken(data.csrfToken);
    return data.csrfToken;
  }
  return "";
}

async function refreshSessionOnce() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(csrfTokenCache ? { "X-CSRF-Token": csrfTokenCache } : {}),
    },
  })
    .then(async (res) => {
      const data = await res.json().catch(() => null);
      if (data?.csrfToken) setCsrfToken(data.csrfToken);
      return res.ok;
    })
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const AUTH_NO_RETRY_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/me",
  "/auth/csrf",
]);

export async function apiRequest(
  endpoint,
  { method = "GET", body, signal, retryAuth = true } = {},
) {
  const normalizedMethod = method.toUpperCase();
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (UNSAFE_METHODS.has(normalizedMethod)) {
    let token = csrfTokenCache;
    if (!token && endpoint !== "/auth/login" && endpoint !== "/auth/register") {
      token = await fetchCsrfToken(signal);
    }
    if (token) {
      headers["X-CSRF-Token"] = token;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: normalizedMethod,
    credentials: "include",
    signal,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (
    response.status === 401 &&
    retryAuth &&
    !AUTH_NO_RETRY_PATHS.has(endpoint)
  ) {
    const refreshed = await refreshSessionOnce();
    if (refreshed) {
      return apiRequest(endpoint, {
        method: normalizedMethod,
        body,
        signal,
        retryAuth: false,
      });
    }
  }

  const data = await response.json().catch(() => null);

  if (data?.csrfToken) {
    setCsrfToken(data.csrfToken);
  }

  if (!response.ok || !data?.success) {
    throw new ApiError(
      data?.message || `Cineverse API error (${response.status}).`,
      response.status,
      data?.code || "API_ERROR",
      data?.details,
    );
  }

  return data;
}
