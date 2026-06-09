import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: false
  },
  build: {
    target: 'es2020',
    modulePreload: false,
    minify: 'esbuild'
  },
  esbuild: {
    target: 'es2020'
  }
});
