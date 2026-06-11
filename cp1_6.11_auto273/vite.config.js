import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  server: {
    port: 5173,
    open: true,
  },
})
