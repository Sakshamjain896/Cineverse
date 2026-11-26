import { ApiError, apiRequest, clearCsrfToken } from "./apiClient.js";

export async function getSessionUser(signal) {
  try {
    const data = await apiRequest("/auth/me", { signal, retryAuth: false });
    return data.user || null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Attempt silent refresh once when access token expired.
      try {
        const refreshed = await apiRequest("/auth/refresh", {
          method: "POST",
          signal,
          retryAuth: false,
        });
        return refreshed.user || null;
      } catch {
        return null;
      }
    }
    throw error;
  }
}

export async function registerUserAccount({ name, email, password }) {
  const data = await apiRequest("/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
  return data.user;
}

export async function loginUserAccount({ email, password }) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return data.user;
}

export async function logoutUserAccount() {
  try {
    await apiRequest("/auth/logout", {
      method: "POST",
      retryAuth: false,
    });
  } finally {
    clearCsrfToken();
  }
}

export async function updateUserProfile({ name, favoriteGenres }) {
  const data = await apiRequest("/users/me", {
    method: "PATCH",
    body: { name, favoriteGenres },
  });
  return data.user;
}

export async function deleteUserAccount(password) {
  try {
    return await apiRequest("/users/me", {
      method: "DELETE",
      body: { password },
    });
  } finally {
    clearCsrfToken();
  }
}

export async function fetchServerSearchHistory(signal) {
  const data = await apiRequest("/users/me/search-history", { signal });
  return data.items || [];
}

export async function recordServerSearchHistory(query) {
  const data = await apiRequest("/users/me/search-history", {
    method: "POST",
    body: { query },
  });
  return data.item;
}

export async function clearServerSearchHistory() {
  return apiRequest("/users/me/search-history", {
    method: "DELETE",
  });
}
