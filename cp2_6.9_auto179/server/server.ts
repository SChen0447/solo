import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface Venue {
  id: string;
  name: string;
  address: string;
  contactPhone: string;
  notes: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  city: string;
  lat: number;
  lng: number;
  date: string;
}

interface Song {
  id: string;
  name: string;
  duration: number;
  bpm: number;
  key: string;
  notes: string;
  order: number;
}

interface Collaborator {
  id: string;
  email: string;
  nickname: string;
  color: string;
  token: string;
  accepted: boolean;
}

interface Tour {
  id: string;
  name: string;
  bandSize: number;
  startCity: string;
  endCity: string;
  totalDays: number;
  startDate: string;
  venues: Venue[];
  songs: Song[];
  collaborators: Collaborator[];
  createdAt: string;
}

const COLORS = [
  '#E91E63', '#3F51B5', '#4CAF50', '#FF9800', '#9C27B0',
  '#2196F3', '#00BCD4', '#8BC34A', '#FF5722', '#607D8B'
];

const app = express();
app.use(cors());
app.use(express.json());

let tours: Tour[] = [];
const wsClients = new Map<string, Set<WebSocket>>();

function generateLatLng(city: string, index: number): { lat: number; lng: number } {
  const base = (city.charCodeAt(0) || 30) + index * 7;
  return {
    lat: 20 + (base % 20) + Math.random() * 10,
    lng: 100 + (base % 30) + Math.random() * 15
  };
}

function generateVenues(startCity: string, endCity: string, totalDays: number, startDate: string): Venue[] {
  const venues: Venue[] = [];
  const cities = [startCity];
  const numVenues = Math.min(Math.max(Math.floor(totalDays / 2), 2), Math.floor(totalDays));
  
  for (let i = 1; i < numVenues - 1; i++) {
    cities.push(`城市${i + 1}`);
  }
  cities.push(endCity);

  let currentDate = new Date(startDate);
  cities.forEach((city, index) => {
    if (index > 0) {
      const daysToAdd = 1 + Math.floor(Math.random() * 3);
      currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    }
    const latLng = generateLatLng(city, index);
    venues.push({
      id: uuidv4(),
      name: `${city}Livehouse`,
      address: `${city}市中心街道${index + 1}号`,
      contactPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      notes: '',
      status: index % 3 === 0 ? 'confirmed' : index % 3 === 1 ? 'pending' : 'cancelled',
      city,
      lat: latLng.lat,
      lng: latLng.lng,
      date: currentDate.toISOString().split('T')[0]
    });
  });

  return venues;
}

function generateSampleSongs(): Song[] {
  const sampleSongs = [
    { name: '夜空的星', bpm: 120, key: 'C', duration: 210 },
    { name: '城市漫游', bpm: 140, key: 'G', duration: 195 },
    { name: '清晨的雾', bpm: 90, key: 'Am', duration: 240 },
    { name: '夏日回忆', bpm: 128, key: 'D', duration: 220 },
    { name: '远方的你', bpm: 110, key: 'Em', duration: 250 },
    { name: '街角的灯', bpm: 100, key: 'F', duration: 205 },
    { name: '雨后彩虹', bpm: 135, key: 'Bb', duration: 180 },
    { name: '追梦人', bpm: 150, key: 'A', duration: 230 }
  ];

  return sampleSongs.map((s, i) => ({
    id: uuidv4(),
    name: s.name,
    duration: s.duration,
    bpm: s.bpm,
    key: s.key,
    notes: '',
    order: i
  }));
}

app.get('/api/tours', (_req, res) => {
  res.json(tours);
});

app.post('/api/tours', (req, res) => {
  const { name, bandSize, startCity, endCity, totalDays } = req.body;
  
  if (!name || name.length > 20) {
    return res.status(400).json({ error: '巡演名称不能为空且最多20字' });
  }
  if (!bandSize || bandSize < 1 || bandSize > 10) {
    return res.status(400).json({ error: '乐队人数必须在1-10之间' });
  }
  if (!totalDays || totalDays < 1 || totalDays > 60) {
    return res.status(400).json({ error: '总天数必须在1-60之间' });
  }

  const startDate = new Date().toISOString().split('T')[0];
  const tour: Tour = {
    id: uuidv4(),
    name,
    bandSize,
    startCity,
    endCity,
    totalDays,
    startDate,
    venues: generateVenues(startCity, endCity, totalDays, startDate),
    songs: generateSampleSongs(),
    collaborators: [],
    createdAt: new Date().toISOString()
  };

  tours.push(tour);
  res.status(201).json(tour);
});

