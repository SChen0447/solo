import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: true,
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020'
  }
});
