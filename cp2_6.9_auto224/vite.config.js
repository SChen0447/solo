import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    host: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
