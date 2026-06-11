import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface SoundWave {
  id: string;
  type: 'audio' | 'text';
  content: string;
  frequencies: number[];
  createdAt: number;
  authorId: string;
}

interface Bottle {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  soundWaves: SoundWave[];
  createdAt: number;
  launchPosition: { x: number; y: number };
  authorId: string;
  rotation: number;
  waveOffset: number;
  color: string;
  playCount: number;
}

interface OceanState {
  currentStrength: number;
  windDirection: number;
  windStrength: number;
}

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3000;

let bottles: Bottle[] = [];
const MAX_BOTTLES = 50;

let oceanState: OceanState = {
  currentStrength: 0.5,
  windDirection: 45,
  windStrength: 0.3
};

function generateFrequencies(content: string, type: 'audio' | 'text'): number[] {
  const bands = 8;
  const frequencies: number[] = [];
  
  if (type === 'text') {
    for (let i = 0; i < bands; i++) {
      const charCode = content.charCodeAt(i % content.length) || 50;
      frequencies.push(0.3 + (charCode % 70) / 100 + Math.random() * 0.2);
    }
  } else {
    for (let i = 0; i < bands; i++) {
      frequencies.push(0.2 + Math.random() * 0.8);
    }
  }
  return frequencies;
}

function generateBottleColor(frequencies: number[]): string {
  const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
  const hue = Math.floor(avgFreq * 360);
  return `hsl(${hue}, 80%, 60%)`;
}

function createBottle(x: number, y: number, content: string, type: 'audio' | 'text', authorId: string): Bottle {
  const frequencies = generateFrequencies(content, type);
  const color = generateBottleColor(frequencies);
  
  const bottle: Bottle = {
    id: uuidv4(),
    x,
    y,
    velocityX: (Math.random() - 0.5) * 2,
    velocityY: (Math.random() - 0.5) * 2,
    soundWaves: [{
      id: uuidv4(),
      type,
      content,
      frequencies,
      createdAt: Date.now(),
      authorId
    }],
    createdAt: Date.now(),
    launchPosition: { x, y },
    authorId,
    rotation: Math.random() * Math.PI * 2,
    waveOffset: Math.random() * Math.PI * 2,
    color,
    playCount: 0
  };
  
  bottles.push(bottle);
  
  if (bottles.length > MAX_BOTTLES) {
    bottles = bottles.slice(-MAX_BOTTLES);
  }
  
  return bottle;
}

function replyToBottle(bottleId: string, content: string, type: 'audio' | 'text', authorId: string): Bottle | null {
  const bottle = bottles.find(b => b.id === bottleId);
  if (!bottle) return null;
  
  const frequencies = generateFrequencies(content, type);
  bottle.soundWaves.push({
    id: uuidv4(),
    type,
    content,
    frequencies,
    createdAt: Date.now(),
    authorId
  });
  
  return bottle;
}

function updateBottles(deltaTime: number) {
  const windRad = (oceanState.windDirection * Math.PI) / 180;
  const windX = Math.cos(windRad) * oceanState.windStrength * 60;
  const windY = Math.sin(windRad) * oceanState.windStrength * 60;
  const currentSpeed = oceanState.currentStrength * 30;
  
  bottles.forEach(bottle => {
    const perlinX = Math.sin(bottle.y * 0.01 + Date.now() * 0.001) * 0.5;
    const perlinY = Math.cos(bottle.x * 0.01 + Date.now() * 0.0013) * 0.5;
    
    bottle.velocityX += (windX + perlinX * currentSpeed) * deltaTime * 0.1;
    bottle.velocityY += (windY + perlinY * currentSpeed) * deltaTime * 0.1;
    
    bottle.velocityX *= 0.99;
    bottle.velocityY *= 0.99;
    
    const maxSpeed = 50 + oceanState.currentStrength * 30;
    const speed = Math.sqrt(bottle.velocityX ** 2 + bottle.velocityY ** 2);
    if (speed > maxSpeed) {
      bottle.velocityX = (bottle.velocityX / speed) * maxSpeed;
      bottle.velocityY = (bottle.velocityY / speed) * maxSpeed;
    }
    
    bottle.x += bottle.velocityX * deltaTime;
    bottle.y += bottle.velocityY * deltaTime;
    
    if (bottle.x < 50) { bottle.x = 50; bottle.velocityX = Math.abs(bottle.velocityX) * 0.5; }
    if (bottle.x > 1550) { bottle.x = 1550; bottle.velocityX = -Math.abs(bottle.velocityX) * 0.5; }
    if (bottle.y < 50) { bottle.y = 50; bottle.velocityY = Math.abs(bottle.velocityY) * 0.5; }
    if (bottle.y > 850) { bottle.y = 850; bottle.velocityY = -Math.abs(bottle.velocityY) * 0.5; }
    
    bottle.rotation += (bottle.velocityX * 0.001 + Math.sin(Date.now() * 0.002 + bottle.waveOffset) * 0.002);
    bottle.waveOffset += deltaTime * 2;
  });
}

function getTopBottles(limit: number = 5): Bottle[] {
  return [...bottles]
    .sort((a, b) => b.soundWaves.length - a.soundWaves.length)
    .slice(0, limit);
}

let lastUpdate = Date.now();

function gameLoop() {
  const now = Date.now();
  const deltaTime = Math.min((now - lastUpdate) / 1000, 0.1);
  lastUpdate = now;
  
  updateBottles(deltaTime);
  
  io.emit('oceanState', {
    bottles: bottles.slice(0, 20),
    oceanState,
    topBottles: getTopBottles(5),
    timestamp: now
  });
}

setInterval(gameLoop, 1000 / 30);

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);
  
  socket.emit('initialState', {
    bottles: bottles.slice(0, 20),
    oceanState,
    topBottles: getTopBottles(5),
    clientId: socket.id
  });
  
  socket.on('throwBottle', (data: { x: number; y: number; content: string; type: 'audio' | 'text' }) => {
    const bottle = createBottle(data.x, data.y, data.content, data.type, socket.id);
    io.emit('newBottle', bottle);
  });
  
  socket.on('replyBottle', (data: { bottleId: string; content: string; type: 'audio' | 'text' }) => {
    const bottle = replyToBottle(data.bottleId, data.content, data.type, socket.id);
    if (bottle) {
      io.emit('bottleUpdated', bottle);
    }
  });
  
  socket.on('playBottle', (data: { bottleId: string }) => {
    const bottle = bottles.find(b => b.id === data.bottleId);
    if (bottle) {
      bottle.playCount++;
      io.emit('bottlePlayed', { bottleId: data.bottleId, playCount: bottle.playCount });
    }
  });
  
  socket.on('updateOcean', (data: Partial<OceanState>) => {
    if (data.currentStrength !== undefined) {
      oceanState.currentStrength = Math.max(0, Math.min(1, data.currentStrength));
    }
    if (data.windDirection !== undefined) {
      oceanState.windDirection = data.windDirection % 360;
    }
    if (data.windStrength !== undefined) {
      oceanState.windStrength = Math.max(0, Math.min(1, data.windStrength));
    }
    io.emit('oceanStateUpdated', oceanState);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.get('/api/bottles', (req, res) => {
  res.json({ bottles: bottles.slice(0, 20), topBottles: getTopBottles(5) });
});

app.get('/api/ocean', (req, res) => {
  res.json(oceanState);
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
