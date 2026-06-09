import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 3000,
    strictPort: true,
    open: true
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
});
