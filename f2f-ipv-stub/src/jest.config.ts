/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  verbose: true,
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.m?[tj]sx?$": ["babel-jest", { presets: ["@babel/preset-env"] }],
  },
  clearMocks: true,
  reporters: ["default"],
  collectCoverageFrom: [
    "./**/*.ts",
    "!./**/tests/**/*.ts",
    "!./tests/**/*.ts",
    "!./jest.config.ts",
  ],
  transformIgnorePatterns: ["node_modules"],
  collectCoverage: true,
  testMatch: ["**/tests/**/*.test.ts"],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "node",
  moduleDirectories: ["node_modules"],
};
