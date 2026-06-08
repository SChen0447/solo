console.log('Hello from TypeScript!');
console.log('Testing ESM mode...');

import express from 'express';
console.log('Express imported successfully');

const app = express();
const PORT = 3000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
