import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: true,
  },
  esbuild: {
    target: 'es2020',
  },
  server: {
    port: 8080,
    open: true,
  },
});
