import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT ?? 4321);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  const requested = path === "/" ? "site/index.html" : decodeURIComponent(path).slice(1);
  const relative = normalize(requested);

  if (relative.startsWith("..") || relative.startsWith(sep)) {
    response.writeHead(403).end("forbidden");
    return;
  }

  try {
    const body = await readFile(join(root, relative));
    response.writeHead(200, {
      "content-type": contentTypes[extname(relative)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("not found");
  }
}).listen(port, () => {
  console.log(`partialkit site: http://localhost:${port}`);
});
