import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 8080,
    host: true,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
