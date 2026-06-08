import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { StyleId, StyleInfo, ProcessResult, LikeStats } from '../src/types';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const styles: StyleInfo[] = [
  {
    id: 'watercolor',
    name: '水彩',
    color: '#ff9a56',
    gradient: 'linear-gradient(135deg, #ff9a56, #ff6b9d)',
  },
  {
    id: 'sketch',
    name: '素描',
    color: '#7c9db6',
    gradient: 'linear-gradient(135deg, #a8c0d6, #5c7a94)',
  },
  {
    id: 'pixel',
    name: '像素风',
    color: '#9b59b6',
    gradient: 'linear-gradient(135deg, #c39bd3, #6c3483)',
  },
  {
    id: 'oil',
    name: '油画',
    color: '#d4a574',
    gradient: 'linear-gradient(135deg, #e8c89e, #b8864b)',
  },
];

const likeStats: Record<StyleId, number> = {
  watercolor: 128,
  sketch: 95,
  pixel: 156,
  oil: 87,
};

const sessions = new Map<string, { imageBuffer: Buffer; mimeType: string }>();

app.get('/api/styles', (_req, res) => {
  res.json({ styles });
});

app.get('/api/likes', (_req, res) => {
  const stats: LikeStats[] = Object.entries(likeStats).map(([style, likes]) => ({
    style: style as StyleId,
    likes,
  }));
  stats.sort((a, b) => b.likes - a.likes);
  res.json({ stats });
});

app.post('/api/like/:styleId', (req, res) => {
  const styleId = req.params.styleId as StyleId;
  if (likeStats[styleId] !== undefined) {
    likeStats[styleId] += 1;
    res.json({ style: styleId, likes: likeStats[styleId] });
  } else {
    res.status(404).json({ error: 'Style not found' });
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image uploaded' });
    return;
  }
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    imageBuffer: req.file.buffer,
    mimeType: req.file.mimetype,
  });
  res.json({
    sessionId,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});

app.get('/stream/process/:sessionId/:styleId', (req, res) => {
  const sessionId = req.params.sessionId;
  const styleId = req.params.styleId as StyleId;

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let progress = 0;
  const totalSteps = 20;
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    progress = Math.min((currentStep / totalSteps) * 100, 95);

    res.write(`data: ${JSON.stringify({ type: 'progress', progress })}\n\n`);

    if (currentStep >= totalSteps) {
      clearInterval(interval);

      const base64Image = session.imageBuffer.toString('base64');
      const dataUrl = `data:${session.mimeType};base64,${base64Image}`;

      const result: ProcessResult = {
        styleId,
        imageUrl: dataUrl,
      };

      setTimeout(() => {
        res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
        res.end();
      }, 100);
    }
  }, 100);

  req.on('close', () => {
    clearInterval(interval);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
