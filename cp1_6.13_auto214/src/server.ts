import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface User {
  id: string;
  username: string;
  password: string;
}

interface FriendPoint {
  id: string;
  username: string;
  color: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  selectedTeapot: number | null;
}

interface Room {
  code: string;
  hostId: string;
  users: Map<string, FriendPoint>;
  teapotStates: Map<number, { userId: string | null; color: string | null }>;
}

const users: Map<string, User> = new Map();
const rooms: Map<string, Room> = new Map();

const TEAPOT_COLORS = [
  '#c9a96e', '#d4a373', '#b5838d', '#e5989b',
  '#ffb4a2', '#cd8d7b', '#a5a58d', '#6b705c',
];

const FRIEND_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe',
];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function pickRandomColor(palette: string[]): string {
  return palette[Math.floor(Math.random() * palette.length)];
}

function createFriendPoint(userId: string, username: string): FriendPoint {
  return {
    id: userId,
    username,
    color: pickRandomColor(FRIEND_COLORS),
    x: 0,
    y: 0,
    angle: Math.random() * Math.PI * 2,
    speed: 0.1 + Math.random() * 0.2,
    selectedTeapot: null,
  };
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (users.has(username)) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  const user: User = {
    id: uuidv4(),
    username,
    password,
  };
  users.set(username, user);
  res.json({ id: user.id, username: user.username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json({ id: user.id, username: user.username });
});

app.post('/api/rooms/create', (req, res) => {
  const { userId, username } = req.body;
  let code: string;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const hostPoint = createFriendPoint(userId, username);
  const teapotStates = new Map<number, { userId: string | null; color: string | null }>();
  for (let i = 0; i < 6; i++) {
    teapotStates.set(i, { userId: null, color: null });
  }

  const room: Room = {
    code,
    hostId: userId,
    users: new Map([[userId, hostPoint]]),
    teapotStates,
  };
  rooms.set(code, room);
  res.json({ code, user: hostPoint });
});

app.post('/api/rooms/join', (req, res) => {
  const { code, userId, username } = req.body;
  const room = rooms.get(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  if (room.users.size >= 4) {
    return res.status(403).json({ error: '房间已满' });
  }
  if (room.users.has(userId)) {
    return res.json({ code, user: room.users.get(userId)!, users: Array.from(room.users.values()) });
  }
  const friendPoint = createFriendPoint(userId, username);
  room.users.set(userId, friendPoint);
  res.json({
    code,
    user: friendPoint,
    users: Array.from(room.users.values()),
    teapotStates: Object.fromEntries(room.teapotStates),
  });
});

app.get('/api/rooms/:code/users', (req, res) => {
  const { code } = req.params;
  const room = rooms.get(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  res.json({
    users: Array.from(room.users.values()),
    teapotStates: Object.fromEntries(room.teapotStates),
  });
});

app.post('/api/rooms/:code/position', (req, res) => {
  const { code } = req.params;
  const { userId, x, y, angle } = req.body;
  const room = rooms.get(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  const user = room.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: '用户不在房间内' });
  }
  user.x = x;
  user.y = y;
  user.angle = angle;
  res.json({ success: true });
});

app.post('/api/rooms/:code/select-teapot', (req, res) => {
  const { code } = req.params;
  const { userId, teapotIndex } = req.body;
  const room = rooms.get(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  const user = room.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: '用户不在房间内' });
  }
  if (user.selectedTeapot !== null && user.selectedTeapot !== teapotIndex) {
    const prevState = room.teapotStates.get(user.selectedTeapot);
    if (prevState && prevState.userId === userId) {
      prevState.userId = null;
      prevState.color = null;
    }
  }
  if (teapotIndex === null) {
    user.selectedTeapot = null;
  } else {
    user.selectedTeapot = teapotIndex;
    const state = room.teapotStates.get(teapotIndex);
    if (state) {
      state.userId = userId;
      state.color = user.color;
    }
  }
  res.json({ success: true, teapotStates: Object.fromEntries(room.teapotStates) });
});

app.post('/api/rooms/:code/leave', (req, res) => {
  const { code } = req.params;
  const { userId } = req.body;
  const room = rooms.get(code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: '房间不存在' });
  }
  const user = room.users.get(userId);
  if (user && user.selectedTeapot !== null) {
    const state = room.teapotStates.get(user.selectedTeapot);
    if (state && state.userId === userId) {
      state.userId = null;
      state.color = null;
    }
  }
  room.users.delete(userId);
  if (room.users.size === 0) {
    rooms.delete(code.toUpperCase());
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
