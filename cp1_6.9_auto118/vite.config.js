import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: '/index.html',
    port: 5173
  },
  root: '.',
  build: {
    outDir: 'dist'
  }
});
