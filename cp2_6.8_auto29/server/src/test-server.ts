console.log('Starting server test...');

try {
  console.log('1. Testing imports...');
  const express = require('express');
  console.log('   express loaded');
  
  const { createServer } = require('http');
  console.log('   http loaded');
  
  const { WebSocketServer } = require('ws');
  console.log('   ws loaded');
  
  const cors = require('cors');
  console.log('   cors loaded');
  
  const bodyParser = require('body-parser');
  console.log('   body-parser loaded');
  
  const { v4: uuidv4 } = require('uuid');
  console.log('   uuid loaded');
  
  console.log('2. All imports successful!');
  
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  const PORT = 3001;
  
  app.use(cors());
  app.use(bodyParser.json());
  
  app.get('/api/test', (_req: any, res: any) => {
    res.json({ message: 'Server is working!' });
  });
  
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Server test passed!');
  });
  
} catch (error: any) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
