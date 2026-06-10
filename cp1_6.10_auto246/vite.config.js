import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  port: 5173,
  server: {
    port: 5173,
    hmr: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
