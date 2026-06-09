import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server;

export function setupSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join', (data: { userId: string }) => {
      socket.join(`user:${data.userId}`);
      console.log(`User ${data.userId} joined`);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
