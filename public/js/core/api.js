// Fetch wrapper. The session cookie is HttpOnly, so the page only keeps the CSRF token and
// the public user profile, in sessionStorage for the lifetime of the tab.
//
// The cookie is shared by every tab in the browser, but each tab remembers its own user. If
// someone signs in as user B in one tab while another tab still shows user A, that tab would
// otherwise show and change B's progress under A's name. Each tab therefore checks whose
// session answered every request (x-secureaware-user) and listens for sign-ins in other tabs,
// and signs itself out when the user no longer matches.
import { toast } from "./ui.js";

const STORAGE_KEY = "secureaware.session";
const IDENTITY_KEY = "secureaware.identity";
const NOTICE_KEY = "secureaware.notice";
let session = readSession();
const listeners = new Set();

function broadcastIdentity(userId) {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify({ userId, at: Date.now() }));
  } catch {
    // Without localStorage the per-request check below still protects the tab.
  }
}

// Ends this tab's session and returns to the sign-in page with an explanation.
function endSession(message) {
  session = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.setItem(NOTICE_KEY, message);
  } catch {
    // Ignore storage errors; the reload still shows the sign-in page.
  }
  listeners.forEach((listener) => listener(null));
  history.replaceState(null, "", "#/");
  location.reload();
}

window.addEventListener("storage", (event) => {
  if (event.key !== IDENTITY_KEY || !session?.user) return;
  let identity = null;
  try {
    identity = JSON.parse(event.newValue || "null");
  } catch {
    return;
  }
  if (identity?.userId === session.user.id) return;
  endSession(identity?.userId
    ? "Someone signed in as a different user in another tab of this browser, so you were signed out here. Sign in again to continue as yourself."
    : "You signed out in another tab.");
});

try {
  const notice = sessionStorage.getItem(NOTICE_KEY);
  if (notice) {
    sessionStorage.removeItem(NOTICE_KEY);
    setTimeout(() => toast(notice, "error"), 0);
  }
} catch {
  // Storage unavailable: nothing to show.
}

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function getSession() {
  return session;
}

export function setSession(value) {
  const previousUserId = session?.user?.id ?? null;
  session = value;
  const userId = value?.user?.id ?? null;
  if (userId !== previousUserId) broadcastIdentity(userId);
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); the in-memory copy still works for this page.
  }
  listeners.forEach((listener) => listener(value));
}

export function onSessionChange(listener) {
  listeners.add(listener);
}

export async function api(path, { method = "GET", body, headers = {} } = {}) {
  const init = { method, credentials: "same-origin", headers: { ...headers } };
  if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  if (method !== "GET" && session?.csrfToken) init.headers["x-csrf-token"] = session.csrfToken;
  let response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
  }
  const owner = response.headers.get("x-secureaware-user");
  if (owner && session?.user && owner !== String(session.user.id)) {
    endSession("You are signed in as a different user in another tab of this browser, so this tab was signed out. Sign in again to continue as yourself.");
    throw new ApiError(401, "Signed in as a different user in another tab.");
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    if (session) endSession("Your session has ended. Please sign in again.");
    throw new ApiError(401, "Your session has ended. Please sign in again.", data);
  }
  if (!response.ok) throw new ApiError(response.status, data.message || "Request failed", data);
  return data;
}

// Downloads a server-generated file (CSV) with the session cookie.
export async function download(path, fallbackName) {
  const response = await fetch(path, { credentials: "same-origin" });
  const owner = response.headers.get("x-secureaware-user");
  if (owner && session?.user && owner !== String(session.user.id)) {
    endSession("You are signed in as a different user in another tab of this browser, so this tab was signed out. Sign in again to continue as yourself.");
    throw new ApiError(401, "Signed in as a different user in another tab.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, data.message || "Download failed");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
