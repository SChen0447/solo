import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: true
  },
  esbuild: {
    target: 'es2020'
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true
  }
});
