import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    strictPort: false
  },
  build: {
    outDir: 'dist'
  }
});
