import { defineConfig } from 'vite';
import esbuild from 'esbuild';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false
  },
  esbuild: {
    target: 'es2020'
  }
});
