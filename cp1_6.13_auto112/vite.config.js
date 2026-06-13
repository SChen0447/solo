import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          $primary-color: #E05A3F;
          $primary-dark: #C94A2F;
          $bg-color: #FDF5E6;
          $text-dark: #3E3E3E;
          $text-light: #7A7A7A;
          $card-shadow: 0 4px 20px rgba(62, 62, 62, 0.08);
          $card-shadow-hover: 0 8px 30px rgba(62, 62, 62, 0.15);
          $border-radius: 20px;
        `
      }
    }
  }
});
