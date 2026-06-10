import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist'
  },
  server: {
    port: 8000,
    hmr: true
  }
});
