/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.m?[tj]sx?$": ["babel-jest", { presets: ["@babel/preset-env"] }],
  },
  clearMocks: true,
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'results', outputName: 'report.xml' }]
  ],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: 'v8',
  testMatch: ['**/*.test.ts'],
  testEnvironment: 'node'
}
