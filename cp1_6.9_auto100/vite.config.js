import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@types/three': path.resolve(__dirname, 'node_modules/@types/three')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    open: true
  }
});
