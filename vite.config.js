import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'public',
  publicDir: false,
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: { input: { main: resolve('public/index.html'), microwave: resolve('public/microwave/index.html'), prototype: resolve('public/microwave/prototype/index.html'), chair: resolve('public/chair/index.html') } },
  },
});
