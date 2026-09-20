import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 4000);

function contentType(filePath) {
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

function serveFile(response, requestPath) {
  const resolved = path.normalize(path.join(publicDir, requestPath === "/" ? "index.html" : requestPath));
  if (!resolved.startsWith(publicDir)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const filePath = fs.existsSync(resolved) && fs.statSync(resolved).isFile()
    ? resolved
    : path.join(publicDir, "index.html");
  response.writeHead(200, {
    "content-type": contentType(filePath),
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  if (url.pathname === "/api/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  serveFile(response, url.pathname);
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, "127.0.0.1", () => {
    console.log(`SecureAware running at http://127.0.0.1:${port}`);
  });
}

export default server;
