import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  server: {
    port: 5173,
    open: true
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
