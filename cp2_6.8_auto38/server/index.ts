import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  collapsed: boolean;
  color: string;
  creatorColor: string;
  children: string[];
}

interface User {
  id: string;
  name: string;
  color: string;
  socketId: string;
  cursorPosition?: { nodeId: string; offset: number };
}

interface Room {
  id: string;
  name: string;
  users: User[];
  nodes: Record<string, MindMapNode>;
  maxUsers: number;
}

const COLOR_PALETTE = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFA94D',
  '#9775FA',
  '#51CF66',
  '#F06595',
];

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms: Record<string, Room> = {};

function getNextColor(room: Room): string {
  const usedColors = room.users.map((u) => u.color);
  for (const color of COLOR_PALETTE) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

function createRootNode(color: string): MindMapNode {
  return {
    id: uuidv4(),
    text: '中央主题',
    x: 400,
    y: 300,
    parentId: null,
    collapsed: false,
    color: '#ffffff',
    creatorColor: color,
    children: [],
  };
}

function getOrCreateRoom(roomName: string): Room {
  if (!rooms[roomName]) {
    const rootNode = createRootNode(COLOR_PALETTE[0]);
    rooms[roomName] = {
      id: roomName,
      name: roomName,
      users: [],
      nodes: { [rootNode.id]: rootNode },
      maxUsers: 5,
    };
  }
  return rooms[roomName];
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let currentRoom: string | null = null;
  let currentUser: User | null = null;

  socket.on('join-room', (roomName: string, userName: string, callback) => {
    const room = getOrCreateRoom(roomName);

    if (room.users.length >= room.maxUsers) {
      callback({ success: false, error: '房间已满，最多支持5人同时在线' });
      return;
    }

    const color = getNextColor(room);
    const user: User = {
      id: uuidv4(),
      name: userName || '匿名用户',
      color,
      socketId: socket.id,
    };

    room.users.push(user);
    currentRoom = roomName;
    currentUser = user;

    socket.join(roomName);

    callback({
      success: true,
      user,
      users: room.users,
      nodes: room.nodes,
    });

    socket.to(roomName).emit('user-joined', user);
  });

  socket.on('add-node', (parentId: string, callback) => {
    if (!currentRoom || !currentUser) return;

    const room = rooms[currentRoom];
    const parent = room.nodes[parentId];
    if (!parent) {
      callback && callback({ success: false, error: '父节点不存在' });
      return;
    }

    const childCount = parent.children.length;
    const newNode: MindMapNode = {
      id: uuidv4(),
      text: '新节点',
      x: parent.x + 180,
      y: parent.y + (childCount - parent.children.length / 2) * 60,
      parentId,
      collapsed: false,
      color: '#ffffff',
      creatorColor: currentUser.color,
      children: [],
    };

    room.nodes[newNode.id] = newNode;
    parent.children.push(newNode.id);
    parent.collapsed = false;

    io.to(currentRoom).emit('node-added', newNode, parentId);
    callback && callback({ success: true, node: newNode });
  });

  socket.on('update-node', (nodeId: string, updates: Partial<MindMapNode>) => {
    if (!currentRoom || !currentUser) return;

    const room = rooms[currentRoom];
    const node = room.nodes[nodeId];
    if (!node) return;

    Object.assign(node, updates);
    socket.to(currentRoom).emit('node-updated', nodeId, updates, currentUser.id);
  });

  socket.on('delete-node', (nodeId: string) => {
    if (!currentRoom || !currentUser) return;

    const room = rooms[currentRoom];
    const node = room.nodes[nodeId];
    if (!node || !node.parentId) return;

    const parent = room.nodes[node.parentId];
    if (parent) {
      parent.children = parent.children.filter((id) => id !== nodeId);
    }

    const deleteRecursive = (id: string) => {
      const n = room.nodes[id];
      if (!n) return;
      n.children.forEach(deleteRecursive);
      delete room.nodes[id];
    };
    deleteRecursive(nodeId);

    io.to(currentRoom).emit('node-deleted', nodeId, node.parentId);
  });

  socket.on('move-node', (nodeId: string, x: number, y: number) => {
    if (!currentRoom || !currentUser) return;

    const room = rooms[currentRoom];
    const node = room.nodes[nodeId];
    if (!node) return;

    node.x = x;
    node.y = y;

    socket.to(currentRoom).emit('node-moved', nodeId, x, y, currentUser.id);
  });

  socket.on('cursor-move', (nodeId: string | null, offset: number) => {
    if (!currentRoom || !currentUser) return;

    currentUser.cursorPosition = nodeId
      ? { nodeId, offset }
      : undefined;

    socket.to(currentRoom).emit('cursor-updated', currentUser.id, nodeId, offset);
  });

  socket.on('toggle-collapse', (nodeId: string) => {
    if (!currentRoom || !currentUser) return;

    const room = rooms[currentRoom];
    const node = room.nodes[nodeId];
    if (!node) return;

    node.collapsed = !node.collapsed;
    io.to(currentRoom).emit('node-toggled', nodeId, node.collapsed);
  });

  socket.on('change-node-color', (nodeId: string, color: string) => {
    if (!currentRoom || !currentUser) return;

    const room = rooms[currentRoom];
    const node = room.nodes[nodeId];
    if (!node) return;

    node.color = color;
    io.to(currentRoom).emit('node-color-changed', nodeId, color);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    if (currentRoom && currentUser) {
      const room = rooms[currentRoom];
      room.users = room.users.filter((u) => u.id !== currentUser!.id);

      socket.to(currentRoom).emit('user-left', currentUser.id);

      if (room.users.length === 0) {
        setTimeout(() => {
          if (rooms[currentRoom!] && rooms[currentRoom!].users.length === 0) {
            delete rooms[currentRoom!];
            console.log('Room cleaned up:', currentRoom);
          }
        }, 60000);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
