import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const MAX_HISTORY = 50;

class Room {
  constructor(roomId) {
    this.roomId = roomId;
    this.connections = new Map();
    this.operations = [];
    this.redoStack = [];
  }

  addConnection(userId, ws) {
    this.connections.set(userId, ws);
  }

  removeConnection(userId) {
    this.connections.delete(userId);
  }

  getUserIds() {
    return Array.from(this.connections.keys());
  }

  broadcast(message, excludeId = null) {
    const data = JSON.stringify(message);
    for (const [userId, ws] of this.connections) {
      if (userId !== excludeId && ws.readyState === 1) {
        ws.send(data);
      }
    }
  }

  addOperation(op) {
    this.operations.push(op);
    if (this.operations.length > MAX_HISTORY) {
      this.operations.shift();
    }
    this.redoStack = [];
  }

  undo() {
    if (this.operations.length > 0) {
      const op = this.operations.pop();
      if (op) {
        this.redoStack.push(op);
        return op;
      }
    }
    return null;
  }

  redo() {
    if (this.redoStack.length > 0) {
      const op = this.redoStack.pop();
      if (op) {
        this.operations.push(op);
        return op;
      }
    }
    return null;
  }

  clear() {
    this.operations = [];
    this.redoStack = [];
  }

  isEmpty() {
    return this.connections.size === 0;
  }
}

const rooms = new Map();

function getOrCreateRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Room(roomId);
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastUsers(room) {
  const userIds = room.getUserIds();
  room.broadcast({
    type: 'users',
    count: userIds.length,
    userIds,
  });
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentUserId = null;

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === 'hello') {
        const { roomId, userId } = message;
        currentUserId = userId || uuidv4();
        currentRoom = getOrCreateRoom(roomId || 'default');
        currentRoom.addConnection(currentUserId, ws);

        ws.send(
          JSON.stringify({
            type: 'hello',
            userId: currentUserId,
            roomId: currentRoom.roomId,
          })
        );

        ws.send(
          JSON.stringify({
            type: 'sync',
            operations: currentRoom.operations,
          })
        );

        broadcastUsers(currentRoom);
        return;
      }

      if (!currentRoom || !currentUserId) {
        return;
      }

      if (
        message.type === 'draw' ||
        message.type === 'text' ||
        message.type === 'stickyNote' ||
        message.type === 'delete'
      ) {
        currentRoom.addOperation(message);
        currentRoom.broadcast(message, currentUserId);
      } else if (message.type === 'clear') {
        currentRoom.clear();
        currentRoom.addOperation(message);
        currentRoom.broadcast(message, currentUserId);
      } else if (message.type === 'undo') {
        const undoneOp = currentRoom.undo();
        if (undoneOp) {
          currentRoom.broadcast(message, currentUserId);
        }
      } else if (message.type === 'redo') {
        const redoneOp = currentRoom.redo();
        if (redoneOp) {
          currentRoom.broadcast(message, currentUserId);
        }
      }
    } catch (err) {
      console.error('Message parse error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom && currentUserId) {
      currentRoom.removeConnection(currentUserId);
      broadcastUsers(currentRoom);
      if (currentRoom.isEmpty()) {
        rooms.delete(currentRoom.roomId);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
