// Application shell shared by every module: sign-in, navigation, notifications, account and
// the foundation's audit view. Modules add pages with route() and menu entries with nav().
import { api, getSession, setSession, download } from "./api.js";
import { h, mount, formatDateTime } from "./dom.js";
import { route, start, navigate, resolve, currentPath } from "./router.js";
import { toast, withStates, pageHeader, table, field, badge, emptyState } from "./ui.js";

const navItems = [];
const ADMIN_ROLES = ["Security/HR Admin", "System Admin"];
const DEFAULT_PREFERENCES = { darkMode: false, showUnreadCount: true };

function preferenceKey() {
  return `secureaware.preferences.${currentUser()?.username || "guest"}`;
}

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey()) || "{}");
    return { darkMode: saved.darkMode === true, showUnreadCount: saved.showUnreadCount !== false };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(preferences) {
  try {
    localStorage.setItem(preferenceKey(), JSON.stringify(preferences));
  } catch {
    toast("Settings could not be saved in this browser.", "error");
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = readPreferences().darkMode ? "dark" : "light";
}

applyTheme();

export function nav(item) {
  navItems.push(item);
}

export function hasRole(...roles) {
  return roles.flat().includes(getSession()?.user?.role);
}

export function currentUser() {
  return getSession()?.user;
}

function loginView(root) {
  const error = h("p", { class: "form-error", role: "alert", hidden: true });
  const form = h("form", { class: "login-form", novalidate: true },
    field("Username", h("input", { name: "username", autocomplete: "username", required: true, id: "login-username" })),
    field("Password", h("input", { name: "password", type: "password", autocomplete: "current-password", required: true, id: "login-password" })),
    error,
    h("button", { class: "primary block", type: "submit" }, "Sign in"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    error.hidden = true;
    try {
      setSession(await api("/api/auth/login", { method: "POST", body: data }));
      render();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    }
  });
  mount(root, h("main", { class: "login-shell" },
    h("section", { class: "login-panel", "aria-labelledby": "login-title" },
      h("div", { class: "brand brand-large" }, h("span", { class: "brand-mark", "aria-hidden": "true" }, "SA"), h("span", {}, "SecureAware")),
      h("h1", { id: "login-title" }, "Sign in"),
      h("p", { class: "muted" }, "Information security policy awareness and compliance for Biztat Solutions."),
      form,
        h("p", { class: "login-data-note" }, "Use only information approved by your institution. Do not enter real learner or sensitive personal data until privacy, access, retention, and hosting arrangements have been approved."))));
  form.querySelector("input").focus();
}

async function logout() {
  await api("/api/auth/logout", { method: "POST", body: {} }).catch(() => null);
  setSession(null);
  history.replaceState(null, "", "#/");
  render();
}

let unread = 0;
async function refreshUnread() {
  try {
    unread = (await api("/api/notifications")).unreadCount;
  } catch {
    unread = 0;
  }
  const bell = document.getElementById("notification-count");
  if (bell) {
    bell.textContent = unread ? String(unread) : "";
    bell.hidden = !unread || !readPreferences().showUnreadCount;
  }
}

function shell(root) {
  const user = currentUser();
  const content = h("div", { class: "workspace", id: "main-content" });
  const sections = new Map();
  for (const item of navItems.filter((entry) => !entry.roles || entry.roles.includes(user.role))) {
    if (!sections.has(item.section)) sections.set(item.section, []);
    sections.get(item.section).push(item);
  }
  const sidebar = h("nav", { class: "sidebar", id: "sidebar", "aria-label": "Main navigation" },
    [...sections].map(([section, items]) => h("div", { class: "nav-section" },
      h("p", { class: "nav-heading" }, section),
      h("ul", {}, items.map((item) => h("li", {}, h("a", { href: item.href, class: "nav-link", dataset: { match: item.match || item.href.slice(1) } }, h("span", { class: "nav-icon", "aria-hidden": "true" }, item.icon || "•"), item.label)))))));
  const menuButton = h("button", { type: "button", class: "icon-button menu-button", "aria-controls": "sidebar", "aria-expanded": "false", "aria-label": "Open menu",
    on: { click: () => {
      const open = sidebar.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
    } } }, "☰");
  mount(root,
    h("a", { class: "skip-link", href: "#main-content", on: { click: (event) => {
      event.preventDefault();
      content.querySelector("h1")?.focus();
    } } }, "Skip to main content"),
    h("div", { class: "app-shell" },
      h("header", { class: "topbar" },
        menuButton,
        h("a", { class: "brand", href: "#/" }, h("span", { class: "brand-mark", "aria-hidden": "true" }, "SA"), h("span", {}, "SecureAware"), h("span", { class: "brand-org" }, "Biztat Solutions")),
        h("div", { class: "topbar-actions" },
          h("a", { class: "icon-button bell", href: "#/notifications", "aria-label": "Notifications" }, "🔔", h("span", { class: "count", id: "notification-count", hidden: true })),
          h("div", { class: "user-chip" }, h("strong", {}, user.displayName), h("span", {}, `${user.role} · ${user.department}`)),
          h("button", { type: "button", on: { click: logout } }, "Sign out"))),
      sidebar,
      h("main", { class: "main" }, content)));
  refreshUnread();
  return content;
}

function markActive(path) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    const match = link.dataset.match;
    const active = path === match || (match !== "/" && path.startsWith(`${match}/`));
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.getElementById("sidebar")?.classList.remove("open");
}

