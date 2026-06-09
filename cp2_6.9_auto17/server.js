import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();

function getRoomState(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      users: new Map(),
      queue: [],
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
      volume: 0.7,
      songReactions: new Map()
    });
  }
  return rooms.get(roomId);
}

function serializeUsers(usersMap) {
  return Array.from(usersMap.values()).map(user => ({
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar
  }));
}

function generateAvatarColor(nickname) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUserId = null;

  socket.on('join_room', ({ roomId, nickname }) => {
    const room = getRoomState(roomId);
    const userId = socket.id;
    const avatar = generateAvatarColor(nickname);

    room.users.set(userId, { id: userId, nickname, avatar });
    socket.join(roomId);
    currentRoomId = roomId;
    currentUserId = userId;

    socket.emit('room_state', {
      users: serializeUsers(room.users),
      queue: room.queue,
      currentSong: room.currentSong,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      volume: room.volume,
      yourId: userId
    });

    io.to(roomId).emit('user_joined', { id: userId, nickname, avatar });
  });

  socket.on('add_song', (song) => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    const songWithId = { ...song, id: Date.now().toString() + Math.random().toString(36).substr(2, 5) };
    room.queue.push(songWithId);
    io.to(currentRoomId).emit('queue_updated', room.queue);

    if (!room.currentSong) {
      room.currentSong = room.queue.shift();
      room.currentTime = 0;
      room.songReactions.clear();
      io.to(currentRoomId).emit('song_changed', {
        currentSong: room.currentSong,
        queue: room.queue
      });
    }
  });

  socket.on('remove_song', ({ songId }) => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    room.queue = room.queue.filter(s => s.id !== songId);
    io.to(currentRoomId).emit('queue_updated', room.queue);
  });

  socket.on('play_next', () => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    
    if (room.queue.length > 0) {
      room.currentSong = room.queue.shift();
      room.currentTime = 0;
      room.songReactions.clear();
      room.isPlaying = true;
      io.to(currentRoomId).emit('song_changed', {
        currentSong: room.currentSong,
        queue: room.queue,
        isPlaying: true,
        currentTime: 0
      });
    } else {
      room.currentSong = null;
      room.isPlaying = false;
      io.to(currentRoomId).emit('song_changed', {
        currentSong: null,
        queue: room.queue,
        isPlaying: false,
        currentTime: 0
      });
    }
  });

  socket.on('play_pause', ({ isPlaying }) => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    room.isPlaying = isPlaying;
    socket.to(currentRoomId).emit('play_pause_updated', { isPlaying });
  });

  socket.on('seek', ({ currentTime }) => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    room.currentTime = currentTime;
    socket.to(currentRoomId).emit('seek_updated', { currentTime });
  });

  socket.on('set_volume', ({ volume }) => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    room.volume = volume;
    socket.to(currentRoomId).emit('volume_updated', { volume });
  });

  socket.on('send_reaction', ({ reaction }) => {
    if (!currentRoomId || !currentUserId) return;
    const room = getRoomState(currentRoomId);
    
    if (!room.currentSong) return;
    
    const songId = room.currentSong.id;
    if (!room.songReactions.has(songId)) {
      room.songReactions.set(songId, new Set());
    }
    
    const userReactions = room.songReactions.get(songId);
    if (userReactions.has(currentUserId)) return;
    
    userReactions.add(currentUserId);
    
    const user = room.users.get(currentUserId);
    io.to(currentRoomId).emit('reaction_received', {
      reaction,
      userId: currentUserId,
      nickname: user ? user.nickname : '匿名',
      avatar: user ? user.avatar : '#ccc'
    });
  });

  socket.on('song_ended', () => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    
    if (room.queue.length > 0) {
      room.currentSong = room.queue.shift();
      room.currentTime = 0;
      room.songReactions.clear();
      room.isPlaying = true;
      io.to(currentRoomId).emit('song_changed', {
        currentSong: room.currentSong,
        queue: room.queue,
        isPlaying: true,
        currentTime: 0
      });
    } else {
      room.currentSong = null;
      room.isPlaying = false;
      io.to(currentRoomId).emit('song_changed', {
        currentSong: null,
        queue: room.queue,
        isPlaying: false,
        currentTime: 0
      });
    }
  });

  socket.on('disconnect', () => {
    if (!currentRoomId || !currentUserId) return;
    const room = getRoomState(currentRoomId);
    room.users.delete(currentUserId);
    io.to(currentRoomId).emit('user_left', { id: currentUserId });

    if (room.users.size === 0) {
      rooms.delete(currentRoomId);
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
