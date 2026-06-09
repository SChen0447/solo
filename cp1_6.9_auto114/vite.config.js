import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: 'localhost',
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
  },
});
