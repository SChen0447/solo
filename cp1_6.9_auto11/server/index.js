import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();
const MAX_USERS_PER_ROOM = 8;

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      users: new Map(),
      elements: []
    });
  }
  return rooms.get(roomId);
}

function serializeUsers(usersMap) {
  return Array.from(usersMap.values());
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUserId = null;

  socket.on('join-room', ({ roomId, userName }) => {
    const room = getRoom(roomId);

    if (room.users.size >= MAX_USERS_PER_ROOM) {
      socket.emit('room-full');
      return;
    }

    currentRoomId = roomId;
    currentUserId = socket.id;
    const user = { id: currentUserId, name: userName || `用户${Math.floor(Math.random() * 1000)}` };

    room.users.set(currentUserId, user);
    socket.join(roomId);

    socket.emit('room-joined', {
      roomId,
      elements: room.elements,
      users: serializeUsers(room.users),
      userId: currentUserId
    });

    socket.to(roomId).emit('user-joined', {
      users: serializeUsers(room.users)
    });
  });

  socket.on('element-added', ({ element }) => {
    if (!currentRoomId) return;
    const room = getRoom(currentRoomId);
    const newElement = { ...element, id: element.id || uuidv4() };
    room.elements.push(newElement);
    socket.to(currentRoomId).emit('element-added', { element: newElement });
  });

  socket.on('element-updated', ({ element }) => {
    if (!currentRoomId) return;
    const room = getRoom(currentRoomId);
    const idx = room.elements.findIndex((e) => e.id === element.id);
    if (idx !== -1) {
      room.elements[idx] = element;
      socket.to(currentRoomId).emit('element-updated', { element });
    }
  });

  socket.on('element-deleted', ({ elementId }) => {
    if (!currentRoomId) return;
    const room = getRoom(currentRoomId);
    const idx = room.elements.findIndex((e) => e.id === elementId);
    if (idx !== -1) {
      room.elements.splice(idx, 1);
      socket.to(currentRoomId).emit('element-deleted', { elementId });
    }
  });

  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const room = getRoom(currentRoomId);
    room.users.delete(currentUserId);

    if (room.users.size === 0 && room.elements.length === 0) {
      rooms.delete(currentRoomId);
    } else {
      socket.to(currentRoomId).emit('user-left', {
        users: serializeUsers(room.users)
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`协同白板服务器运行在端口 ${PORT}`);
});
