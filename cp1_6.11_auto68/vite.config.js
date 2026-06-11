import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173
  },
  optimizeDeps: {
    include: [
      'monaco-editor/esm/vs/editor/editor.all.js',
      'monaco-editor/esm/vs/language/html/html.worker.js',
      'monaco-editor/esm/vs/language/css/css.worker.js',
      'monaco-editor/esm/vs/language/typescript/ts.worker.js'
    ]
  }
})
