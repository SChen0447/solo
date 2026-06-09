import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { RoomManager, NodeData, User } from './roomManager';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const rooms: Map<string, RoomManager> = new Map();

function getOrCreateRoom(roomId: string): RoomManager {
  let room = rooms.get(roomId);
  if (!room) {
    room = new RoomManager();
    rooms.set(roomId, room);
  }
  return room;
}

const DEFAULT_ROOM = 'default-brainstorm-room';

io.on('connection', (socket) => {
  let currentRoomId: string = DEFAULT_ROOM;
  let currentUserId: string = socket.id;

  socket.on('join-room', ({ roomId, username }: { roomId?: string; username?: string }) => {
    currentRoomId = roomId || DEFAULT_ROOM;
    currentUserId = socket.id;
    const room = getOrCreateRoom(currentRoomId);
    const user = room.join(currentUserId, username || `用户${currentUserId.slice(-4)}`);

    socket.join(currentRoomId);

    socket.emit('room-state', {
      nodes: room.getNodes(),
      users: room.getUsers(),
      historyIndex: room.getHistoryIndex(),
      historyLength: room.getHistoryLength()
    });

    socket.to(currentRoomId).emit('user-joined', { user });
  });

  socket.on('cursor-move', ({ x, y }: { x: number; y: number }) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    room.updateCursor(currentUserId, x, y);
    socket.to(currentRoomId).emit('cursor-update', {
      userId: currentUserId,
      x,
      y
    });
  });

  socket.on('node-add', ({ node }: { node: NodeData }) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    room.addNode(node);
    io.to(currentRoomId).emit('node-added', { node });
    io.to(currentRoomId).emit('history-update', {
      historyIndex: room.getHistoryIndex(),
      historyLength: room.getHistoryLength()
    });
  });

  socket.on('node-move', ({ nodeId, x, y }: { nodeId: string; x: number; y: number }) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const node = room.moveNode(nodeId, x, y);
    if (node) {
      io.to(currentRoomId).emit('node-moved', { nodeId, x, y });
      io.to(currentRoomId).emit('history-update', {
        historyIndex: room.getHistoryIndex(),
        historyLength: room.getHistoryLength()
      });
    }
  });

  socket.on('node-update-text', ({ nodeId, text }: { nodeId: string; text: string }) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const node = room.updateText(nodeId, text);
    if (node) {
      io.to(currentRoomId).emit('node-text-updated', { nodeId, text });
      io.to(currentRoomId).emit('history-update', {
        historyIndex: room.getHistoryIndex(),
        historyLength: room.getHistoryLength()
      });
    }
  });

  socket.on('node-delete', ({ nodeId }: { nodeId: string }) => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    room.deleteNode(nodeId);
    io.to(currentRoomId).emit('node-deleted', { nodeId });
    io.to(currentRoomId).emit('history-update', {
      historyIndex: room.getHistoryIndex(),
      historyLength: room.getHistoryLength()
    });
  });

  socket.on('undo', () => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const nodes = room.undo();
    io.to(currentRoomId).emit('undone', {
      nodes,
      historyIndex: room.getHistoryIndex(),
      historyLength: room.getHistoryLength()
    });
  });

  socket.on('redo', () => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const nodes = room.redo();
    io.to(currentRoomId).emit('redone', {
      nodes,
      historyIndex: room.getHistoryIndex(),
      historyLength: room.getHistoryLength()
    });
  });

  socket.on('reset', () => {
    const room = rooms.get(currentRoomId);
    if (!room) return;
    room.reset();
    io.to(currentRoomId).emit('resetted', {
      nodes: [],
      historyIndex: -1,
      historyLength: 0
    });
  });

  socket.on('disconnect', () => {
    const room = rooms.get(currentRoomId);
    if (room) {
      room.leave(currentUserId);
      socket.to(currentRoomId).emit('user-left', { userId: currentUserId });
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Brainstorm server running on http://localhost:${PORT}`);
});
