import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: process.cwd(),
  base: './',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
