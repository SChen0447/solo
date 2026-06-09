import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@types/three': path.resolve(__dirname, 'node_modules/@types/three')
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
