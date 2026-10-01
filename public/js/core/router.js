// Hash router: deep links like #/training/phishing-social-engineering/lesson/2 and a working
// Back button. Route guards only improve the UI; the server enforces every permission.

const routes = [];
let renderPage = null;
let current = null;

export function route(pattern, handler, options = {}) {
  const keys = [];
  const source = pattern.replace(/:([a-zA-Z]+)/g, (_, key) => {
    keys.push(key);
    return "([^/?]+)";
  });
  routes.push({ pattern, regex: new RegExp(`^${source}/?$`), keys, handler, roles: options.roles || null, title: options.title || "" });
}

export function currentPath() {
  const hash = location.hash.replace(/^#/, "") || "/";
  return hash.split("?")[0];
}

export function currentQuery() {
  const hash = location.hash.replace(/^#/, "");
  const index = hash.indexOf("?");
  return new URLSearchParams(index >= 0 ? hash.slice(index + 1) : "");
}

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) return resolve();
  if (replace) {
    history.replaceState(null, "", target);
    return resolve();
  }
  location.hash = path;
  return undefined;
}

export function start(render) {
  renderPage = render;
  window.addEventListener("hashchange", resolve);
  return resolve();
}

export function resolve() {
  const path = currentPath();
  for (const entry of routes) {
    const match = entry.regex.exec(path);
    if (!match) continue;
    let params;
    try {
      params = Object.fromEntries(entry.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
    } catch {
      break;
    }
    current = { ...entry, params, path };
    return renderPage(current);
  }
  current = { pattern: "*", params: {}, path, handler: null };
  return renderPage(current);
}

export function activeRoute() {
  return current;
}
