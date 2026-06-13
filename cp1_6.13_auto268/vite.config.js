import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: true
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
