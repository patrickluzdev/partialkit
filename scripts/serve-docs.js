import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Serves the built docs. Tests run against the same output that ships, and this
// avoids dev-server lifecycles that differ between environments.
const root = fileURLToPath(new URL("../docs/dist/", import.meta.url));
const port = Number(process.env.PORT ?? 4321);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".xml": "application/xml; charset=utf-8",
};

function resolve(pathname) {
  const relative = normalize(decodeURIComponent(pathname).replace(/^\/+/, ""));
  if (relative.startsWith("..") || relative.startsWith(sep)) return undefined;
  return pathname.endsWith("/") || extname(relative) === ""
    ? join(root, relative, "index.html")
    : join(root, relative);
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const file = resolve(pathname);

  if (!file) {
    response.writeHead(403).end("forbidden");
    return;
  }

  try {
    const body = await readFile(file);
    response.writeHead(200, {
      "content-type": contentTypes[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`partialkit docs: http://127.0.0.1:${port}`);
});
