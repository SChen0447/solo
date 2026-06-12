import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  esbuild: {
    target: 'es2020'
  },
  build: {
    target: 'es2020'
  }
});
