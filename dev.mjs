#!/usr/bin/env node
// Local preview: builds the site, serves it on http://localhost:4000 and
// rebuilds whenever you save a note in Obsidian or edit src/.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(ROOT, "site");
const PORT = Number(process.env.PORT) || 4000;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json", ".pdf": "application/pdf",
};

// Each rebuild runs in a fresh process so edits to src/templates.mjs are picked up too.
const safeBuild = () => spawnSync(process.execPath, [path.join(ROOT, "build.mjs")], { stdio: "inherit" });
safeBuild();

let timer;
for (const dir of ["vault", "src"]) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, (_, file) => {
    if (file && file.includes(".obsidian")) return;
    clearTimeout(timer);
    timer = setTimeout(safeBuild, 150);
  });
}
fs.watch(path.join(ROOT, "site.config.json"), () => { clearTimeout(timer); timer = setTimeout(safeBuild, 150); });

http.createServer((req, res) => {
  let file = path.join(SITE, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(SITE)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) { res.writeHead(404, { "content-type": "text/plain" }).end("Not found"); return; }
  const size = fs.statSync(file).size;
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) { // lets Safari play video
    const start = Number(range[1] || 0), end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-length": end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { "content-type": type, "content-length": size, "accept-ranges": "bytes" });
    fs.createReadStream(file).pipe(res);
  }
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}  (Ctrl+C to stop)`));
