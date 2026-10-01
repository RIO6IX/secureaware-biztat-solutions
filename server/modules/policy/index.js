import { migrate } from "./schema.js";
import { seedPolicies, seedPolicyDemoActivity } from "./seed.js";
import { createStore } from "./store.js";
import { asObject } from "./validate.js";
import { purgeExpiredPolicyEvidence } from "./retention.js";
import registerEmployee from "./routes/employee.js";
import registerAuthoring from "./routes/authoring.js";
import registerReview from "./routes/review.js";
import registerAssign from "./routes/assign.js";
import registerCompliance from "./routes/compliance.js";
import registerQueues from "./routes/queues.js";

export const prefix = "/api/policy/";

const JSON_LIMIT_BYTES = 64 * 1024;
const routes = [];
let foundation;

// Same small router as the training module: each route declares its method, a path pattern
// with :params, the roles allowed (checked on the server) and its body size limit.
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
  seedPolicies(foundation.db);
  const store = createStore(foundation.db);
  const deps = { route, store, foundation };
  registerEmployee(deps);
  registerAuthoring(deps);
  registerReview(deps);
  registerAssign(deps);
  registerCompliance(deps);
  registerQueues(deps);
  seedPolicyDemoActivity(foundation.db);
  purgeExpiredPolicyEvidence(foundation.db, foundation.audit);
}

export async function handle(request, response, url, context) {
  const path = url.pathname.slice(prefix.length - 1);
  const candidates = routes.filter((entry) => entry.regex.test(path));
  if (!candidates.length) return foundation.sendJson(response, 404, { message: "Not found" });
  const matched = candidates.find((entry) => entry.method === request.method);
  if (!matched) return foundation.sendJson(response, 405, { message: "Method not allowed" });
  // The acting user always comes from the server-side session, never from the request.
  const user = context.user;
  if (matched.roles && !foundation.hasRole(user, matched.roles)) {
    foundation.audit(user.id, "POLICY_ACCESS_DENIED", `${request.method} ${url.pathname}`, request);
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
