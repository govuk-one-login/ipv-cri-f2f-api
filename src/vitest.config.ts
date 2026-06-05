import dotenv from "dotenv";
import { defineConfig } from 'vitest/config';

dotenv.config();

const junitOutputFile = process.env.VITEST_JUNIT_OUTPUT_NAME
  ? `./results/${process.env.VITEST_JUNIT_OUTPUT_NAME}`
  : './results/report.xml';

export default defineConfig({
  plugins: [{
    name: 'test-asset-file-paths',
    transform(_code: string, id: string) {
      if (/\.(png|ttf)$/.test(id)) {
        return `export default ${JSON.stringify(id)};`;
      }
    },
  }],
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: junitOutputFile,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['./**/*.ts'],
      exclude: [
        './**/tests/**/*.ts',
        './tests/**/*.ts',
        './vitest.config.ts',
        'config.ts',
      ],
    },
    include: ['**/tests/**/*.test.ts'],
    testTimeout: 30000,
  },
});
