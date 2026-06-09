import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();
const users = new Map();

app.get('/api/rooms', (_req, res) => {
  const roomList = [];
  for (const [name, room] of rooms) {
    roomList.push({
      name,
      userCount: room.users.size
    });
  }
  res.json(roomList);
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('getRooms', (callback) => {
    const roomList = [];
    for (const [name, room] of rooms) {
      roomList.push({
        name,
        userCount: room.users.size
      });
    }
    callback(roomList);
  });

  socket.on('joinRoom', ({ roomName, nickname }, callback) => {
    if (!nickname || nickname.trim().length === 0 || nickname.length > 8) {
      callback({ success: false, error: '昵称不能为空且最多8个字符' });
      return;
    }
    if (!roomName || roomName.trim().length === 0 || roomName.length > 12) {
      callback({ success: false, error: '房间名不能为空且最多12个字符' });
      return;
    }

    let room = rooms.get(roomName);
    if (!room) {
      room = {
        name: roomName,
        users: new Map(),
        notes: []
      };
      rooms.set(roomName, room);
    }

    if (room.users.size >= 6) {
      callback({ success: false, error: '房间已满（最多6人）' });
      return;
    }

    const user = {
      id: socket.id,
      nickname: nickname.trim(),
      instrument: 'piano',
      muted: false
    };

    room.users.set(socket.id, user);
    users.set(socket.id, { roomName, ...user });
    socket.join(roomName);

    const userList = Array.from(room.users.values());
    callback({ success: true, users: userList, notes: room.notes });
    io.to(roomName).emit('userJoined', user);
    io.to(roomName).emit('roomUsers', userList);

    const allRooms = [];
    for (const [name, r] of rooms) {
      allRooms.push({ name, userCount: r.users.size });
    }
    io.emit('roomListUpdated', allRooms);
  });

  socket.on('setInstrument', (instrument) => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomName);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (user) {
      user.instrument = instrument;
      users.set(socket.id, { ...userInfo, instrument });
    }

    const userList = Array.from(room.users.values());
    io.to(userInfo.roomName).emit('roomUsers', userList);
  });

  socket.on('note', (noteData) => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomName);
    if (!room) return;

    const noteWithMeta = {
      ...noteData,
      userId: socket.id,
      instrument: userInfo.instrument,
      timestamp: Date.now()
    };

    room.notes.push(noteWithMeta);
    if (room.notes.length > 500) {
      room.notes = room.notes.slice(-500);
    }

    socket.to(userInfo.roomName).emit('note', noteWithMeta);
  });

  socket.on('reset', () => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomName);
    if (!room) return;

    room.notes = [];
    io.to(userInfo.roomName).emit('reset');
  });

  socket.on('toggleMute', (targetUserId) => {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomName);
    if (!room) return;

    socket.emit('muteToggled', targetUserId);
  });

  socket.on('leaveRoom', () => {
    handleDisconnect();
  });

  socket.on('disconnect', () => {
    handleDisconnect();
  });

  function handleDisconnect() {
    const userInfo = users.get(socket.id);
    if (!userInfo) return;

    const room = rooms.get(userInfo.roomName);
    if (room) {
      room.users.delete(socket.id);
      const userList = Array.from(room.users.values());

      if (room.users.size === 0) {
        rooms.delete(userInfo.roomName);
      } else {
        io.to(userInfo.roomName).emit('userLeft', socket.id);
        io.to(userInfo.roomName).emit('roomUsers', userList);
      }

      const allRooms = [];
      for (const [name, r] of rooms) {
        allRooms.push({ name, userCount: r.users.size });
      }
      io.emit('roomListUpdated', allRooms);
    }

    users.delete(socket.id);
    console.log('User disconnected:', socket.id);
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
