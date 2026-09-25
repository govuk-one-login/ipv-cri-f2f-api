import { createRequire } from 'node:module';

const requireFromCanonicalManifest = createRequire(
  new URL('../../src/package.json', import.meta.url),
);
const ts = requireFromCanonicalManifest('@typescript-eslint/eslint-plugin');
const tsParser = requireFromCanonicalManifest('@typescript-eslint/parser');

export default [
  {
    ignores: [
      "**/*.js",
      "**/*.cjs",
      "dist",
      "**/*.d.ts",
      "**/*.config.ts",
      "**/*.setup.ts",
      "__tests__",
      "eslint.config.mjs",
      "**/eslint.config.mjs",
      "**/build"
  ]
},{
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      ...ts.configs.recommended.rules,
    },
  },
  {
    languageOptions: {
      globals: {
        process: true,
        __dirname: true,
        __filename: true,
        require: true,
        module: true,
        exports: true,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      'no-console': 'off', // Allow console logs in backend
      'no-process-exit': 'off', // Allow process.exit()
    },
  },
];
