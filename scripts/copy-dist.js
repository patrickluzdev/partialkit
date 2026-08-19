import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const target = new URL("../docs/public/dist/", import.meta.url);

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(new URL("../dist/", import.meta.url), target, { recursive: true });

console.log(`copied ${root}dist -> docs/public/dist`);
