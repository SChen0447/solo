import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    hmr: true,
    host: true
  },
  build: {
    target: 'es2020'
  }
});
