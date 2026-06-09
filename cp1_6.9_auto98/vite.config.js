import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    host: true
  },
  build: {
    sourcemap: true
  }
});