app.put('/api/tours/:id', (req, res) => {
  const { id } = req.params;
  const tourIndex = tours.findIndex(t => t.id === id);
  
  if (tourIndex === -1) {
    return res.status(404).json({ error: '巡演不存在' });
  }

  tours[tourIndex] = { ...tours[tourIndex], ...req.body };
  res.json(tours[tourIndex]);
});

app.delete('/api/tours/:id', (req, res) => {
  const { id } = req.params;
  const tourIndex = tours.findIndex(t => t.id === id);
  
  if (tourIndex === -1) {
    return res.status(404).json({ error: '巡演不存在' });
  }

  tours.splice(tourIndex, 1);
  res.status(204).send();
});

app.put('/api/tours/:id/songs', (req, res) => {
  const { id } = req.params;
  const { songs } = req.body;
  const tourIndex = tours.findIndex(t => t.id === id);
  
  if (tourIndex === -1) {
    return res.status(404).json({ error: '巡演不存在' });
  }

  tours[tourIndex].songs = songs;
  
  broadcastToTour(id, {
    type: 'songs_updated',
    tourId: id,
    songs
  });

  res.json({ success: true });
});

app.put('/api/tours/:id/venues', (req, res) => {
  const { id } = req.params;
  const { venueId, venue } = req.body;
  const tourIndex = tours.findIndex(t => t.id === id);
  
  if (tourIndex === -1) {
    return res.status(404).json({ error: '巡演不存在' });
  }

  const venueIndex = tours[tourIndex].venues.findIndex(v => v.id === venueId);
  if (venueIndex === -1) {
    return res.status(404).json({ error: '演出场地不存在' });
  }

  tours[tourIndex].venues[venueIndex] = { ...tours[tourIndex].venues[venueIndex], ...venue };
  
  broadcastToTour(id, {
    type: 'venues_updated',
    tourId: id,
    venues: tours[tourIndex].venues
  });

  res.json(tours[tourIndex].venues[venueIndex]);
});

app.post('/api/invite', (req, res) => {
  const { tourId, email, nickname } = req.body;
  const tourIndex = tours.findIndex(t => t.id === tourId);
  
  if (tourIndex === -1) {
    return res.status(404).json({ error: '巡演不存在' });
  }

  const token = uuidv4();
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  
  const collaborator: Collaborator = {
    id: uuidv4(),
    email,
    nickname: nickname || email.split('@')[0],
    color,
    token,
    accepted: false
  };

  tours[tourIndex].collaborators.push(collaborator);
  const inviteLink = `http://localhost:8080/invite?token=${token}&tourId=${tourId}`;
  
  res.json({ inviteLink, token, collaborator });
});

app.get('/api/invite/:token', (req, res) => {
  const { token } = req.params;
  
  for (const tour of tours) {
    const collaborator = tour.collaborators.find(c => c.token === token);
    if (collaborator) {
      collaborator.accepted = true;
      
      broadcastToTour(tour.id, {
        type: 'collaborator_joined',
        tourId: tour.id,
        collaborator
      });
      
      return res.json({ tour, collaborator });
    }
  }
  
  res.status(404).json({ error: '邀请链接无效' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastToTour(tourId: string, message: object) {
  const clients = wsClients.get(tourId);
  if (clients) {
    const data = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}

wss.on('connection', (ws) => {
  let currentTourId: string | null = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'join_tour' && typeof message.tourId === 'string') {
        const tourId: string = message.tourId;
        currentTourId = tourId;
        if (!wsClients.has(tourId)) {
          wsClients.set(tourId, new Set());
        }
        wsClients.get(tourId)!.add(ws);
      }
      
      if (message.type === 'song_reorder' && currentTourId) {
        broadcastToTour(currentTourId, message);
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    if (currentTourId) {
      const clients = wsClients.get(currentTourId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          wsClients.delete(currentTourId);
        }
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
});
