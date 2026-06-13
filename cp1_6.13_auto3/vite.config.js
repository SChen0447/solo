import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    host: 'localhost',
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist'
  }
});
