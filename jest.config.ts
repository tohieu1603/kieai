import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // uuid v10+ ships pure ESM; tell ts-jest/jest to transform it instead of ignoring
  transformIgnorePatterns: ['/node_modules/(?!(uuid)/)'],
  setupFilesAfterEnv: [],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/seeds/**',
    '!src/types/**',
    '!src/entities/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
};

export default config;
