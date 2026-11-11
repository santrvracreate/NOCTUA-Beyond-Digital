import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
await import("./build.mjs");
const root = resolve("dist");
createServer(async (req, res) => {
  try {
    const file = resolve(root, "." + decodeURIComponent(req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0]));
    if (!file.startsWith(root + "/") && !file.startsWith(root + "\\")) {
      res.writeHead(403).end();
      return;
    }
    const body = await readFile(file);
    res.setHeader("Content-Type", { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".ico": "image/x-icon" }[extname(file)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.end(body);
  } catch {
    res.writeHead(404).end("No encontrado");
  }
}).listen(4173, "127.0.0.1", () => console.log("NOCTUA http://127.0.0.1:4173"));
