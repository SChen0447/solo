import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
