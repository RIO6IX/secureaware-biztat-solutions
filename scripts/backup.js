import fs from "node:fs";
import path from "node:path";

const source = process.env.SECUREAWARE_DB || path.resolve("data", "secureaware.sqlite");
const backupDir = path.resolve("data", "backups");
fs.mkdirSync(backupDir, { recursive: true });
if (!fs.existsSync(source)) {
  console.error(`Database not found: ${source}`);
  process.exit(1);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `secureaware-${stamp}.sqlite`);
fs.copyFileSync(source, target);
console.log(target);
