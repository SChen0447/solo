import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist'
  },
  server: {
    host: true,
    port: 8080
  }
});