let contentRoot = null;

async function renderRoute(entry) {
  const user = currentUser();
  if (!user) return undefined;
  if (!contentRoot || !document.body.contains(contentRoot)) contentRoot = shell(document.getElementById("app"));
  markActive(entry.path);
  window.scrollTo(0, 0);
  if (!entry.handler) {
    mount(contentRoot, emptyState("Page not found", "Check the address or use the menu.", h("a", { class: "button", href: "#/" }, "Go to home")));
    return undefined;
  }
  if (entry.roles && !entry.roles.includes(user.role)) {
    mount(contentRoot, emptyState("You do not have access to this page", "Your role does not include this feature."));
    return undefined;
  }
  document.title = entry.title ? `${entry.title} · SecureAware` : "SecureAware";
  await entry.handler(contentRoot, entry.params);
  const heading = contentRoot.querySelector("h1");
  if (heading) heading.focus({ preventScroll: true });
  return undefined;
}

export function render() {
  applyTheme();
  const root = document.getElementById("app");
  if (!getSession()) {
    contentRoot = null;
    return loginView(root);
  }
  contentRoot = null;
  return resolve();
}

function registerCorePages() {
  nav({ section: "Overview", label: "Home", href: "#/", match: "/", icon: "⌂" });
  nav({ section: "Administration", label: "Audit log", href: "#/audit", icon: "≡", roles: ADMIN_ROLES });

  route("/", (container) => {
    const user = currentUser();
    const cards = navItems.filter((item) => item.card && (!item.roles || item.roles.includes(user.role)));
    mount(container,
      pageHeader(`Welcome, ${user.displayName}`, "Your security awareness and compliance workspace."),
      h("div", { class: "card-grid" }, cards.map((item) => h("a", { class: "home-card", href: item.href },
        h("span", { class: "home-card-icon", "aria-hidden": "true" }, item.icon), h("strong", {}, item.label), h("span", { class: "muted" }, item.card)))));
  }, { title: "Home" });

  route("/notifications", (container) => withStates(container, () => api("/api/notifications"), (data) => h("div", {},
    pageHeader("Notifications", `${data.unreadCount} unread`),
    data.notifications.length ? h("ul", { class: "notification-list" }, data.notifications.map((note) => h("li", { class: ["notification", note.read_at ? "" : "unread"] },
      h("div", {}, h("strong", {}, note.title), h("p", {}, note.body), h("span", { class: "muted small" }, formatDateTime(note.created_at))),
      h("div", { class: "notification-actions" },
        note.link ? h("a", { class: "button", href: note.link }, "Open") : null,
        note.read_at ? null : h("button", { type: "button", on: { click: async () => {
          await api(`/api/notifications/${note.id}/read`, { method: "POST", body: {} });
          refreshUnread();
          resolve();
        } } }, "Mark as read"))))) : emptyState("No notifications yet", "Reminders and new assignments will appear here."))), { title: "Notifications" });

  route("/settings", (container) => {
    let preferences = readPreferences();
    const darkMode = h("input", { type: "checkbox", id: "setting-dark-mode", checked: preferences.darkMode,
      on: { change: () => {
        preferences = { ...preferences, darkMode: darkMode.checked };
        savePreferences(preferences);
        applyTheme();
      } } });
    const showUnreadCount = h("input", { type: "checkbox", id: "setting-unread-count", checked: preferences.showUnreadCount,
      on: { change: () => {
        preferences = { ...preferences, showUnreadCount: showUnreadCount.checked };
        savePreferences(preferences);
        refreshUnread();
      } } });
    const resetPreferences = h("button", { type: "button", on: { click: () => {
      preferences = { ...DEFAULT_PREFERENCES };
      savePreferences(preferences);
      darkMode.checked = preferences.darkMode;
      showUnreadCount.checked = preferences.showUnreadCount;
      applyTheme();
      refreshUnread();
    } } }, "Reset preferences");
    const preferencesPanel = h("section", { class: "panel settings-panel", "aria-labelledby": "settings-preferences-title" },
      h("h2", { id: "settings-preferences-title" }, "Preferences"),
      h("p", { class: "muted" }, "These choices are saved for this account in this browser."),
      h("label", { class: "settings-toggle", for: "setting-dark-mode" }, h("span", {}, "Dark mode"), darkMode),
      h("label", { class: "settings-toggle", for: "setting-unread-count" }, h("span", {}, "Show unread notification count"), showUnreadCount),
      resetPreferences);
    const newPassword = h("input", { type: "password", name: "newPassword", autocomplete: "new-password", required: true, minlength: "15", id: "pw-new" });
    const confirmPassword = h("input", { type: "password", name: "confirmPassword", autocomplete: "new-password", required: true, minlength: "15", id: "pw-confirm" });
    const form = h("form", { class: "stack settings-password-form" },
      field("Current password", h("input", { type: "password", name: "currentPassword", autocomplete: "current-password", required: true, id: "pw-current" })),
      field("New password", newPassword,
        "At least 15 characters. No special-character rules: a passphrase of four or more unrelated words is strong and easy to remember. Common and breached passwords are refused."),
      field("Confirm new password", confirmPassword),
      h("button", { class: "primary", type: "submit" }, "Change password"));
    confirmPassword.addEventListener("input", () => confirmPassword.setCustomValidity(""));
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (newPassword.value !== confirmPassword.value) {
        confirmPassword.setCustomValidity("The new passwords do not match.");
        confirmPassword.reportValidity();
        return;
      }
      try {
        await api("/api/auth/password", { method: "POST", body: { currentPassword: form.elements.currentPassword.value, newPassword: newPassword.value } });
        form.reset();
        toast("Password changed. Other sessions have been signed out.");
      } catch (error) {
        toast(error.message, "error");
      }
    });
    const passwordPanel = h("section", { class: "panel settings-panel", "aria-labelledby": "settings-password-title" },
      h("h2", { id: "settings-password-title" }, "Change password"),
      h("p", { class: "muted" }, "Follows NIST SP 800-63B-4: length over complexity, with no forced expiry."),
      form);
    mount(container, pageHeader("Settings", "Preferences and account security."), h("div", { class: "settings-grid" }, preferencesPanel, passwordPanel));
  }, { title: "Settings" });

  route("/audit", (container) => withStates(container, () => api("/api/foundation/audit"), (data) => h("div", {},
    pageHeader("Audit log", "Latest 200 security-relevant events. Passwords, session IDs and quiz answers are never logged.",
      h("button", { type: "button", on: { click: () => download("/api/foundation/audit.csv", "audit.csv").catch((error) => toast(error.message, "error")) } }, "Export CSV")),
    table([
      { label: "Time", render: (row) => formatDateTime(row.created_at) },
      { label: "Actor", render: (row) => row.username || "system" },
      { label: "Action", render: (row) => badge(row.action, row.action.includes("DENIED") || row.action.includes("FAILED") || row.action.includes("REJECTED") ? "danger" : "neutral") },
      { label: "Target", key: "target" }
    ], data.auditEvents, { caption: "Audit events" }))), { title: "Audit log", roles: ADMIN_ROLES });
}

export function boot(modules) {
  registerCorePages();
  modules.forEach((module) => module.register({ route, nav, navigate }));
  nav({ section: "Account", label: "Settings", href: "#/settings", icon: "⚙" });
  window.addEventListener("hashchange", () => {
    if (getSession() && currentPath() !== "/notifications") refreshUnread();
  });
  if (getSession()) {
    // Confirm the stored session is still valid before showing the app.
    api("/api/me").then((me) => {
      setSession({ ...getSession(), user: me.user, csrfToken: me.csrfToken });
      start(renderRoute);
    }).catch(() => {
      setSession(null);
      render();
      start(renderRoute);
    });
  } else {
    render();
    start(renderRoute);
  }
}

export { navigate, refreshUnread };
