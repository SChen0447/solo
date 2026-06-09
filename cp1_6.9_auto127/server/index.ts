import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const projectsDir = path.join(__dirname, '..', 'projects');
if (!fs.existsSync(projectsDir)) {
  fs.mkdirSync(projectsDir, { recursive: true });
}

function generateProjectId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

app.post('/save', (req: Request, res: Response) => {
  try {
    const projectData = req.body;
    const projectId = generateProjectId();
    const filePath = path.join(projectsDir, `${projectId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2));
    res.json({ success: true, projectId });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save project' });
  }
});

app.get('/load', (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, error: 'Project ID is required' });
    }
    const filePath = path.join(projectsDir, `${projectId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, data: JSON.parse(data) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load project' });
  }
});

const connectedUsers = new Map<string, { id: string; color: string; name: string }>();
const userColors = [
  '#e91e63', '#4caf50', '#2196f3', '#ffeb3b',
  '#9c27b0', '#00bcd4', '#ff5722', '#e91e63',
];
let colorIndex = 0;

io.on('connection', (socket) => {
  const userId = socket.id;
  const color = userColors[colorIndex % userColors.length];
  colorIndex++;
  const userName = `用户${Math.floor(Math.random() * 1000)}`;

  connectedUsers.set(userId, { id: userId, color, name: userName });

  socket.emit('user-connected', { id: userId, color, name: userName });
  io.emit('users-update', Array.from(connectedUsers.values()));

  socket.on('cursor-move', (data: { x: number; y: number; trail: { x: number; y: number }[] }) => {
    const user = connectedUsers.get(userId);
    if (user) {
      socket.broadcast.emit('cursor-update', {
        id: userId,
        x: data.x,
        y: data.y,
        color: user.color,
        name: user.name,
        trail: data.trail,
      });
    }
  });

  socket.on('clip-create', (clipData) => {
    socket.broadcast.emit('clip-created', clipData);
  });

  socket.on('clip-delete', (clipId: string) => {
    socket.broadcast.emit('clip-deleted', clipId);
  });

  socket.on('clip-move', (data: { clipId: string; startTime: number; trackId: string }) => {
    socket.broadcast.emit('clip-moved', data);
  });

  socket.on('clip-update', (data: { clipId: string; waveform: any }) => {
    socket.broadcast.emit('clip-updated', data);
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(userId);
    io.emit('user-disconnected', userId);
    io.emit('users-update', Array.from(connectedUsers.values()));
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`DAW Server running on http://localhost:${PORT}`);
});
