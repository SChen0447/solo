import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5180,
    host: true
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    target: 'es2020'
  }
});
