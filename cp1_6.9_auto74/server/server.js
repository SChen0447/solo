import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { capsules: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/capsules', (req, res) => {
  const db = readDB();
  res.json(db.capsules);
});

app.post('/api/capsules', (req, res) => {
  const db = readDB();
  const newCapsule = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    ...req.body,
    createdAt: Date.now(),
    likes: 0,
    replies: [],
  };
  db.capsules.push(newCapsule);
  writeDB(db);
  res.json(newCapsule);
});

app.post('/api/capsules/:id/like', (req, res) => {
  const db = readDB();
  const capsule = db.capsules.find((c) => c.id === req.params.id);
  if (!capsule) {
    return res.status(404).json({ error: 'Capsule not found' });
  }
  capsule.likes = (capsule.likes || 0) + 1;
  writeDB(db);
  res.json({ likes: capsule.likes });
});

app.post('/api/capsules/:id/reply', (req, res) => {
  const db = readDB();
  const capsule = db.capsules.find((c) => c.id === req.params.id);
  if (!capsule) {
    return res.status(404).json({ error: 'Capsule not found' });
  }
  if (!capsule.replies) capsule.replies = [];
  const reply = {
    id: Date.now().toString(),
    text: req.body.text,
    createdAt: Date.now(),
  };
  capsule.replies.push(reply);
  writeDB(db);
  res.json(reply);
});

app.listen(PORT, () => {
  console.log(`Time Capsule Server running on http://localhost:${PORT}`);
});
