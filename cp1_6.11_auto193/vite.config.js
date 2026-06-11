import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    target: 'es2020'
  }
});
