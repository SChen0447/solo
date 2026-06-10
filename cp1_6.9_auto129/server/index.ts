import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005;
const DATA_DIR = path.join(__dirname, 'data');
const SHARES_FILE = path.join(DATA_DIR, 'shares.json');

interface EmotionColor {
  id: string;
  color: string;
  name: string;
  frequency: number;
}

interface Clip {
  id: string;
  colors: { emotionId: string; weight: number }[];
  mixedColor: string;
  frequency: number;
  note?: string;
  order: number;
}

interface SharedWork {
  id: string;
  clips: Clip[];
  createdAt: string;
  viewOnly: boolean;
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SHARES_FILE)) {
  fs.writeFileSync(SHARES_FILE, JSON.stringify({}));
}

const loadShares = (): Record<string, SharedWork> => {
  try {
    const data = fs.readFileSync(SHARES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
};

const saveShares = (shares: Record<string, SharedWork>) => {
  fs.writeFileSync(SHARES_FILE, JSON.stringify(shares, null, 2));
};

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const emotionColors: EmotionColor[] = [
  { id: 'joy', color: '#ff6677', name: '快乐', frequency: 750 },
  { id: 'sad', color: '#7766ff', name: '忧郁', frequency: 280 },
  { id: 'calm', color: '#66ff77', name: '平静', frequency: 380 },
  { id: 'excited', color: '#ffcc66', name: '兴奋', frequency: 800 },
  { id: 'romantic', color: '#ff66cc', name: '浪漫', frequency: 520 },
  { id: 'fresh', color: '#66ccff', name: '清新', frequency: 600 },
  { id: 'hope', color: '#ccff66', name: '希望', frequency: 680 },
  { id: 'warm', color: '#ff9966', name: '温暖', frequency: 480 },
  { id: 'mystery', color: '#9966ff', name: '神秘', frequency: 220 },
  { id: 'harmony', color: '#66ffcc', name: '和谐', frequency: 440 }
];

app.get('/api/emotions', (req: Request, res: Response) => {
  res.json(emotionColors);
});

let clips: Clip[] = [];
let nextClipId = 1;

app.get('/api/clips', (req: Request, res: Response) => {
  res.json(clips.sort((a, b) => a.order - b.order));
});

app.post('/api/clips', (req: Request, res: Response) => {
  const { colors, mixedColor, frequency, note } = req.body;
  const newClip: Clip = {
    id: `clip-${nextClipId++}`,
    colors,
    mixedColor,
    frequency,
    note,
    order: clips.length
  };
  clips.push(newClip);
  res.status(201).json(newClip);
});

app.put('/api/clips/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { colors, mixedColor, frequency, note, order } = req.body;
  const index = clips.findIndex((c) => c.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Clip not found' });
    return;
  }
  clips[index] = {
    ...clips[index],
    colors: colors ?? clips[index].colors,
    mixedColor: mixedColor ?? clips[index].mixedColor,
    frequency: frequency ?? clips[index].frequency,
    note: note !== undefined ? note : clips[index].note,
    order: order !== undefined ? order : clips[index].order
  };
  res.json(clips[index]);
});

app.put('/api/clips/reorder', (req: Request, res: Response) => {
  const { orders } = req.body as { orders: { id: string; order: number }[] };
  orders.forEach(({ id, order }) => {
    const clip = clips.find((c) => c.id === id);
    if (clip) {
      clip.order = order;
    }
  });
  res.json({ success: true });
});

app.delete('/api/clips/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = clips.findIndex((c) => c.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Clip not found' });
    return;
  }
  const deleted = clips.splice(index, 1)[0];
  clips.forEach((c, i) => {
    c.order = i;
  });
  res.json(deleted);
});

app.post('/api/share', (req: Request, res: Response) => {
  const { clips: workClips } = req.body as { clips: Clip[] };
  const shareId = crypto.randomBytes(5).toString('hex');
  const shares = loadShares();
  shares[shareId] = {
    id: shareId,
    clips: workClips,
    createdAt: new Date().toISOString(),
    viewOnly: true
  };
  saveShares(shares);
  res.json({ shareId, shareUrl: `/share/${shareId}` });
});

app.get('/api/share/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const shares = loadShares();
  const work = shares[id];
  if (!work) {
    res.status(404).json({ error: 'Share not found' });
    return;
  }
  res.json(work);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
