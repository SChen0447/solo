import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, '..', 'data', 'tracks.json');

app.use(express.json());

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
}

function readTracks(): any[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeTracks(tracks: any[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tracks, null, 2), 'utf-8');
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

app.get('/api/tracks', (req, res) => {
  const id = req.query.id as string;
  const tracks = readTracks();

  if (!id) {
    return res.status(200).json({ success: true, data: tracks });
  }

  const track = tracks.find((t: any) => t.id === id);
  if (!track) {
    return res.status(404).json({ success: false, error: 'Track not found' });
  }
  return res.status(200).json({ success: true, data: track });
});

app.post('/api/tracks', (req, res) => {
  const { grid, bpm } = req.body;

  if (!grid || !Array.isArray(grid) || typeof bpm !== 'number') {
    return res.status(400).json({ success: false, error: 'Invalid request body' });
  }

  const tracks = readTracks();
  let id: string;
  do {
    id = generateId();
  } while (tracks.some((t: any) => t.id === id));

  const newTrack = {
    id,
    grid,
    bpm,
    createdAt: Date.now(),
  };

  tracks.push(newTrack);
  writeTracks(tracks);

  return res.status(201).json({ success: true, id });
});

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`Beat Lab server running on http://localhost:${PORT}`);
});
