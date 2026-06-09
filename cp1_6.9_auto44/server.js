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

const TRACK_COLORS = ['#ff4757', '#3742fa', '#2ed573', '#ffa502'];
const MAX_USERS_PER_ROOM = 4;

const rooms = new Map();

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getPublicRoom() {
  for (const [roomId, room] of rooms) {
    if (room.isPublic && room.users.size < MAX_USERS_PER_ROOM) {
      return roomId;
    }
  }
  return null;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let currentRoomId = null;
  let userId = null;
  let trackIndex = -1;

  socket.on('create-room', (data, callback) => {
    const { isPublic = false } = data || {};
    let roomId;
    do {
      roomId = generateRoomId();
    } while (rooms.has(roomId));

    const room = {
      id: roomId,
      isPublic,
      users: new Map(),
      tracks: [
        { id: 0, color: TRACK_COLORS[0], notes: [], userId: null, volume: 80, muted: false },
        { id: 1, color: TRACK_COLORS[1], notes: [], userId: null, volume: 80, muted: false },
        { id: 2, color: TRACK_COLORS[2], notes: [], userId: null, volume: 80, muted: false },
        { id: 3, color: TRACK_COLORS[3], notes: [], userId: null, volume: 80, muted: false }
      ],
      bpm: 120,
      createdAt: Date.now()
    };
    rooms.set(roomId, room);
    callback({ success: true, roomId });
  });

  socket.on('join-room', (data, callback) => {
    const { roomId, randomMatch = false, userName } = data || {};
    let targetRoomId = roomId;

    if (randomMatch) {
      targetRoomId = getPublicRoom();
      if (!targetRoomId) {
        targetRoomId = generateRoomId();
        const room = {
          id: targetRoomId,
          isPublic: true,
          users: new Map(),
          tracks: [
            { id: 0, color: TRACK_COLORS[0], notes: [], userId: null, volume: 80, muted: false },
            { id: 1, color: TRACK_COLORS[1], notes: [], userId: null, volume: 80, muted: false },
            { id: 2, color: TRACK_COLORS[2], notes: [], userId: null, volume: 80, muted: false },
            { id: 3, color: TRACK_COLORS[3], notes: [], userId: null, volume: 80, muted: false }
          ],
          bpm: 120,
          createdAt: Date.now()
        };
        rooms.set(targetRoomId, room);
      }
    }

    const room = rooms.get(targetRoomId);
    if (!room) {
      callback({ success: false, error: '房间不存在' });
      return;
    }

    if (room.users.size >= MAX_USERS_PER_ROOM) {
      callback({ success: false, error: '房间已满' });
      return;
    }

    let assignedTrack = -1;
    for (let i = 0; i < 4; i++) {
      if (!room.tracks[i].userId) {
        assignedTrack = i;
        break;
      }
    }

    if (assignedTrack === -1) {
      callback({ success: false, error: '没有可用轨道' });
      return;
    }

    userId = uuidv4();
    trackIndex = assignedTrack;
    currentRoomId = targetRoomId;
    socket.join(targetRoomId);

    room.tracks[assignedTrack].userId = userId;
    room.users.set(userId, {
      id: userId,
      socketId: socket.id,
      name: userName || `用户${assignedTrack + 1}`,
      trackIndex: assignedTrack,
      color: TRACK_COLORS[assignedTrack],
      cursorX: 0,
      cursorY: 0,
      currentNote: null
    });

    const usersList = Array.from(room.users.values()).map(u => ({
      id: u.id,
      name: u.name,
      trackIndex: u.trackIndex,
      color: u.color
    }));

    const tracksState = room.tracks.map(t => ({
      id: t.id,
      color: t.color,
      notes: t.notes,
      userId: t.userId,
      volume: t.volume,
      muted: t.muted
    }));

    callback({
      success: true,
      userId,
      roomId: targetRoomId,
      trackIndex,
      color: TRACK_COLORS[assignedTrack],
      users: usersList,
      tracks: tracksState,
      bpm: room.bpm
    });

    socket.to(targetRoomId).emit('user-joined', {
      user: {
        id: userId,
        name: userName || `用户${assignedTrack + 1}`,
        trackIndex: assignedTrack,
        color: TRACK_COLORS[assignedTrack]
      }
    });
  });

  socket.on('note-on', (data) => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const room = rooms.get(currentRoomId);
    const user = room.users.get(userId);
    if (!user) return;

    user.currentNote = { pitch: data.pitch, startTime: Date.now() };
    socket.to(currentRoomId).emit('note-on', {
      userId,
      trackIndex,
      pitch: data.pitch,
      time: Date.now()
    });
  });

  socket.on('note-off', (data) => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const room = rooms.get(currentRoomId);
    const user = room.users.get(userId);
    if (!user || !user.currentNote) return;

    const note = {
      id: uuidv4(),
      pitch: user.currentNote.pitch,
      startTime: user.currentNote.startTime,
      duration: Math.max(50, Date.now() - user.currentNote.startTime),
      trackId: trackIndex
    };

    room.tracks[trackIndex].notes.push(note);
    user.currentNote = null;

    io.to(currentRoomId).emit('note-added', { note, userId });
  });

  socket.on('add-note', (data) => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const room = rooms.get(currentRoomId);
    const note = { ...data.note, id: uuidv4(), trackId: trackIndex };
    room.tracks[trackIndex].notes.push(note);
    io.to(currentRoomId).emit('note-added', { note, userId });
  });

  socket.on('update-note', (data) => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const room = rooms.get(currentRoomId);
    const track = room.tracks[trackIndex];
    const noteIndex = track.notes.findIndex(n => n.id === data.noteId);
    if (noteIndex !== -1) {
      track.notes[noteIndex] = { ...track.notes[noteIndex], ...data.changes };
      io.to(currentRoomId).emit('note-updated', {
        noteId: data.noteId,
        changes: data.changes,
        userId,
        trackId: trackIndex
      });
    }
  });

  socket.on('delete-note', (data) => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const room = rooms.get(currentRoomId);
    const track = room.tracks[trackIndex];
    track.notes = track.notes.filter(n => n.id !== data.noteId);
    io.to(currentRoomId).emit('note-deleted', {
      noteId: data.noteId,
      userId,
      trackId: trackIndex
    });
  });

  socket.on('update-cursor', (data) => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const room = rooms.get(currentRoomId);
    const user = room.users.get(userId);
    if (user) {
      user.cursorX = data.x;
      user.cursorY = data.y;
      socket.to(currentRoomId).emit('cursor-updated', {
        userId,
        x: data.x,
        y: data.y
      });
    }
  });

  socket.on('update-bpm', (data) => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const room = rooms.get(currentRoomId);
    room.bpm = data.bpm;
    io.to(currentRoomId).emit('bpm-updated', { bpm: data.bpm, userId });
  });

  socket.on('update-track', (data) => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const room = rooms.get(currentRoomId);
    const track = room.tracks[trackIndex];
    if (data.volume !== undefined) track.volume = data.volume;
    if (data.muted !== undefined) track.muted = data.muted;
    io.to(currentRoomId).emit('track-updated', {
      trackId: trackIndex,
      volume: track.volume,
      muted: track.muted,
      userId
    });
  });

  socket.on('disconnect', () => {
    if (!currentRoomId || !rooms.has(currentRoomId)) return;
    const room = rooms.get(currentRoomId);
    room.tracks[trackIndex].userId = null;
    room.users.delete(userId);

    socket.to(currentRoomId).emit('user-left', { userId, trackIndex });

    if (room.users.size === 0) {
      setTimeout(() => {
        if (rooms.has(currentRoomId) && rooms.get(currentRoomId).users.size === 0) {
          rooms.delete(currentRoomId);
        }
      }, 60000);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Music Jam Server running on port ${PORT}`);
});
