const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SAMPLES_FILE = path.join(DATA_DIR, 'samples.json');

function readJSON(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId(arr) {
  if (arr.length === 0) return 1;
  return Math.max(...arr.map(item => item.id)) + 1;
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, user: { id: user.id, username: user.username, avatar: user.avatar } });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);
  if (users.find(u => u.username === username)) {
    res.status(400).json({ success: false, message: '用户名已存在' });
    return;
  }
  const newUser = {
    id: generateId(users),
    username,
    password,
    avatar: username.substring(0, 2).toUpperCase()
  };
  users.push(newUser);
  writeJSON(USERS_FILE, users);
  res.json({ success: true, user: { id: newUser.id, username: newUser.username, avatar: newUser.avatar } });
});

app.get('/api/samples', (req, res) => {
  const samples = readJSON(SAMPLES_FILE);
  const now = new Date();
  samples.forEach(sample => {
    if (sample.status === 'auctioning' && new Date(sample.endTime) < now) {
      sample.status = 'ended';
    }
  });
  writeJSON(SAMPLES_FILE, samples);
  res.json(samples);
});

app.get('/api/sample/:id', (req, res) => {
  const samples = readJSON(SAMPLES_FILE);
  const sample = samples.find(s => s.id === parseInt(req.params.id));
  if (sample) {
    res.json(sample);
  } else {
    res.status(404).json({ message: '样本不存在' });
  }
});

app.post('/api/sample/:id/bid', (req, res) => {
  const { userId, username, avatar, price } = req.body;
  const samples = readJSON(SAMPLES_FILE);
  const sample = samples.find(s => s.id === parseInt(req.params.id));
  if (!sample) {
    res.status(404).json({ success: false, message: '样本不存在' });
    return;
  }
  if (new Date(sample.endTime) < new Date()) {
    res.status(400).json({ success: false, message: '拍卖已结束' });
    return;
  }
  if (price <= sample.currentPrice) {
    res.status(400).json({ success: false, message: '出价必须高于当前价格' });
    return;
  }
  sample.currentPrice = price;
  sample.bidHistory.unshift({ userId, username, avatar, price, time: new Date().toISOString() });
  writeJSON(SAMPLES_FILE, samples);
  res.json({ success: true, sample });
});

app.get('/api/collection/:user', (req, res) => {
  const userId = parseInt(req.params.user);
  const samples = readJSON(SAMPLES_FILE);
  const won = samples.filter(s => {
    const ended = new Date(s.endTime) < new Date();
    if (!ended) return false;
    const highest = s.bidHistory[0];
    return highest && highest.userId === userId;
  });
  const selling = samples.filter(s => s.ownerId === userId);
  const bidding = samples.filter(s => {
    if (new Date(s.endTime) < new Date()) return false;
    return s.bidHistory.some(b => b.userId === userId);
  });
  res.json({ won, selling, bidding });
});

app.post('/api/samples', (req, res) => {
  const { name, story, colors, startPrice, endTime, ownerId, ownerName, ownerAvatar } = req.body;
  const samples = readJSON(SAMPLES_FILE);
  const newSample = {
    id: generateId(samples),
    name,
    story,
    ownerId,
    colors,
    startPrice: parseInt(startPrice),
    currentPrice: parseInt(startPrice),
    endTime,
    thumbnail: null,
    status: 'auctioning',
    bidHistory: []
  };
  samples.push(newSample);
  writeJSON(SAMPLES_FILE, samples);
  res.json({ success: true, sample: newSample });
});

app.listen(PORT, () => {
  console.log(`虚拟星尘拍卖行后端服务运行在 http://localhost:${PORT}`);
});
