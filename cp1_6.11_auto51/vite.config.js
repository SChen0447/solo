import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  build: {
    target: 'es2020',
  },
});
