import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist'
  },
  server: {
    strictPort: false,
    port: 5173
  }
});
