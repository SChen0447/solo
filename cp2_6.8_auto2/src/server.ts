import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import type { CanvasElement, ClientToServerEvents, ServerToClientEvents } from './types';

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let canvasElements: CanvasElement[] = [];
const connectedUsers = new Map<string, string>();

const PING_INTERVAL = 30000;

setInterval(() => {
  io.emit('ping');
}, PING_INTERVAL);

io.on('connection', (socket) => {
  const userId = socket.id;
  connectedUsers.set(socket.id, userId);

  console.log(`User connected: ${userId}, total: ${connectedUsers.size}`);

  socket.emit('sync', canvasElements);

  socket.broadcast.emit('userJoined', userId);

  socket.on('draw', (element: CanvasElement) => {
    canvasElements.push(element);
    socket.broadcast.emit('draw', element);
  });

  socket.on('clear', () => {
    canvasElements = [];
    socket.broadcast.emit('clear');
  });

  socket.on('syncRequest', () => {
    socket.emit('sync', canvasElements);
  });

  socket.on('undo', (elementId: string) => {
    const index = canvasElements.findIndex(el => el.id === elementId);
    if (index !== -1) {
      canvasElements.splice(index, 1);
    }
    socket.broadcast.emit('undo', elementId);
  });

  socket.on('redo', (element: CanvasElement) => {
    canvasElements.push(element);
    socket.broadcast.emit('redo', element);
  });

  socket.on('pong', () => {
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    console.log(`User disconnected: ${userId}, total: ${connectedUsers.size}`);
    socket.broadcast.emit('userLeft', userId);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
