import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: false
  },
  build: {
    target: 'es2020'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  }
});
