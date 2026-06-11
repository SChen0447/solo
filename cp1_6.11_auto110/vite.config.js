import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: false
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    minify: 'esbuild'
  },
  optimizeDeps: {
    include: ['three', 'gsap', 'tweakpane']
  }
});
