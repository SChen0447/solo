import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false
  }
});
