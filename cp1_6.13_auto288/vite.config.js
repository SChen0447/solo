import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    host: true,
    port: 5173,
    open: true,
    hmr: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
