import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 4000,
    open: false
  },
  build: {
    outDir: 'dist'
  }
});
