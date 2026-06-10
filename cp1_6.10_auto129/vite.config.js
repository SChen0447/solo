import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5180,
    host: true,
    hmr: true
  },
  build: {
    target: 'es2020'
  }
});
