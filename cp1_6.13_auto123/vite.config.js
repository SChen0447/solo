import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: 'localhost',
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
