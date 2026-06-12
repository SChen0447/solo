import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    target: 'es2020'
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
