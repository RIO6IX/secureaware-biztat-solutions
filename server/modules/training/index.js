import { migrate } from "./schema.js";
import { seedCourses, seedDemoActivity } from "./seed.js";
import { createStore } from "./store.js";
import { asObject } from "./validate.js";
import registerLearner from "./routes/learner.js";
import registerTeam from "./routes/team.js";
import registerQuiz from "./routes/quiz.js";
import registerMe from "./routes/me.js";
import registerAdminCourses from "./routes/admin-courses.js";
import registerAdminAssign from "./routes/admin-assign.js";
import registerReports from "./routes/reports.js";
import { createMatrix } from "./matrix.js";

export const prefix = "/api/training/";

const JSON_LIMIT_BYTES = 64 * 1024;
const routes = [];
let foundation;
let store;
let matrix;

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
  matrix = createMatrix(foundation.db, foundation.notify);
  // hooks lets one route group react to another (publishing a course applies the matrix).
  const deps = { route, store, foundation, matrix, hooks: { afterPublish: () => matrix.reconcileAll() } };
  registerLearner(deps);
  registerTeam(deps);
  registerQuiz(deps);
  registerMe(deps);
  registerAdminCourses(deps);
  registerAdminAssign(deps);
  registerReports(deps);
  matrix.reconcileAll();
  seedDemoActivity(foundation.db);
}

// Foundation hook: runs after every successful login, which picks up new users and
// role or department changes for the Training Needs Matrix.
export function onLogin(user) {
  matrix.reconcileUser(user);
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
