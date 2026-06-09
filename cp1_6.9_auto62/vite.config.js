import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  server: {
    host: true,
    port: 5173,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020'
  },
  resolve: {
    extensions: ['.ts', '.js', '.json']
  }
});
