import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: process.cwd(),
  server: {
    port: 5173,
    open: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true
  }
});
