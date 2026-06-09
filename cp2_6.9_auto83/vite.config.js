import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 3000,
    strictPort: false,
    open: false
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
