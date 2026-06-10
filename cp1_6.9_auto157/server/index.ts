import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Ink } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'inks.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface DataFile {
  inks: Ink[];
}

function readData(): DataFile {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { inks: [] };
  }
}

function writeData(data: DataFile): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/inks', (_req, res) => {
  const data = readData();
  res.json(data.inks);
});

app.get('/api/inks/:id', (req, res) => {
  const data = readData();
  const ink = data.inks.find((i) => i.id === req.params.id);
  if (!ink) {
    res.status(404).json({ error: 'Ink not found' });
    return;
  }
  res.json(ink);
});

app.post('/api/inks', (req, res) => {
  const data = readData();
  const newInk: Ink = {
    id: uuidv4(),
    name: req.body.name,
    color: req.body.color,
    textureType: req.body.textureType,
    glossiness: req.body.glossiness,
    viscosity: req.body.viscosity,
    signature: req.body.signature,
    notes: req.body.notes,
    createdAt: new Date().toISOString(),
  };
  data.inks.unshift(newInk);
  writeData(data);
  res.status(201).json(newInk);
});

app.put('/api/inks/:id', (req, res) => {
  const data = readData();
  const index = data.inks.findIndex((i) => i.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Ink not found' });
    return;
  }
  data.inks[index] = { ...data.inks[index], ...req.body };
  writeData(data);
  res.json(data.inks[index]);
});

app.delete('/api/inks/:id', (req, res) => {
  const data = readData();
  const index = data.inks.findIndex((i) => i.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Ink not found' });
    return;
  }
  data.inks.splice(index, 1);
  writeData(data);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Ink Library API server running on http://localhost:${PORT}`);
});
