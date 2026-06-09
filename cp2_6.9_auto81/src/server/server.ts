import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type {
  DrawElement,
  Operation,
  RoomState,
  RoomUser,
  Version,
} from '../shared/types';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = 3001;
const SNAPSHOT_INTERVAL = 30000;
const MAX_VERSIONS = 50;

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      users: [],
      elements: [],
      versions: [],
      lastSnapshotTime: Date.now(),
      operationCountSinceSnapshot: 0,
    };
    rooms.set(roomId, room);
  }
  return room;
}

function createSnapshot(room: RoomState): void {
  const version: Version = {
    id: uuidv4(),
    timestamp: Date.now(),
    elements: JSON.parse(JSON.stringify(room.elements)),
    operationCount: room.operationCountSinceSnapshot,
  };
  room.versions.push(version);
  if (room.versions.length > MAX_VERSIONS) {
    room.versions.shift();
  }
  room.lastSnapshotTime = Date.now();
  room.operationCountSinceSnapshot = 0;
  console.log(`[Room ${room.id}] Snapshot created. Total versions: ${room.versions.length}`);
}

function applyOperation(room: RoomState, operation: Operation): void {
  switch (operation.type) {
    case 'add':
      if (operation.element) {
        room.elements.push({ ...operation.element });
      }
      break;
    case 'modify':
      if (operation.elementId && operation.modifications) {
        const idx = room.elements.findIndex((e) => e.id === operation.elementId);
        if (idx !== -1) {
          room.elements[idx] = { ...room.elements[idx], ...operation.modifications } as DrawElement;
        }
      }
      break;
    case 'delete':
      if (operation.elementId) {
        room.elements = room.elements.filter((e) => e.id !== operation.elementId);
      }
      break;
    case 'move':
      if (operation.elementId && operation.modifications) {
        const idx = room.elements.findIndex((e) => e.id === operation.elementId);
        if (idx !== -1) {
          room.elements[idx] = { ...room.elements[idx], ...operation.modifications } as DrawElement;
        }
      }
      break;
  }
  room.operationCountSinceSnapshot++;
}

app.get('/api/rooms/:roomId/versions', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room.versions.map((v) => ({ id: v.id, timestamp: v.timestamp, operationCount: v.operationCount })));
});

app.get('/api/rooms/:roomId/versions/:versionId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const version = room.versions.find((v) => v.id === req.params.versionId);
  if (!version) return res.status(404).json({ error: 'Version not found' });
  res.json(version);
});

io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  socket.on('join-room', async ({ roomId, nickname }: { roomId: string; nickname: string }) => {
    currentRoomId = roomId;
    currentUserId = uuidv4();
    const room = getOrCreateRoom(roomId);

    const user: RoomUser = { id: currentUserId, nickname, socketId: socket.id };
    room.users.push(user);

    await socket.join(roomId);
    console.log(`[Socket] ${nickname} joined room ${roomId}. Users: ${room.users.length}`);

    socket.emit('room-state', {
      users: room.users,
      elements: room.elements,
      version: room.versions.length,
      currentUserId,
    });

    socket.to(roomId).emit('user-joined', user);
  });

  socket.on('draw-operation', (operation: Operation) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    applyOperation(room, operation);

    socket.to(currentRoomId).emit('remote-operation', operation);

    const now = Date.now();
    if (now - room.lastSnapshotTime >= SNAPSHOT_INTERVAL || room.operationCountSinceSnapshot >= 10) {
      createSnapshot(room);
    }
  });

  socket.on('get-versions', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    socket.emit('versions-list', room.versions);
  });

  socket.on('restore-version', ({ versionId }: { versionId: string }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const version = room.versions.find((v) => v.id === versionId);
    if (!version) return;

    room.elements = JSON.parse(JSON.stringify(version.elements));
    room.operationCountSinceSnapshot = 0;
    createSnapshot(room);

    io.to(currentRoomId).emit('version-restored', {
      elements: JSON.parse(JSON.stringify(version.elements)),
      version: room.versions.length,
    });
  });

  socket.on('disconnect', () => {
    if (!currentRoomId || !currentUserId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.users = room.users.filter((u) => u.id !== currentUserId);
    console.log(`[Socket] Client disconnected from ${currentRoomId}. Users left: ${room.users.length}`);

    socket.to(currentRoomId).emit('user-left', { userId: currentUserId });

    if (room.users.length === 0) {
      setTimeout(() => {
        const r = rooms.get(currentRoomId!);
        if (r && r.users.length === 0) {
          rooms.delete(currentRoomId!);
          console.log(`[Room] Room ${currentRoomId} deleted (empty)`);
        }
      }, 60000);
    }
  });
});

setInterval(() => {
  rooms.forEach((room) => {
    if (Date.now() - room.lastSnapshotTime >= SNAPSHOT_INTERVAL && room.operationCountSinceSnapshot > 0) {
      createSnapshot(room);
    }
  });
}, SNAPSHOT_INTERVAL);

server.listen(PORT, () => {
  console.log(`[Server] Collaborative Whiteboard Server running on port ${PORT}`);
});
