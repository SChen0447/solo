import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/upload': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/export': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
