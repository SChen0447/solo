import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());

interface User {
  id: string;
  username: string;
  password: string;
}

interface FireworkRecipe {
  id: string;
  userId: string;
  name: string;
  color: string;
  pattern: 'circle' | 'star' | 'heart' | 'butterfly' | 'spiral';
  launchDuration: number;
  pitch: number;
  isPublic: boolean;
  createdAt: number;
}

interface Performance {
  id: string;
  userId: string;
  name: string;
  fireworkIds: string[];
  timestamps: number[];
  bpm: number;
  waveform: OscillatorType;
  isPublic: boolean;
  createdAt: number;
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const usersFile = path.join(DATA_DIR, 'users.json');
const recipesFile = path.join(DATA_DIR, 'recipes.json');
const performancesFile = path.join(DATA_DIR, 'performances.json');

const readJSON = <T>(file: string, defaultValue: T): T => {
  if (!fs.existsSync(file)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return defaultValue;
  }
};

const writeJSON = <T>(file: string, data: T): void => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  const users = readJSON<User[]>(usersFile, []);
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  
  const newUser: User = {
    id: uuidv4(),
    username,
    password
  };
  
  users.push(newUser);
  writeJSON(usersFile, users);
  
  res.json({ id: newUser.id, username: newUser.username });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJSON<User[]>(usersFile, []);
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  res.json({ id: user.id, username: user.username });
});

app.get('/api/users', (req, res) => {
  const { q } = req.query;
  const users = readJSON<User[]>(usersFile, []);
  
  if (q) {
    const filtered = users.filter(u => 
      u.username.toLowerCase().includes((q as string).toLowerCase())
    ).map(u => ({ id: u.id, username: u.username }));
    return res.json(filtered);
  }
  
  res.json(users.map(u => ({ id: u.id, username: u.username })));
});

app.get('/api/recipes', (req, res) => {
  const { userId, isPublic } = req.query;
  const recipes = readJSON<FireworkRecipe[]>(recipesFile, []);
  
  let filtered = recipes;
  if (userId) {
    filtered = filtered.filter(r => r.userId === userId);
  }
  if (isPublic === 'true') {
    filtered = filtered.filter(r => r.isPublic);
  }
  
  res.json(filtered);
});

app.post('/api/recipes', (req, res) => {
  const { userId, name, color, pattern, launchDuration, pitch } = req.body;
  
  if (!userId || !name || !color || !pattern) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  const recipes = readJSON<FireworkRecipe[]>(recipesFile, []);
  const newRecipe: FireworkRecipe = {
    id: uuidv4(),
    userId,
    name,
    color,
    pattern,
    launchDuration: launchDuration || 1.2,
    pitch: pitch || 60,
    isPublic: false,
    createdAt: Date.now()
  };
  
  recipes.push(newRecipe);
  writeJSON(recipesFile, recipes);
  
  res.json(newRecipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const recipes = readJSON<FireworkRecipe[]>(recipesFile, []);
  const index = recipes.findIndex(r => r.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '配方不存在' });
  }
  
  recipes[index] = { ...recipes[index], ...req.body };
  writeJSON(recipesFile, recipes);
  
  res.json(recipes[index]);
});

app.delete('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const recipes = readJSON<FireworkRecipe[]>(recipesFile, []);
  const filtered = recipes.filter(r => r.id !== id);
  
  if (filtered.length === recipes.length) {
    return res.status(404).json({ error: '配方不存在' });
  }
  
  writeJSON(recipesFile, filtered);
  res.json({ success: true });
});

app.post('/api/recipes/:id/copy', (req, res) => {
  const { id } = req.params;
  const { targetUserId } = req.body;
  
  const recipes = readJSON<FireworkRecipe[]>(recipesFile, []);
  const source = recipes.find(r => r.id === id);
  
  if (!source) {
    return res.status(404).json({ error: '配方不存在' });
  }
  
  const newRecipe: FireworkRecipe = {
    ...source,
    id: uuidv4(),
    userId: targetUserId,
    isPublic: false,
    createdAt: Date.now()
  };
  
  recipes.push(newRecipe);
  writeJSON(recipesFile, recipes);
  
  res.json(newRecipe);
});

app.get('/api/gallery', (req, res) => {
  const recipes = readJSON<FireworkRecipe[]>(recipesFile, []);
  const users = readJSON<User[]>(usersFile, []);
  const userMap = new Map(users.map(u => [u.id, u.username]));
  
  const publicRecipes = recipes
    .filter(r => r.isPublic)
    .map(r => ({
      ...r,
      username: userMap.get(r.userId) || '未知用户'
    }));
  
  res.json(publicRecipes);
});

app.get('/api/performances', (req, res) => {
  const { userId, isPublic } = req.query;
  const performances = readJSON<Performance[]>(performancesFile, []);
  
  let filtered = performances;
  if (userId) {
    filtered = filtered.filter(p => p.userId === userId);
  }
  if (isPublic === 'true') {
    filtered = filtered.filter(p => p.isPublic);
  }
  
  res.json(filtered);
});

app.post('/api/performances', (req, res) => {
  const { userId, name, fireworkIds, timestamps, bpm, waveform } = req.body;
  
  if (!userId || !name || !fireworkIds || !timestamps) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  const performances = readJSON<Performance[]>(performancesFile, []);
  const newPerformance: Performance = {
    id: uuidv4(),
    userId,
    name,
    fireworkIds,
    timestamps,
    bpm: bpm || 100,
    waveform: waveform || 'sine',
    isPublic: false,
    createdAt: Date.now()
  };
  
  performances.push(newPerformance);
  writeJSON(performancesFile, performances);
  
  res.json(newPerformance);
});

app.put('/api/performances/:id', (req, res) => {
  const { id } = req.params;
  const performances = readJSON<Performance[]>(performancesFile, []);
  const index = performances.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '表演不存在' });
  }
  
  performances[index] = { ...performances[index], ...req.body };
  writeJSON(performancesFile, performances);
  
  res.json(performances[index]);
});

app.delete('/api/performances/:id', (req, res) => {
  const { id } = req.params;
  const performances = readJSON<Performance[]>(performancesFile, []);
  const filtered = performances.filter(p => p.id !== id);
  
  if (filtered.length === performances.length) {
    return res.status(404).json({ error: '表演不存在' });
  }
  
  writeJSON(performancesFile, filtered);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
