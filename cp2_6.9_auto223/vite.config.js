import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    open: true
  },
  build: {
    sourcemap: true,
    outDir: 'dist'
  }
});
