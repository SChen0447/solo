import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    hmr: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
