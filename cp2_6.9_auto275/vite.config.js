import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    open: false
  },
  build: {
    outDir: 'dist'
  }
});
