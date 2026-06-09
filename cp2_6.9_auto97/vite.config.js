import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 3000,
    strictPort: true,
    open: false
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: true
  },
  esbuild: {
    target: 'es2020',
    strict: true
  }
});
