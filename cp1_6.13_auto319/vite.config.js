import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    sourcemap: true,
    outDir: 'dist'
  },
  server: {
    host: true,
    port: 5173
  }
});
