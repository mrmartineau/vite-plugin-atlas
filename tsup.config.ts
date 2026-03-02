import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      'plugin/index': 'src/plugin/index.ts',
      'types/index': 'src/types/index.ts',
      'ui/index': 'src/ui/index.ts',
      'api/routes': 'src/api/routes.ts',
      'api/context-generator': 'src/api/context-generator.ts',
      'api/json-serializers': 'src/api/json-serializers.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node18',
    external: ['vite', 'react', 'react-dom', 'typescript', /^virtual:atlas-/],
  },
  {
    entry: {
      'cli/index': 'src/cli/index.ts',
    },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    target: 'node18',
    external: ['vite', 'react', 'react-dom', 'typescript'],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
])
