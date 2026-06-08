console.log('Starting server test...');

import express from 'express';
console.log('1. express imported');

import { createServer } from 'http';
console.log('2. http imported');

import { WebSocketServer } from 'ws';
console.log('3. ws imported');

import cors from 'cors';
console.log('4. cors imported');

import bodyParser from 'body-parser';
console.log('5. body-parser imported');

import { v4 as uuidv4 } from 'uuid';
console.log('6. uuid imported');

try {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  const PORT = 3001;
  
  app.use(cors());
  app.use(bodyParser.json());
  
  app.get('/api/test', (_req, res) => {
    res.json({ message: 'Server is working!' });
  });
  
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('All tests passed!');
  });
  
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
  
} catch (error: any) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
