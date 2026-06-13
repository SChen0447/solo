import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/audio': 'http://localhost:3001'
    }
  }
});
