import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 5173,
    proxy: {
      '/诗句': 'http://localhost:3000',
      '/在线': 'http://localhost:3000'
    }
  },
  build: {
    outDir: 'dist/client'
  }
});
