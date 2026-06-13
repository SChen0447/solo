import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, 'echo.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS specimens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    waveform TEXT NOT NULL,
    hue INTEGER NOT NULL,
    saturation INTEGER NOT NULL,
    lightness INTEGER NOT NULL,
    amplitude REAL NOT NULL,
    frequency REAL NOT NULL,
    favorite INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

interface User {
  id: string;
  username: string;
  password: string;
  created_at: number;
}

interface Specimen {
  id: string;
  user_id: string;
  name: string;
  waveform: string;
  hue: number;
  saturation: number;
  lightness: number;
  amplitude: number;
  frequency: number;
  favorite: number;
  created_at: number;
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码必填' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const id = uuidv4();
  const createdAt = Date.now();
  db.prepare('INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    username,
    password,
    createdAt
  );
  res.json({ id, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码必填' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(
    username,
    password
  ) as User | undefined;
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json({ id: user.id, username: user.username });
});

app.get('/api/specimens', (req, res) => {
  const userId = req.query.user_id as string;
  if (!userId) {
    return res.status(400).json({ error: 'user_id 必填' });
  }
  const rows = db
    .prepare('SELECT * FROM specimens WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Specimen[];
  const specimens = rows.map((row) => ({
    ...row,
    waveform: JSON.parse(row.waveform),
  }));
  res.json(specimens);
});

app.post('/api/specimens', (req, res) => {
  const {
    user_id,
    name,
    waveform,
    hue,
    saturation,
    lightness,
    amplitude,
    frequency,
  } = req.body;
  if (!user_id || !name || !waveform) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const id = uuidv4();
  const createdAt = Date.now();
  db.prepare(
    `INSERT INTO specimens (id, user_id, name, waveform, hue, saturation, lightness, amplitude, frequency, favorite, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    user_id,
    name,
    JSON.stringify(waveform),
    hue,
    saturation,
    lightness,
    amplitude,
    frequency,
    createdAt
  );
  res.json({
    id,
    user_id,
    name,
    waveform,
    hue,
    saturation,
    lightness,
    amplitude,
    frequency,
    favorite: 0,
    created_at: createdAt,
  });
});

app.put('/api/specimens/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    waveform,
    hue,
    saturation,
    lightness,
    amplitude,
    frequency,
  } = req.body;
  const existing = db.prepare('SELECT * FROM specimens WHERE id = ?').get(id) as Specimen | undefined;
  if (!existing) {
    return res.status(404).json({ error: '标本不存在' });
  }
  db.prepare(
    `UPDATE specimens SET name = ?, waveform = ?, hue = ?, saturation = ?, lightness = ?, amplitude = ?, frequency = ? WHERE id = ?`
  ).run(
    name ?? existing.name,
    waveform ? JSON.stringify(waveform) : existing.waveform,
    hue ?? existing.hue,
    saturation ?? existing.saturation,
    lightness ?? existing.lightness,
    amplitude ?? existing.amplitude,
    frequency ?? existing.frequency,
    id
  );
  const updated = db.prepare('SELECT * FROM specimens WHERE id = ?').get(id) as Specimen;
  res.json({
    ...updated,
    waveform: JSON.parse(updated.waveform),
  });
});

app.delete('/api/specimens/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM specimens WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: '标本不存在' });
  }
  res.json({ success: true });
});

app.post('/api/favorites', (req, res) => {
  const { specimen_id, favorite } = req.body;
  if (!specimen_id || favorite === undefined) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const existing = db.prepare('SELECT * FROM specimens WHERE id = ?').get(specimen_id) as Specimen | undefined;
  if (!existing) {
    return res.status(404).json({ error: '标本不存在' });
  }
  db.prepare('UPDATE specimens SET favorite = ? WHERE id = ?').run(favorite ? 1 : 0, specimen_id);
  res.json({ specimen_id, favorite: favorite ? 1 : 0 });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Echo Specimen Server running on http://localhost:${PORT}`);
});
