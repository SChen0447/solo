import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = 3001;

let canvasState = {
  shapes: [],
  notes: [],
};

let history = [];
const MAX_HISTORY = 200;

const users = new Map();

const generateId = () => Math.random().toString(36).substr(2, 9);

const userColors = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
  '#ff8fab', '#a66cff', '#00b4d8', '#e0e1dd',
];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  const userId = generateId();
  const colorIndex = Math.floor(Math.random() * userColors.length);
  const user = {
    id: userId,
    socketId: socket.id,
    name: `用户${userId.substr(0, 4)}`,
    color: userColors[colorIndex],
  };
  users.set(socket.id, user);

  socket.emit('user:init', { userId, user });

  socket.emit('canvas:snapshot', canvasState);

  const userList = Array.from(users.values());
  io.emit('users:list', userList);

  socket.on('shape:add', (shape) => {
    canvasState.shapes.push(shape);
    socket.broadcast.emit('shape:add', shape);
    pushHistory({ type: 'shape:add', data: shape });
  });

  socket.on('shape:update', (updatedShape) => {
    const index = canvasState.shapes.findIndex((s) => s.id === updatedShape.id);
    if (index !== -1) {
      const oldShape = { ...canvasState.shapes[index] };
      canvasState.shapes[index] = updatedShape;
      socket.broadcast.emit('shape:update', updatedShape);
      pushHistory({ type: 'shape:update', data: { old: oldShape, new: updatedShape } });
    }
  });

  socket.on('shape:delete', (shapeId) => {
    const index = canvasState.shapes.findIndex((s) => s.id === shapeId);
    if (index !== -1) {
      const deletedShape = canvasState.shapes[index];
      canvasState.shapes.splice(index, 1);
      socket.broadcast.emit('shape:delete', shapeId);
      pushHistory({ type: 'shape:delete', data: deletedShape });
    }
  });

  socket.on('note:add', (note) => {
    canvasState.notes.push(note);
    socket.broadcast.emit('note:add', note);
    pushHistory({ type: 'note:add', data: note });
  });

  socket.on('note:update', (updatedNote) => {
    const index = canvasState.notes.findIndex((n) => n.id === updatedNote.id);
    if (index !== -1) {
      const oldNote = { ...canvasState.notes[index] };
      canvasState.notes[index] = updatedNote;
      socket.broadcast.emit('note:update', updatedNote);
      pushHistory({ type: 'note:update', data: { old: oldNote, new: updatedNote } });
    }
  });

  socket.on('note:delete', (noteId) => {
    const index = canvasState.notes.findIndex((n) => n.id === noteId);
    if (index !== -1) {
      const deletedNote = canvasState.notes[index];
      canvasState.notes.splice(index, 1);
      socket.broadcast.emit('note:delete', noteId);
      pushHistory({ type: 'note:delete', data: deletedNote });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    users.delete(socket.id);
    const userList = Array.from(users.values());
    io.emit('users:list', userList);
  });
});

function pushHistory(action) {
  history.push(action);
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', users: users.size, shapes: canvasState.shapes.length, notes: canvasState.notes.length });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
