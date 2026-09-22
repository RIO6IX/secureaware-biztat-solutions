import fs from "node:fs";
import path from "node:path";

const backup = process.argv[2];
if (!backup) {
  console.error("Usage: npm run restore -- <backup.sqlite>");
  process.exit(64);
}
const target = process.env.SECUREAWARE_DB || path.resolve("data", "secureaware.sqlite");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(path.resolve(backup), target);
console.log(target);
