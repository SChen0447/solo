import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  esbuild: {
    target: 'es2020',
  },
});
