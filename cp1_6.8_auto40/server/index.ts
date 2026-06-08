import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '10mb' }));

interface MindMapEntry {
  id: string;
  data: any;
  createdAt: number;
  updatedAt: number;
}

const mindMaps: Record<string, MindMapEntry> = {};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/maps', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      res.status(400).json({ error: 'Missing data' });
      return;
    }

    const id = uuidv4();
    const now = Date.now();
    mindMaps[id] = {
      id,
      data,
      createdAt: now,
      updatedAt: now,
    };

    res.json({ id, createdAt: now });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create mind map' });
  }
});

app.get('/api/maps/:id', (req, res) => {
  try {
    const { id } = req.params;
    const entry = mindMaps[id];

    if (!entry) {
      res.status(404).json({ error: 'Mind map not found' });
      return;
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get mind map' });
  }
});

app.put('/api/maps/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;
    const entry = mindMaps[id];

    if (!entry) {
      res.status(404).json({ error: 'Mind map not found' });
      return;
    }

    entry.data = data;
    entry.updatedAt = Date.now();

    res.json({ id, updatedAt: entry.updatedAt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update mind map' });
  }
});

app.delete('/api/maps/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!mindMaps[id]) {
      res.status(404).json({ error: 'Mind map not found' });
      return;
    }

    delete mindMaps[id];
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete mind map' });
  }
});

app.get('/api/maps', (_req, res) => {
  const list = Object.values(mindMaps).map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    nodeCount: entry.data?.nodes ? Object.keys(entry.data.nodes).length : 0,
  }));
  res.json(list);
});

app.post('/api/maps/:id/export', (req, res) => {
  try {
    const { id } = req.params;
    const entry = mindMaps[id];

    if (!entry) {
      res.status(404).json({ error: 'Mind map not found' });
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mindmap_${id}.json"`
    );
    res.json(entry.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export mind map' });
  }
});

app.post('/api/maps/import', (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !data.nodes) {
      res.status(400).json({ error: 'Invalid mind map data' });
      return;
    }

    const id = uuidv4();
    const now = Date.now();
    mindMaps[id] = {
      id,
      data,
      createdAt: now,
      updatedAt: now,
    };

    res.json({ id, createdAt: now });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import mind map' });
  }
});

app.listen(PORT, () => {
  console.log(`Mind map server running on port ${PORT}`);
});

export default app;
