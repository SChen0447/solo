import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

declare const __dirname: string;

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'scores.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
}

const NoteSchema = z.object({
  id: z.string(),
  pitch: z.number(),
  scaleDegree: z.number(),
  duration: z.number().min(1).max(5),
  neumeType: z.enum(['punctum', 'virga', 'podatus', 'clivis', 'bivirga', 'bipunctum']),
  direction: z.enum(['up', 'down', 'same']),
  midiNote: z.number()
});

const ScoreSchema = z.object({
  name: z.string().min(1).max(100),
  mode: z.enum(['dorian', 'phrygian', 'lydian', 'mixolydian']),
  notes: z.array(NoteSchema).min(1).max(50),
  screenshot: z.string().startsWith('data:image/'),
  createdAt: z.number(),
  complexity: z.number().min(1).max(5)
});

const StoredScoreSchema = ScoreSchema.extend({
  id: z.string().uuid()
});

type StoredScore = z.infer<typeof StoredScoreSchema>;

function readScores(): StoredScore[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(s => StoredScoreSchema.safeParse(s).success);
  } catch {
    return [];
  }
}

function writeScores(scores: StoredScore[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2), 'utf-8');
}

const app = express();
const PORT = 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/scores', (_req, res) => {
  try {
    const scores = readScores();
    res.json(scores);
  } catch (error) {
    console.error('Error reading scores:', error);
    res.status(500).json({ error: 'Failed to read scores from archive' });
  }
});

app.post('/api/scores', (req, res) => {
  try {
    const validation = ScoreSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid score data',
        details: validation.error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message
        }))
      });
    }

    const newScore: StoredScore = {
      ...validation.data,
      id: uuidv4()
    };

    const scores = readScores();
    scores.push(newScore);
    writeScores(scores);

    console.log(`[${new Date().toISOString()}] Score saved: ${newScore.name} (ID: ${newScore.id})`);

    res.status(201).json({
      success: true,
      id: newScore.id,
      message: 'Score preserved in the monastic archive'
    });
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: 'Failed to preserve the manuscript' });
  }
});

app.get('/api/scores/:id', (req, res) => {
  try {
    const { id } = req.params;
    const scores = readScores();
    const score = scores.find(s => s.id === id);

    if (!score) {
      return res.status(404).json({ error: 'Manuscript not found in the archive' });
    }

    res.json(score);
  } catch (error) {
    console.error('Error reading score:', error);
    res.status(500).json({ error: 'Failed to retrieve the manuscript' });
  }
});

app.delete('/api/scores/:id', (req, res) => {
  try {
    const { id } = req.params;
    const scores = readScores();
    const index = scores.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Manuscript not found in the archive' });
    }

    const removed = scores.splice(index, 1)[0];
    writeScores(scores);

    console.log(`[${new Date().toISOString()}] Score deleted: ${removed.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Manuscript has been removed from the archive'
    });
  } catch (error) {
    console.error('Error deleting score:', error);
    res.status(500).json({ error: 'Failed to remove the manuscript' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'This chamber of the monastery is inaccessible' });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   🏰  修道院抄经室后端服务已启动  🏰              ║
║                                                  ║
║   📡  服务地址:  http://localhost:${PORT}         ║
║   📂  档案目录:  ${DATA_DIR}
║   🕯️  启动时间:  ${new Date().toLocaleString('zh-CN')}
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);
});
