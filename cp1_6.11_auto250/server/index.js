import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;
const DATA_DIR = path.join(__dirname, '..', 'data');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const GRID_SIZE = 50;

function createEmptyMatrix(size) {
  const matrix = [];
  for (let i = 0; i < size; i++) {
    matrix.push(new Array(size).fill(0));
  }
  return matrix;
}

function injectDrug(drugMatrix, centerX, centerY, concentration, radius = 5) {
  const size = drugMatrix.length;
  const newDrug = drugMatrix.map(row => [...row]);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const dx = i - centerY;
      const dy = j - centerX;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= radius) {
        const falloff = 1 - distance / radius;
        newDrug[i][j] = Math.min(1, newDrug[i][j] + concentration * falloff * falloff);
      }
    }
  }

  return newDrug;
}

app.post('/api/injectDrug', (req, res) => {
  try {
    const { x, y, concentration, radius = 6 } = req.body;

    if (typeof x !== 'number' || typeof y !== 'number' || typeof concentration !== 'number') {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const emptyMatrix = createEmptyMatrix(GRID_SIZE);
    const drugMatrix = injectDrug(emptyMatrix, x, y, concentration, radius);

    res.json({
      drugMatrix,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Inject drug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/simulationState', (req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(DATA_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        return {
          id: data.id || file.replace('.json', ''),
          name: data.name || file.replace('.json', ''),
          timestamp: data.timestamp || 0,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({ snapshots: files });
  } catch (error) {
    console.error('Get snapshots error:', error);
    res.status(500).json({ snapshots: [] });
  }
});

app.post('/api/simulationState', (req, res) => {
  try {
    const { infectionMatrix, drugMatrix, curveData, simulationTime, name } = req.body;

    if (!infectionMatrix || !drugMatrix) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const id = uuidv4();
    const timestamp = Date.now();
    const snapshot = {
      id,
      name: name || `快照-${new Date(timestamp).toLocaleString()}`,
      timestamp,
      infectionMatrix,
      drugMatrix,
      curveData: curveData || [],
      simulationTime: simulationTime || 0,
    };

    const fileName = `${timestamp}-${id}.json`;
    const filePath = path.join(DATA_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));

    res.json({ id, success: true, name: snapshot.name });
  } catch (error) {
    console.error('Save snapshot error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

app.get('/api/simulationState/:id', (req, res) => {
  try {
    const { id } = req.params;

    const files = fs.readdirSync(DATA_DIR).filter(file => file.includes(id));

    if (files.length === 0) {
      return res.status(404).json({ error: 'Snapshot not found', success: false });
    }

    const filePath = path.join(DATA_DIR, files[0]);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    res.json({
      ...data,
      success: true,
    });
  } catch (error) {
    console.error('Load snapshot error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});

export default app;
