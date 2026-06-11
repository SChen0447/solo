import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  Card,
  Connection,
  User,
  WSMessage,
  WSMessageType,
  InitStateData,
  ConflictMessageData,
} from '../src/types';

const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

let cards: Card[] = [];
let connections: Connection[] = [];
const users: Map<string, { ws: ExtendedWebSocket; user: User }> = new Map();

const broadcast = (message: WSMessage, excludeId?: string) => {
  const messageStr = JSON.stringify(message);
  users.forEach(({ user }, userId) => {
    if (userId !== excludeId && user.id !== excludeId) {
      const client = users.get(userId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  });
};

const sendToClient = (userId: string, message: WSMessage) => {
  const client = users.get(userId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
};

const createMessage = <T>(type: WSMessageType, senderId: string, data: T): WSMessage<T> => ({
  type,
  senderId,
  timestamp: Date.now(),
  data,
});

wss.on('connection', (ws: ExtendedWebSocket) => {
  const userId = uuidv4();
  ws.userId = userId;
  ws.isAlive = true;

  const user: User = {
    id: userId,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    name: `用户${users.size + 1}`,
  };

  users.set(userId, { ws, user });

  const initData: InitStateData = {
    cards,
    connections,
    users: Array.from(users.values()).map((u) => u.user),
    currentUserId: userId,
  };
  ws.send(JSON.stringify(createMessage('state:init', 'server', initData)));

  broadcast(createMessage('user:join', 'server', user), userId);

  ws.on('message', (message) => {
    try {
      const parsed: WSMessage = JSON.parse(message.toString());
      handleMessage(parsed, userId);
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('close', () => {
    users.delete(userId);
    cards = cards.map((card) =>
      card.editingBy === userId ? { ...card, editingBy: undefined } : card
    );
    broadcast(createMessage('card:update', 'server', cards), userId);
    broadcast(createMessage('user:leave', 'server', { userId }), userId);
  });
});

const handleMessage = (message: WSMessage, senderId: string) => {
  const { type, data, timestamp } = message;

  switch (type) {
    case 'card:create': {
      const newCard = data as Card;
      cards.push(newCard);
      broadcast(createMessage('card:create', senderId, newCard), senderId);
      break;
    }

    case 'card:position': {
      const { id, x, y } = data as { id: string; x: number; y: number };
      const cardIndex = cards.findIndex((c) => c.id === id);
      if (cardIndex !== -1) {
        cards[cardIndex] = { ...cards[cardIndex], x, y };
        broadcast(createMessage('card:position', senderId, { id, x, y, timestamp }), senderId);
      }
      break;
    }

    case 'card:update': {
      const { id, content } = data as { id: string; content: string };
      const cardIndex = cards.findIndex((c) => c.id === id);
      if (cardIndex !== -1) {
        cards[cardIndex] = { ...cards[cardIndex], content, editingBy: undefined };
        broadcast(createMessage('card:update', senderId, { id, content, timestamp }), senderId);
      }
      break;
    }

    case 'card:delete': {
      const { id } = data as { id: string };
      cards = cards.filter((c) => c.id !== id);
      connections = connections.filter((c) => c.fromCardId !== id && c.toCardId !== id);
      broadcast(createMessage('card:delete', senderId, { id }), senderId);
      broadcast(createMessage('connection:delete', senderId, { cardId: id }), senderId);
      break;
    }

    case 'card:edit-start': {
      const { cardId } = data as { cardId: string };
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        if (card.editingBy && card.editingBy !== senderId) {
          const conflictData: ConflictMessageData = {
            cardId,
            conflict: true,
            message: '该卡片正被其他人编辑',
          };
          sendToClient(senderId, createMessage('card:edit-start', 'server', conflictData));
        } else {
          const cardIndex = cards.findIndex((c) => c.id === cardId);
          if (cardIndex !== -1) {
            cards[cardIndex] = { ...cards[cardIndex], editingBy: senderId };
            broadcast(createMessage('card:edit-start', senderId, { cardId, userId: senderId }), senderId);
          }
        }
      }
      break;
    }

    case 'card:edit-end': {
      const { cardId } = data as { cardId: string };
      const cardIndex = cards.findIndex((c) => c.id === cardId);
      if (cardIndex !== -1 && cards[cardIndex].editingBy === senderId) {
        cards[cardIndex] = { ...cards[cardIndex], editingBy: undefined };
        broadcast(createMessage('card:edit-end', senderId, { cardId }), senderId);
      }
      break;
    }

    case 'connection:create': {
      const newConnection = data as Connection;
      const existingIndex = connections.findIndex(
        (c) =>
          (c.fromCardId === newConnection.fromCardId && c.toCardId === newConnection.toCardId) ||
          (c.fromCardId === newConnection.toCardId && c.toCardId === newConnection.fromCardId)
      );
      if (existingIndex === -1) {
        connections.push(newConnection);
        broadcast(createMessage('connection:create', senderId, newConnection), senderId);
      }
      break;
    }

    case 'connection:delete': {
      const { id } = data as { id: string };
      connections = connections.filter((c) => c.id !== id);
      broadcast(createMessage('connection:delete', senderId, { id }), senderId);
      break;
    }

    case 'user:cursor': {
      const { x, y } = data as { x: number; y: number };
      const userData = users.get(senderId);
      if (userData) {
        userData.user.cursorX = x;
        userData.user.cursorY = y;
        broadcast(createMessage('user:cursor', senderId, { userId: senderId, x, y }), senderId);
      }
      break;
    }
  }
};

const interval = setInterval(() => {
  wss.clients.forEach((ws: ExtendedWebSocket) => {
    if (ws.isAlive === false) {
      const userId = ws.userId;
      if (userId) {
        users.delete(userId);
        cards = cards.map((card) =>
          card.editingBy === userId ? { ...card, editingBy: undefined } : card
        );
        broadcast(createMessage('card:update', 'server', cards));
        broadcast(createMessage('user:leave', 'server', { userId }));
      }
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
