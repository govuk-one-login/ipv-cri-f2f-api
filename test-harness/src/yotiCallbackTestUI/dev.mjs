import { build } from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * this basically simulates exactly what esbuild would do when deploying UiFunction
 * keeping the dev server aligned in this way means that what runs locally is also what runs in the lambda
 */
const here = dirname(fileURLToPath(import.meta.url));

const outfile = join(here, ".build/local.mjs");

await build({
  entryPoints: [join(here, "handler/local-handler.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2024",
  sourcemap: "inline",
  loader: {
    ".css": "text",
    ".njk": "text",
    ".svg": "text",
    ".woff2": "dataurl",
  },
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});

await import(pathToFileURL(outfile).href);
