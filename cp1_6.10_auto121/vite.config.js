import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    hmr: true,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
