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
      reporter: ['text', 'json', 'html'],
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
  esbuild: {
    target: 'node22',
  },
});
