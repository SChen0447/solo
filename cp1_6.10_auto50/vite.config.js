import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 5173,
    hmr: true,
    host: true
  }
});
