import { defineConfig } from 'vitest/config';

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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['./**/*.ts'],
      exclude: [
        './**/tests/**/*.ts',
        './tests/**/*.ts',
        './vitest.config.ts',
        'config.ts',
      ],
    },
    include: ['**/tests/**/*.test.ts'],
    testTimeout: 120000,
  },
  esbuild: {
    target: 'node22',
  },
});
