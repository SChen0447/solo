import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  base: './',
  server: {
    port: 5173,
    open: false
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
