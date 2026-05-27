import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    reporters: ['default'],
    include: ['**/tests/**/*.test.ts'],
    testTimeout: 30000,
  },
});
