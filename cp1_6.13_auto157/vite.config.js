import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
  },
  esbuild: {
    target: 'es2020',
  },
  build: {
    target: 'es2020',
  },
});
