import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'public',
  publicDir: '../static',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: { input: { main: resolve('public/index.html'), chair: resolve('public/chair/index.html') } },
  },
});
