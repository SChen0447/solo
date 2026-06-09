import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 9000,
    strictPort: true,
    open: true
  },
  build: {
    target: 'es2020',
    sourcemap: true
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        strict: true
      }
    }
  }
});
