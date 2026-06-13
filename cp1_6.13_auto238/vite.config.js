import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    host: true,
    open: false
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: true,
    minify: 'esbuild'
  },
  esbuild: {
    target: 'es2020'
  }
});
