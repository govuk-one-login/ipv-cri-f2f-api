import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['./**/*.ts'],
      exclude: [
        './**/tests/**/*.ts',
        './tests/**/*.ts',
        './vitest.config.ts',
      ],
    },
    include: ['**/tests/**/*.test.ts'],
    testTimeout: 30000,
  },
});
