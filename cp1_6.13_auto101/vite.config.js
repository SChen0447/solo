import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
