import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5174;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface Artwork {
  id: string;
  title: string;
  color: string;
  imageData: string;
  createdAt: number;
}

interface TracePoint {
  x: number;
  y: number;
}

interface LightTrace {
  id: string;
  artworkId: string;
  points: TracePoint[];
  createdAt: number;
}

const artworks = new Map<string, Artwork>();
const traces = new Map<string, LightTrace[]>();

const STAR_COLORS = [
  '#ff4477', '#44bbff', '#77ff88', '#ffaa44',
  '#aa44ff', '#44ffdd', '#ff66cc', '#88ff44',
  '#ff4444', '#4488ff', '#ffdd44', '#cc44ff',
];

app.get('/api/star-colors', (req, res) => {
  res.json(STAR_COLORS);
});

app.get('/api/artworks', (req, res) => {
  const start = Date.now();
  const list = Array.from(artworks.values()).sort((a, b) => b.createdAt - a.createdAt);
  console.log(`GET /api/artworks took ${Date.now() - start}ms`);
  res.json(list);
});

app.get('/api/artworks/:id', (req, res) => {
  const artwork = artworks.get(req.params.id);
  if (!artwork) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }
  res.json(artwork);
});

app.post('/api/artworks', (req, res) => {
  const start = Date.now();
  const { title, color, imageData } = req.body;

  if (!title || title.length > 20) {
    res.status(400).json({ error: '标题不能为空且最多20字' });
    return;
  }
  if (!color || !STAR_COLORS.includes(color)) {
    res.status(400).json({ error: '请选择有效的颜色基调' });
    return;
  }
  if (!imageData) {
    res.status(400).json({ error: '请上传图片' });
    return;
  }

  const id = uuidv4();
  const artwork: Artwork = {
    id,
    title,
    color,
    imageData,
    createdAt: Date.now(),
  };

  artworks.set(id, artwork);
  traces.set(id, []);

  console.log(`POST /api/artworks took ${Date.now() - start}ms`);
  res.status(201).json(artwork);
});

app.get('/api/artworks/:id/traces', (req, res) => {
  const artworkId = req.params.id;
  if (!artworks.has(artworkId)) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }
  const artworkTraces = traces.get(artworkId) || [];
  res.json(artworkTraces);
});

app.post('/api/artworks/:id/traces', (req, res) => {
  const artworkId = req.params.id;
  const { points } = req.body;

  if (!artworks.has(artworkId)) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }
  if (!points || !Array.isArray(points) || points.length < 2) {
    res.status(400).json({ error: '光迹数据无效' });
    return;
  }

  const trace: LightTrace = {
    id: uuidv4(),
    artworkId,
    points,
    createdAt: Date.now(),
  };

  const artworkTraces = traces.get(artworkId) || [];
  artworkTraces.push(trace);
  traces.set(artworkId, artworkTraces);

  res.status(201).json(trace);
});

app.listen(PORT, () => {
  console.log(`远光映像馆后端服务已启动: http://localhost:${PORT}`);
});
