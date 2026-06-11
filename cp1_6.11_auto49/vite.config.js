import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [],
  build: {
    target: 'es2020',
  },
  server: {
    open: true,
  },
});
