import { CSRF_COOKIE_NAME, getCookieSecurityOptions } from "../middleware/csrf.js";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getAuthCookieOptions,
} from "../services/auth.service.js";
import {
  clearUserSearchHistory,
  deleteUserAccount,
  getUserSearchHistory,
  recordUserSearchHistory,
  updateUserProfile,
} from "../services/user.service.js";
import { sendSuccess } from "../utils/AppError.js";

export async function updateMe(req, res) {
  const user = await updateUserProfile(req.user.id, req.validated.body);
  return sendSuccess(res, { user });
}

export async function deleteMe(req, res) {
  const { password } = req.validated.body;
  await deleteUserAccount(req.user.id, password);

  const clearOpts = getAuthCookieOptions();
  res.clearCookie(ACCESS_COOKIE_NAME, clearOpts);
  res.clearCookie(REFRESH_COOKIE_NAME, clearOpts);
  res.clearCookie(CSRF_COOKIE_NAME, getCookieSecurityOptions());

  return sendSuccess(res, { message: "Account deleted permanently." });
}

export async function listSearchHistory(req, res) {
  const items = await getUserSearchHistory(req.user.id);
  return sendSuccess(res, { items });
}

export async function addSearchHistory(req, res) {
  const { query } = req.validated.body;
  const item = await recordUserSearchHistory(req.user.id, query);
  return sendSuccess(res, { item }, 201);
}

export async function clearSearchHistory(req, res) {
  await clearUserSearchHistory(req.user.id);
  return sendSuccess(res, { message: "Search history cleared." });
}
