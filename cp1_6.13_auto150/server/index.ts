import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface ParticleOffset {
  x: number;
  y: number;
}

interface CharParticleGroup {
  char: string;
  x: number;
  y: number;
  particles: ParticleOffset[];
}

interface ArtworkData {
  id: string;
  name: string;
  author: string;
  chars: CharParticleGroup[];
  theme: string;
  createdAt: string;
}

const artworks: ArtworkData[] = [];

app.post('/api/artwork', (req, res) => {
  const { name, author, chars, theme } = req.body;

  if (!name || !author || !chars || !theme) {
    res.status(400).json({ error: '缺少必填字段' });
    return;
  }

  const id = uuidv4();
  const artwork: ArtworkData = {
    id,
    name: String(name).slice(0, 20),
    author: String(author).slice(0, 10),
    chars,
    theme,
    createdAt: new Date().toISOString(),
  };

  artworks.push(artwork);
  res.status(201).json({ id });
});

app.get('/api/artwork/:id', (req, res) => {
  const artwork = artworks.find((a) => a.id === req.params.id);
  if (!artwork) {
    res.status(404).json({ error: '此作品已被删除或不存在' });
    return;
  }
  res.json(artwork);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
