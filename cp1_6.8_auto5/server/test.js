console.log('Starting server test...');

try {
  const express = require('express');
  console.log('express loaded');
  
  const app = express();
  const PORT = 3000;
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('Error:', error);
}
