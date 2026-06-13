import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface PathPoint {
  x: number;
  y: number;
}

interface PathSegment {
  points: PathPoint[];
  color: string;
  width: number;
}

interface DiaryEntry {
  id: string;
  timestamp: number;
  paths: PathSegment[];
}

let entries: DiaryEntry[] = [];

app.post('/api/entries', (req, res) => {
  const { paths } = req.body;
  
  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ error: 'Invalid path data required' });
  }

  const entry: DiaryEntry = {
    id: uuidv4(),
    timestamp: Date.now(),
    paths,
  };

  entries.unshift(entry);
  res.status(201).json(entry);
});

app.get('/api/entries', (req, res) => {
  const summary = entries.map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp,
    pathCount: entry.paths.length,
    previewPaths: entry.paths.slice(0, 3).map((p) => ({
      color: p.color,
      pointCount: p.points.length,
    })),
  }));
  res.json(summary);
});

app.get('/api/entries/:id', (req, res) => {
  const entry = entries.find((e) => e.id === req.params.id);
  
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }

  res.json(entry);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
