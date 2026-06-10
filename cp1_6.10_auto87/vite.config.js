import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false,
    hmr: true,
    host: true
  }
});
