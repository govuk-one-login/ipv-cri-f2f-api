import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      enabled: true,
      provider: "v8",
      reportsDirectory: "coverage",
    },
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
  },
});
