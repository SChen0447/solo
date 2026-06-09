import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    strictPort: false,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  },
  esbuild: {
    target: 'es2020'
  }
});
