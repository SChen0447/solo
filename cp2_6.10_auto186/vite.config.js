import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  define: {
    __VERSION__: JSON.stringify('1.0.0')
  },
  server: {
    port: 3000,
    open: true
  }
});
