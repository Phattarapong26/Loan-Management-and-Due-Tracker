import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/server.ts'],
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    splitting: false,
    dts: false,
    shims: true,
    minify: false,
    external: ['puppeteer', 'canvas', 'sharp'],
});
