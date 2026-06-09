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

const MAX_USERS = 4;
const USER_COLORS = [
  '#e74c3c', '#3498db', '#f1c40f', '#9b59b6'
];

const state = {
  buildings: [],
  lighting: { hour: 12, color: '#ffffff' },
  users: new Map()
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', users: state.users.size });
});

io.on('connection', (socket) => {
  if (state.users.size >= MAX_USERS) {
    socket.emit('room_full');
    socket.disconnect(true);
    return;
  }

  const userColor = USER_COLORS[state.users.size];
  const user = { id: socket.id, color: userColor };
  state.users.set(socket.id, user);

  socket.emit('sync_state', {
    buildings: state.buildings,
    lighting: state.lighting,
    users: Array.from(state.users.values()),
    currentUser: user
  });

  io.emit('user_list', Array.from(state.users.values()));
  io.emit('user_joined', user);

  socket.on('add_building', (data) => {
    const { gridX, gridZ, type } = data;
    const exists = state.buildings.find(
      (b) => b.gridX === gridX && b.gridZ === gridZ
    );
    if (!exists) {
      const building = { gridX, gridZ, type, userId: socket.id };
      state.buildings.push(building);
      io.emit('building_added', building);
    }
  });

  socket.on('update_lighting', (data) => {
    state.lighting = { ...state.lighting, ...data };
    io.emit('lighting_updated', { ...state.lighting, userId: socket.id });
  });

  socket.on('disconnect', () => {
    state.users.delete(socket.id);
    io.emit('user_list', Array.from(state.users.values()));
    io.emit('user_left', { id: socket.id });
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`CityFlow server running on port ${PORT}`);
});
