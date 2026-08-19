import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "node:fs/promises";

/**
 * Validates every internal link in the built site: that it carries the base
 * prefix, and that it resolves to a page that exists. Run after docs:build.
 */
const dist = fileURLToPath(new URL("../docs/dist/", import.meta.url));
const base = (process.env.PAGES_BASE ?? "/").replace(/\/+$/, "");

const LINK = /(?:href|src)="([^"]+)"/g;
const SKIP = /^(https?:|mailto:|tel:|data:|#|\/\/)/;

/** Where the page lives in the output, which is what a relative link resolves against. */
function directoryOf(file) {
  const parts = file.replaceAll("\\", "/").split("/");
  parts.pop();
  return parts.join("/");
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function resolves(url) {
  const withoutBase = base && url.startsWith(base) ? url.slice(base.length) : url;
  const clean = withoutBase.split(/[?#]/)[0] || "/";
  const target = join(dist, clean);

  if (await exists(target)) {
    return clean.endsWith("/") || !clean.includes(".") ? exists(join(target, "index.html")) : true;
  }
  return exists(join(dist, `${clean.replace(/\/$/, "")}.html`));
}

const problems = [];
let checked = 0;

for await (const file of glob("**/*.html", { cwd: dist })) {
  const html = await readFile(join(dist, file), "utf8");
  const directory = directoryOf(file);

  for (const [, raw] of html.matchAll(LINK)) {
    const url = raw.replace(/&amp;/g, "&");
    if (SKIP.test(url)) continue;

    checked++;

    // Relative links resolve against the page, so they survive any base — but they
    // still have to point at something.
    if (!url.startsWith("/")) {
      const resolved = new URL(url, `http://x/${directory}${directory ? "/" : ""}`).pathname;
      if (!(await resolves(resolved))) {
        problems.push(`${file}: "${url}" resolves to "${resolved}", which does not exist`);
      }
      continue;
    }

    if (base && !(url === base || url.startsWith(`${base}/`))) {
      problems.push(`${file}: "${url}" is missing the base prefix "${base}"`);
      continue;
    }
    if (!(await resolves(url))) {
      problems.push(`${file}: "${url}" does not resolve to anything in docs/dist`);
    }
  }
}

if (problems.length > 0) {
  console.error(`${problems.length} broken link(s):\n`);
  for (const problem of [...new Set(problems)].sort()) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`${checked} internal links checked, all resolve (base "${base || "/"}")`);
