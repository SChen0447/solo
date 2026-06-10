import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    open: true
  },
  assetsInclude: ['**/*.glsl'],
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  }
});
