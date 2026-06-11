import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { letterStore } from './letterStore';
import type { LetterData } from '../client/types';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('user:connect', (userId: string) => {
    const user = letterStore.addUser(userId, socket.id);
    console.log('User registered:', userId, 'Online users:', letterStore.getOnlineUserCount());
    
    io.emit('user:count', letterStore.getOnlineUserCount());
    
    const pendingLetters = letterStore.getPendingLettersForUser(userId);
    pendingLetters.forEach(letter => {
      socket.emit('letter:receive', letter);
    });
    
    socket.emit('user:stamps', user.stamps);
  });
  
  socket.on('letter:send', (letter: Omit<LetterData, 'id' | 'toUserId' | 'read' | 'forwardCount' | 'createdAt'>) => {
    const fullLetter: LetterData = {
      ...letter,
      id: uuidv4(),
      toUserId: '',
      read: false,
      forwardCount: 0,
      createdAt: Date.now()
    };
    
    const result = letterStore.addLetter(fullLetter);
    
    if (result.delivered && result.recipient) {
      const recipientSocket = letterStore.getSocketId(result.recipient.id);
      if (recipientSocket) {
        io.to(recipientSocket).emit('letter:receive', fullLetter);
        console.log('Letter delivered to:', result.recipient.id);
      }
    }
    
    letterStore.incrementLettersSent(letter.fromUserId);
    
    socket.emit('letter:delivered', fullLetter.id);
    console.log('Letter sent from:', letter.fromUserId, 'Delivered:', result.delivered);
  });
  
  socket.on('letter:forward', (letterId: string, fromUserId: string) => {
    const result = letterStore.forwardLetter(letterId, fromUserId);
    
    if (result.delivered && result.recipient && result.letter) {
      const recipientSocket = letterStore.getSocketId(result.recipient.id);
      if (recipientSocket) {
        io.to(recipientSocket).emit('letter:receive', result.letter);
      }
    }
    
    socket.emit('letter:forwarded', letterId);
  });
  
  socket.on('letter:read', (letterId: string, userId: string) => {
    letterStore.markLetterRead(letterId, userId);
  });
  
  socket.on('stamp:collect', (userId: string) => {
    const stamp = letterStore.awardStamp(userId);
    if (stamp) {
      socket.emit('stamp:awarded', stamp);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    letterStore.removeUser(socket.id);
    io.emit('user:count', letterStore.getOnlineUserCount());
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    onlineUsers: letterStore.getOnlineUserCount(),
    pendingLetters: letterStore['pendingLetters'].length
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
