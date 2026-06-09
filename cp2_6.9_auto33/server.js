import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map();

const getDefaultCode = () => ({
  html: `<!DOCTYPE html>
<html>
<head>
  <title>Preview</title>
</head>
<body>
  <div class="container">
    <h1>欢迎使用 CodeSync</h1>
    <p>开始编辑你的代码吧！</p>
    <button id="btn">点击我</button>
  </div>
</body>
</html>`,
  css: `.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-family: Arial, sans-serif;
}

h1 {
  color: #6366f1;
  margin-bottom: 16px;
}

p {
  color: #6b7280;
  margin-bottom: 24px;
}

button {
  padding: 12px 24px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #4f46e5;
}`,
  js: `document.getElementById('btn').addEventListener('click', () => {
  alert('Hello from CodeSync!');
});`,
});

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#FF8C42', '#98D8C8',
];

const getOrCreateRoom = (roomId) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      code: getDefaultCode(),
      users: new Map(),
      snapshots: [],
    });
  }
  return rooms.get(roomId);
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', ({ roomId, nickname }) => {
    const room = getOrCreateRoom(roomId);
    const colorIndex = room.users.size % CURSOR_COLORS.length;
    const user = {
      id: socket.id,
      nickname,
      color: CURSOR_COLORS[colorIndex],
      cursor: null,
      selection: null,
    };

    room.users.set(socket.id, user);
    socket.join(roomId);

    const usersList = Array.from(room.users.values());

    socket.emit('room-state', {
      code: room.code,
      users: usersList,
      snapshots: room.snapshots,
      currentUser: user,
    });

    socket.to(roomId).emit('user-joined', user);
    console.log(`User ${nickname} joined room ${roomId}`);
  });

  socket.on('code-change', ({ roomId, language, value }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.code[language] = value;
    socket.to(roomId).emit('code-change', { language, value, userId: socket.id });
  });

  socket.on('cursor-change', ({ roomId, cursor, selection }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (user) {
      user.cursor = cursor;
      user.selection = selection;
      socket.to(roomId).emit('cursor-change', {
        userId: socket.id,
        cursor,
        selection,
      });
    }
  });

  socket.on('save-snapshot', ({ roomId, nickname }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const snapshot = {
      id: uuidv4(),
      code: JSON.parse(JSON.stringify(room.code)),
      timestamp: Date.now(),
      nickname,
      userId: socket.id,
    };

    room.snapshots.unshift(snapshot);
    io.to(roomId).emit('snapshot-saved', snapshot);
    console.log(`Snapshot saved in room ${roomId} by ${nickname}`);
  });

  socket.on('restore-snapshot', ({ roomId, snapshotId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const snapshot = room.snapshots.find((s) => s.id === snapshotId);
    if (snapshot) {
      room.code = JSON.parse(JSON.stringify(snapshot.code));
      io.to(roomId).emit('snapshot-restored', {
        code: room.code,
        snapshotId,
      });
    }
  });

  socket.on('disconnect', () => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        socket.to(roomId).emit('user-left', socket.id);

        if (room.users.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }

        console.log(`User ${user?.nickname} left room ${roomId}`);
        break;
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`CodeSync server running on port ${PORT}`);
});
