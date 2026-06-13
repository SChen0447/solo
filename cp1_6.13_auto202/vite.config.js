import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    open: true,
    hmr: true,
  },
  build: {
    target: 'esnext',
  },
});
