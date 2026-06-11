import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    extensions: ['.ts', '.js', '.json']
  },
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
