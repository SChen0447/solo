import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    port: 5173
  },
  ssr: {
    noExternal: ['three']
  },
  build: {
    target: 'es2020'
  }
});
