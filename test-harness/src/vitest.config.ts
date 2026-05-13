import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./results/report.xml",
    },
    coverage: {
      enabled: true,
      exclude: ["**/tests/**", "vitest.config.ts"],
      provider: "v8",
      reportsDirectory: "coverage",
    },
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
  },
});
