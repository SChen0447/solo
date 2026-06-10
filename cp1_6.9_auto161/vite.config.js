import { defineConfig } from 'vite';
import fs from 'fs';

let httpsConfig = false;
try {
  if (fs.existsSync('./localhost-key.pem') && fs.existsSync('./localhost.pem')) {
    httpsConfig = {
      key: fs.readFileSync('./localhost-key.pem', 'utf8'),
      cert: fs.readFileSync('./localhost.pem', 'utf8')
    };
  }
} catch (e) {
  httpsConfig = false;
}

export default defineConfig({
  server: {
    port: 3000,
    https: httpsConfig
  }
});
