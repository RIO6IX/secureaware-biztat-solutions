// Fetch wrapper. The session cookie is HttpOnly, so the page only keeps the CSRF token and
// the public user profile, in sessionStorage for the lifetime of the tab.

const STORAGE_KEY = "secureaware.session";
let session = readSession();
const listeners = new Set();

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
  session = value;
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
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    setSession(null);
    throw new ApiError(401, "Your session has ended. Please sign in again.", data);
  }
  if (!response.ok) throw new ApiError(response.status, data.message || "Request failed", data);
  return data;
}

// Downloads a server-generated file (CSV) with the session cookie.
export async function download(path, fallbackName) {
  const response = await fetch(path, { credentials: "same-origin" });
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
