import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    cors: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
