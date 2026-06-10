import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild'
  },
  esbuild: {
    target: 'es2020',
    strict: true
  }
});
