import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

interface ParticlePoint {
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  timestamp: number;
}

interface Letter {
  id: string;
  title: string;
  password: string;
  lightTrack: ParticlePoint[];
  audioData: string | null;
  remainingOpens: number;
  createdAt: number;
  isRead: boolean;
  failedAttempts: number;
}

const letters: Map<string, Letter> = new Map();

const sampleTrack: ParticlePoint[] = [];
for (let i = 0; i < 50; i++) {
  sampleTrack.push({
    x: 100 + i * 6,
    y: 150 + Math.sin(i * 0.2) * 30,
    color: ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3', '#54a0ff'][i % 5],
    size: 5 + Math.random() * 5,
    opacity: 0.7 + Math.random() * 0.2,
    timestamp: i * 40,
  });
}

const demoLetter: Letter = {
  id: 'demo-001',
  title: '来自星空的问候',
  password: '1234',
  lightTrack: sampleTrack,
  audioData: null,
  remainingOpens: 3,
  createdAt: Date.now(),
  isRead: false,
  failedAttempts: 0,
};

letters.set(demoLetter.id, demoLetter);

app.get('/api/letters', (_req, res) => {
  const letterList = Array.from(letters.values()).map((l) => ({
    id: l.id,
    title: l.title,
    remainingOpens: l.remainingOpens,
    createdAt: l.createdAt,
    isRead: l.isRead,
    hasPassword: !!l.password,
  }));
  res.json(letterList);
});

app.get('/api/letters/:id', (req, res) => {
  const letter = letters.get(req.params.id);
  if (!letter) {
    return res.status(404).json({ error: '信笺不存在' });
  }
  if (letter.remainingOpens <= 0) {
    return res.status(410).json({ error: '信笺已焚毁' });
  }
  res.json({
    id: letter.id,
    title: letter.title,
    remainingOpens: letter.remainingOpens,
    isRead: letter.isRead,
    hasPassword: !!letter.password,
  });
});

app.post('/api/letters/:id/verify', (req, res) => {
  const letter = letters.get(req.params.id);
  if (!letter) {
    return res.status(404).json({ error: '信笺不存在' });
  }
  if (letter.remainingOpens <= 0) {
    return res.status(410).json({ error: '信笺已焚毁' });
  }

  const { password } = req.body;

  if (letter.failedAttempts >= 3) {
    letter.remainingOpens = 0;
    return res.status(403).json({ error: '错误次数过多，信笺已焚毁', burned: true });
  }

  if (password !== letter.password) {
    letter.failedAttempts += 1;
    if (letter.failedAttempts >= 3) {
      letter.remainingOpens = 0;
      return res.status(403).json({ error: '密码错误次数过多，信笺已焚毁', burned: true });
    }
    return res.status(401).json({
      error: '密码错误',
      remainingAttempts: 3 - letter.failedAttempts,
    });
  }

  letter.failedAttempts = 0;
  letter.remainingOpens -= 1;
  letter.isRead = true;

  res.json({
    success: true,
    lightTrack: letter.lightTrack,
    audioData: letter.audioData,
    remainingOpens: letter.remainingOpens,
  });
});

app.post('/api/letters', (req, res) => {
  const { title, password, lightTrack, audioData } = req.body;

  if (!title || !password || !lightTrack) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  if (password.length < 4 || password.length > 8) {
    return res.status(400).json({ error: '密码长度需为4-8位' });
  }

  const id = uuidv4();
  const newLetter: Letter = {
    id,
    title,
    password,
    lightTrack,
    audioData: audioData || null,
    remainingOpens: 3,
    createdAt: Date.now(),
    isRead: false,
    failedAttempts: 0,
  };

  letters.set(id, newLetter);

  res.status(201).json({
    id,
    title: newLetter.title,
    remainingOpens: newLetter.remainingOpens,
    createdAt: newLetter.createdAt,
  });
});

app.delete('/api/letters/:id', (req, res) => {
  const deleted = letters.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: '信笺不存在' });
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`信笺服务器运行在 http://localhost:${PORT}`);
});
