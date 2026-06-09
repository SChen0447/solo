import express from 'express';
import path from 'path';
import { REACTIONS, CHEMICALS } from './chemicalData';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.get('/api/reactions', (_req, res) => {
  res.json({
    success: true,
    data: REACTIONS
  });
});

app.get('/api/chemicals', (_req, res) => {
  res.json({
    success: true,
    data: CHEMICALS
  });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  虚拟化学实验室已启动!`);
  console.log(`  访问地址: http://localhost:${PORT}`);
  console.log(`========================================\n`);
});

export default app;
