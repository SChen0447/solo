import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    hmr: true,
    open: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  }
});
