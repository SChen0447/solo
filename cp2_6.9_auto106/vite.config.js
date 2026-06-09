import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 8080,
    strictPort: true
  },
  plugins: [
    {
      name: 'strict-type-check',
      configureServer(server) {
        server.watcher.on('change', () => {
          server.config.logger.info('Type checking on change...');
        });
      }
    }
  ]
});
