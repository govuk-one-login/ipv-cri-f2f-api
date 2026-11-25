import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// The Yoti callback test UI bundles .njk templates and .svg files as text (see the esbuild Loader in template.yaml)
const bundledAsText = {
  name: "bundled-as-text",
  enforce: "pre" as const,
  load(id: string) {
    if (/\.(njk|svg)$/.test(id)) {
      return `export default ${JSON.stringify(readFileSync(id, "utf8"))};`;
    }
  },
};

export default defineConfig({
  plugins: [bundledAsText],
  test: {
    clearMocks: true,
    reporters: ["default"],
    coverage: {
      enabled: true,
      exclude: [
        "**/tests/**",
        "vitest.config.ts",
        "yotiCallbackTestUI/handler/local-handler.ts", // starts a dev server on import
      ],
      provider: "v8",
      reportsDirectory: "coverage",
    },
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
  },
});
