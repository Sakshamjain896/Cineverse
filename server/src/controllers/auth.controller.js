import {
  CSRF_COOKIE_NAME,
  ensureCsrfToken,
  getCookieSecurityOptions,
  rotateCsrfToken,
} from "../middleware/csrf.js";
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TTL,
  REFRESH_COOKIE_NAME,
  REFRESH_TTL,
  getAuthCookieOptions,
  loginUser,
  logoutSession,
  refreshUserSession,
  registerUser,
  verifyAccessToken,
} from "../services/auth.service.js";
import { sendSuccess } from "../utils/AppError.js";

function setSessionCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, getAuthCookieOptions(ACCESS_TTL));
  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    getAuthCookieOptions(REFRESH_TTL),
  );
  return rotateCsrfToken(res);
}

function clearSessionCookies(res) {
  const clearOpts = getAuthCookieOptions();
  res.clearCookie(ACCESS_COOKIE_NAME, clearOpts);
  res.clearCookie(REFRESH_COOKIE_NAME, clearOpts);
  res.clearCookie(CSRF_COOKIE_NAME, getCookieSecurityOptions());
}

export function getCsrf(req, res) {
  const csrfToken = ensureCsrfToken(req, res);
  return sendSuccess(res, { csrfToken });
}

export async function register(req, res) {
  const { name, email, password } = req.validated.body;
  const { user, accessToken, refreshToken } = await registerUser({
    name,
    email,
    password,
    userAgent: req.get("user-agent"),
  });

  const csrfToken = setSessionCookies(res, { accessToken, refreshToken });
  return sendSuccess(res, { user, csrfToken }, 201);
}

export async function login(req, res) {
  const { email, password } = req.validated.body;
  const { user, accessToken, refreshToken } = await loginUser({
    email,
    password,
    userAgent: req.get("user-agent"),
  });

  const csrfToken = setSessionCookies(res, { accessToken, refreshToken });
  return sendSuccess(res, { user, csrfToken });
}

export async function refresh(req, res) {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  try {
    const { user, accessToken, refreshToken } = await refreshUserSession(
      rawRefreshToken,
      req.get("user-agent"),
    );

    const csrfToken = setSessionCookies(res, { accessToken, refreshToken });
    return sendSuccess(res, { user, csrfToken });
  } catch (error) {
    clearSessionCookies(res);
    throw error;
  }
}

export async function logout(req, res) {
  let sessionId = req.sessionId || null;
  if (!sessionId && req.cookies?.[ACCESS_COOKIE_NAME]) {
    try {
      const payload = verifyAccessToken(req.cookies[ACCESS_COOKIE_NAME]);
      sessionId = payload?.sid || null;
    } catch {
      sessionId = null;
    }
  }

  await logoutSession({
    sessionId,
    rawRefreshToken: req.cookies?.[REFRESH_COOKIE_NAME],
  });

  clearSessionCookies(res);
  return sendSuccess(res, { message: "Signed out successfully." });
}

export function me(req, res) {
  const csrfToken = ensureCsrfToken(req, res);
  return sendSuccess(res, { user: req.user, csrfToken });
}
