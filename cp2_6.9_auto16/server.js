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

function getRoomState(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      cards: new Map()
    });
  }
  return rooms.get(roomId);
}

function getComplementaryColor(hex) {
  const color = hex.replace('#', '');
  const r = 255 - parseInt(color.substr(0, 2), 16);
  const g = 255 - parseInt(color.substr(2, 2), 16);
  const b = 255 - parseInt(color.substr(4, 2), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

io.on('connection', (socket) => {
  let currentUser = null;
  let currentRoomId = null;

  socket.on('join_room', ({ roomId, userId, userName, userColor }) => {
    const room = getRoomState(roomId);
    currentRoomId = roomId;
    currentUser = { id: userId, name: userName, color: userColor, connected: true };
    
    room.users.set(userId, currentUser);
    socket.join(roomId);

    const usersArray = Array.from(room.users.values());
    const cardsArray = Array.from(room.cards.values());
    
    socket.emit('room_state', { users: usersArray, cards: cardsArray });
    socket.to(roomId).emit('user_joined', currentUser);
  });

  socket.on('create_card', (cardData) => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    room.cards.set(cardData.id, cardData);
    socket.to(currentRoomId).emit('card_created', cardData);
  });

  socket.on('move_card', ({ cardId, x, y }) => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    const card = room.cards.get(cardId);
    if (card) {
      card.x = x;
      card.y = y;
      socket.to(currentRoomId).emit('card_moved', { cardId, x, y });
    }
  });

  socket.on('update_card_text', ({ cardId, text }) => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    const card = room.cards.get(cardId);
    if (card) {
      card.text = text;
      socket.to(currentRoomId).emit('card_text_updated', { cardId, text });
    }
  });

  socket.on('update_card_color', ({ cardId, color }) => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    const card = room.cards.get(cardId);
    if (card) {
      card.color = color;
      socket.to(currentRoomId).emit('card_color_updated', { cardId, color });
    }
  });

  socket.on('update_card_drawing', ({ cardId, drawing }) => {
    if (!currentRoomId) return;
    const room = getRoomState(currentRoomId);
    const card = room.cards.get(cardId);
    if (card) {
      card.drawing = drawing;
      socket.to(currentRoomId).emit('card_drawing_updated', { cardId, drawing });
    }
  });

  socket.on('clear_board', ({ roomId }) => {
    const room = getRoomState(roomId);
    room.cards.clear();
    io.to(roomId).emit('board_cleared');
  });

  socket.on('disconnect', () => {
    if (!currentRoomId || !currentUser) return;
    const room = getRoomState(currentRoomId);
    
    const user = room.users.get(currentUser.id);
    if (user) {
      user.connected = false;
    }

    room.cards.forEach((card) => {
      if (card.userId === currentUser.id) {
        card.offline = true;
      }
    });

    socket.to(currentRoomId).emit('user_left', { userId: currentUser.id });
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
