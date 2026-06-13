import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    host: true,
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
});
