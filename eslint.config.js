//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    files: ['*.js'],
    rules: {
      // Disable TypeScript-specific rules for JavaScript config files
    },
  },
  {
    rules: {
      // Allow defensive null/undefined checks even when types suggest they're not needed
      // This is good practice for runtime safety and handling edge cases
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    ignores: ['eslint.config.js', 'prettier.config.js', 'convex/_generated/**'],
  },
]
