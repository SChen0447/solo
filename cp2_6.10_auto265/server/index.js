import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

const readData = () => {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { flowers: [], orders: [], schemes: [] };
  }
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/flowers', (_req, res) => {
  const data = readData();
  res.json(data.flowers);
});

app.get('/api/orders', (_req, res) => {
  const data = readData();
  res.json(data.orders);
});

app.post('/api/orders', (req, res) => {
  const data = readData();
  const newOrder = {
    id: uuidv4(),
    date: new Date().toISOString(),
    items: req.body.items,
    total: req.body.total,
    status: '待处理'
  };
  data.orders.unshift(newOrder);
  writeData(data);
  res.status(201).json(newOrder);
});

app.get('/api/schemes', (_req, res) => {
  const data = readData();
  res.json(data.schemes);
});

app.post('/api/schemes', (req, res) => {
  const data = readData();
  const newScheme = {
    id: uuidv4(),
    name: req.body.name,
    date: new Date().toISOString(),
    elements: req.body.elements
  };
  data.schemes.unshift(newScheme);
  writeData(data);
  res.status(201).json(newScheme);
});

app.listen(PORT, () => {
  console.log(`Flower shop server running on http://localhost:${PORT}`);
});
