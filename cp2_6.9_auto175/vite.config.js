import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    open: false
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
});
