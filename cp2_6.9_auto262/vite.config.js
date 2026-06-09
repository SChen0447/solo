import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    https: false,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
