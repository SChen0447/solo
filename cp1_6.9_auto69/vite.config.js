import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 9876,
    host: true,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
