import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    open: true,
    host: true
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist'
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
});
