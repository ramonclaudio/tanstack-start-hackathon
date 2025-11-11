//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
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
