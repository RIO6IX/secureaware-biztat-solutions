import { migrate } from "./schema.js";
import { seedCourses } from "./seed.js";

export const prefix = "/api/training/";

let foundation;

export function init(shared) {
  foundation = shared;
  migrate(foundation.db);
  seedCourses(foundation.db);
}

export async function handle(request, response) {
  return foundation.sendJson(response, 404, { message: "Not found" });
}
