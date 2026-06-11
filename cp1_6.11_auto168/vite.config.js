import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  root: '.',
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
