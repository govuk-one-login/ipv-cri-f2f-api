/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  transform: {
    '^.+\\.ts?$': [
      'esbuild-jest',
      {
        sourcemap: true
      }
    ]
  },
  clearMocks: true,
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'results', outputName: 'report.xml' }]
  ],
  collectCoverage: false,
  coverageProvider: 'v8',
  testMatch: ['**/*.test.ts'],
  testEnvironment: 'node'
}
