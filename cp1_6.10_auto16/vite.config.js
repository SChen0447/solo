import { defineConfig } from 'vite';

export default defineConfig({
  ssr: false,
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
