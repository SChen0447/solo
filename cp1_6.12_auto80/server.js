const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const DATA_DIR = path.join(__dirname, 'data');
const SONGS_FILE = path.join(DATA_DIR, 'songs.json');
const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SONGS_FILE)) {
    fs.writeFileSync(SONGS_FILE, '[]');
  }
  if (!fs.existsSync(PLAYLISTS_FILE)) {
    fs.writeFileSync(PLAYLISTS_FILE, '[]');
  }
}

function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

ensureDataFiles();

app.get('/api/songs', (req, res) => {
  const songs = readJSON(SONGS_FILE);
  res.json(songs);
});

app.post('/api/songs', (req, res) => {
  const songs = readJSON(SONGS_FILE);
  const newSongs = Array.isArray(req.body) ? req.body : [req.body];
  const savedSongs = newSongs.map(song => ({
    id: uuidv4(),
    title: song.title || '未知歌曲',
    artist: song.artist || '未知歌手',
    genre: song.genre || '流行',
    duration: song.duration || 180,
    size: song.size || 0,
    addedAt: song.addedAt || new Date().toISOString()
  }));
  songs.push(...savedSongs);
  writeJSON(SONGS_FILE, songs);
  res.status(201).json(savedSongs);
});

app.put('/api/songs/:id', (req, res) => {
  const songs = readJSON(SONGS_FILE);
  const index = songs.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '歌曲不存在' });
  }
  songs[index] = { ...songs[index], ...req.body };
  writeJSON(SONGS_FILE, songs);
  res.json(songs[index]);
});

app.get('/api/playlists', (req, res) => {
  const playlists = readJSON(PLAYLISTS_FILE);
  res.json(playlists);
});

app.post('/api/playlists', (req, res) => {
  const playlists = readJSON(PLAYLISTS_FILE);
  const newPlaylist = {
    id: uuidv4(),
    name: req.body.name || '未命名清单',
    songIds: req.body.songIds || [],
    updatedAt: new Date().toISOString()
  };
  playlists.push(newPlaylist);
  writeJSON(PLAYLISTS_FILE, playlists);
  res.status(201).json(newPlaylist);
});

app.put('/api/playlists/:id', (req, res) => {
  const playlists = readJSON(PLAYLISTS_FILE);
  const index = playlists.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '清单不存在' });
  }
  playlists[index] = {
    ...playlists[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  writeJSON(PLAYLISTS_FILE, playlists);
  res.json(playlists[index]);
});

app.listen(PORT, () => {
  console.log(`音藏馆后端服务已启动: http://localhost:${PORT}`);
});
