import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shaders': path.resolve(__dirname, './src/shaders'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@components': path.resolve(__dirname, './src/components')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  }
});
