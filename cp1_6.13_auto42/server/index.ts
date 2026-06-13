import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.wav', '.mp3'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only WAV and MP3 files are allowed'));
    }
  },
});

app.use('/uploads', express.static(uploadsDir));

app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

interface PresetData {
  id: string;
  name: string;
  createdAt: string;
  data: unknown;
}

const presets: Map<string, PresetData> = new Map();

app.get('/api/presets', (_req, res) => {
  const list = Array.from(presets.values());
  res.json(list);
});

app.post('/api/presets', (req, res) => {
  const { id, name, data } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'id and name are required' });
  }
  const preset: PresetData = {
    id,
    name,
    createdAt: new Date().toISOString(),
    data,
  };
  presets.set(id, preset);
  res.json(preset);
});

app.get('/api/presets/:id', (req, res) => {
  const preset = presets.get(req.params.id);
  if (!preset) {
    return res.status(404).json({ error: 'Preset not found' });
  }
  res.json(preset);
});

app.delete('/api/presets/:id', (req, res) => {
  const deleted = presets.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Preset not found' });
  }
  res.json({ success: true });
});

interface Room {
  clients: Set<WebSocket>;
}

const rooms: Map<string, Room> = new Map();

wss.on('connection', (ws) => {
  let currentRoom: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, roomCode } = msg;

      switch (type) {
        case 'createRoom': {
          if (!roomCode) return;
          currentRoom = roomCode;
          const room: Room = { clients: new Set() };
          room.clients.add(ws);
          rooms.set(roomCode, room);
          break;
        }

        case 'joinRoom': {
          if (!roomCode) return;
          const room = rooms.get(roomCode);
          if (!room) {
            const newRoom: Room = { clients: new Set() };
            newRoom.clients.add(ws);
            rooms.set(roomCode, newRoom);
            currentRoom = roomCode;
          } else {
            room.clients.add(ws);
            currentRoom = roomCode;
            room.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'roomJoined' }));
              }
            });
          }
          break;
        }

        case 'paramUpdate':
        case 'fullSync': {
          if (!currentRoom) return;
          const room = rooms.get(currentRoom);
          if (!room) return;
          room.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(msg));
            }
          });
          break;
        }
      }
    } catch {
      // ignore parse errors
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.clients.delete(ws);
        if (room.clients.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
