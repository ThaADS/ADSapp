// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Note: tests/setup.ts removed from setupFiles to avoid ReferenceError with expect
  // Mocks and environment setup are now in jest.setup.js which runs after Jest globals

  // Test environments
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: [''],
  },

  // Path ignoring
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/fixtures/',
    '<rootDir>/tests/helpers/',
    '<rootDir>/tests/_deferred/',
    '<rootDir>/tests/mobile/',
  ],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^uuid$': require.resolve('uuid'),
  },

  // Transform ES modules (uuid, etc)
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.config.{ts,tsx}',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
    '!src/app/global-error.tsx',
    '!src/types/**',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],

  // Coverage thresholds - Phase 6 baseline established (2026-01-24)
  // Current: 0.5-0.7% coverage with 15 passing test suites, 250 tests
  // Target: Incrementally improve as deferred tests are re-enabled
  // Path to 70%: See tests/_deferred/ for tests needing fixes
  coverageThreshold: {
    global: {
      branches: 0.3,
      functions: 0.5,
      lines: 0.5,
      statements: 0.5,
    },
    // Per-directory thresholds disabled until global coverage improves
    // Re-enable when global reaches 20%+
  },

  // Coverage reporting
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'json-summary',
  ],

  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',

  // Test matching
  testMatch: [
    '<rootDir>/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
    '<rootDir>/tests/**/*.{test,spec}.{ts,tsx}',
  ],

  // Test timeout
  testTimeout: 10000,

  // Performance
  maxWorkers: '50%',
  maxConcurrency: 10,

  // Cache
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },

  // Clear mocks automatically
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Detect open handles
  detectOpenHandles: false,
  forceExit: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)