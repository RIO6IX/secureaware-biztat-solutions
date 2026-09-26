import { migrate } from "./schema.js";
import { seedCourses } from "./seed.js";
import { createStore } from "./store.js";
import { asObject } from "./validate.js";
import registerLearner from "./routes/learner.js";

export const prefix = "/api/training/";

const JSON_LIMIT_BYTES = 64 * 1024;
const routes = [];
let foundation;
let store;

function route(method, pattern, handler, options = {}) {
  const keys = [];
  const source = pattern.replace(/:([a-zA-Z]+)/g, (_, key) => {
    keys.push(key);
    return "([^/]+)";
  });
  routes.push({ method, regex: new RegExp(`^${source}$`), keys, handler, roles: options.roles || null, bodyLimit: options.bodyLimit || JSON_LIMIT_BYTES });
}

export function init(shared) {
  foundation = shared;
  migrate(foundation.db);
  seedCourses(foundation.db);
  store = createStore(foundation.db);
  const deps = { route, store, foundation };
  registerLearner(deps);
}

export async function handle(request, response, url, context) {
  const path = url.pathname.slice(prefix.length - 1);
  const candidates = routes.filter((entry) => entry.regex.test(path));
  if (!candidates.length) return foundation.sendJson(response, 404, { message: "Not found" });
  const matched = candidates.find((entry) => entry.method === request.method);
  if (!matched) return foundation.sendJson(response, 405, { message: "Method not allowed" });
  // Identity always comes from the server-side session, never from the request.
  const user = context.user;
  if (matched.roles && !foundation.hasRole(user, matched.roles)) {
    foundation.audit(user.id, "TRAINING_ACCESS_DENIED", `${request.method} ${url.pathname}`, request);
    return foundation.sendJson(response, 403, { message: "You do not have permission for this action" });
  }
  const values = path.match(matched.regex).slice(1).map((value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return "";
    }
  });
  const params = Object.fromEntries(matched.keys.map((key, index) => [key, values[index]]));
  const ctx = {
    request,
    response,
    url,
    user,
    params,
    query: url.searchParams,
    send: (status, body) => foundation.sendJson(response, status, body),
    body: async () => asObject(await foundation.readJson(request, matched.bodyLimit)),
    audit: (action, target) => foundation.audit(user.id, action, target, request)
  };
  return matched.handler(ctx);
}
