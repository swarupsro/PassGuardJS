import { defineConfig } from 'tsup';

export default defineConfig([
  {
    clean: false,
    dts: true,
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    minify: false,
    sourcemap: true,
    splitting: false,
    target: 'es2020',
    treeshake: true,
  },
  {
    clean: false,
    entry: { 'passguard.min': 'src/index.ts' },
    format: ['iife'],
    globalName: 'PassGuard',
    minify: true,
    sourcemap: false,
    target: 'es2020',
    platform: 'browser',
  },
]);
