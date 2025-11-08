// @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      'no-console': 'error',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.convex/**',
      'convex/_generated/**',
      'src/routeTree.gen.ts',
      'eslint.config.js',
      'prettier.config.js',
      'vite.config.ts',
    ],
  },
]
