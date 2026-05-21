import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    reporters: ["default", "junit"],
    outputFile: {
      junit: "./results/report.xml",
    },
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
  },
});
