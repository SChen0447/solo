import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    https: false,
    headers: {
      'Permissions-Policy': 'camera=(self)'
    }
  },
  optimizeDeps: {
    include: ['three']
  }
});
