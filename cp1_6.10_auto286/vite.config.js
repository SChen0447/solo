import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    hmr: true,
    open: true
  },
  root: '.',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
