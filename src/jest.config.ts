/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */


const dotenv = require('dotenv');
dotenv.config();

export default {
  verbose: true,
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.m?[tj]sx?$': ['babel-jest', { presets: ['@babel/preset-env'] }],
    '\\.(png|ttf)$':'<rootDir>/tests/unit/utils/fileMapper.cjs',
  },
  transformIgnorePatterns: ['/node_modules/(?!(pdf-merger-js)/)'],
  testTimeout: 30000,
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coveragePathIgnorePatterns: ['config.ts', 'node_modules/'],
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: [
    './jest.setup.ts'
  ],
  collectCoverageFrom: [
    './**/*.ts',
    '!./**/tests/**/*.ts',
    '!./tests/**/*.ts',
    '!./jest.config.ts'
  ],
  testEnvironment: 'node',
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'results', outputName: 'report.xml' }],
    ["./node_modules/jest-html-reporter", {
      "pageTitle": "F2F Test Report",
      "outputPath": "results/test-report.html"
    }]
  ],
  moduleDirectories: ['node_modules', 'static'],
  moduleFileExtensions: ["js", "mjs", "cjs", "jsx", "ts", "mts", "cts", "tsx", "json", "node"]
}
