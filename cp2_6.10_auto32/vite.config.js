import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  esbuild: {
    target: 'es2020',
  },
});
