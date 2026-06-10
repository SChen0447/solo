import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    open: true,
    host: true,
    port: 5173
  },
  ssr: {
    noExternal: ['three']
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  }
});
