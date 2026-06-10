import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    hmr: true
  },
  build: {
    outDir: 'dist'
  }
});
