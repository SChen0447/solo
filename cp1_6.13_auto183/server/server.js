const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const users = new Map();
const stars = new Map();
const shareLinks = new Map();
const tokens = new Map();

const generateToken = () => {
  return 'token_' + uuidv4().replace(/-/g, '');
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权访问' });
  }
  const token = authHeader.slice(7);
  const userId = tokens.get(token);
  if (!userId) {
    return res.status(401).json({ error: 'Token无效' });
  }
  req.userId = userId;
  req.token = token;
  next();
};

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  for (const user of users.values()) {
    if (user.username === username) {
      return res.status(400).json({ error: '用户名已存在' });
    }
  }
  
  const userId = uuidv4();
  const user = { id: userId, username, password, createdAt: Date.now() };
  users.set(userId, user);
  
  const token = generateToken();
  tokens.set(token, userId);
  
  res.json({
    token,
    user: { id: userId, username }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  let foundUser = null;
  for (const user of users.values()) {
    if (user.username === username && user.password === password) {
      foundUser = user;
      break;
    }
  }
  
  if (!foundUser) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  const token = generateToken();
  tokens.set(token, foundUser.id);
  
  res.json({
    token,
    user: { id: foundUser.id, username: foundUser.username }
  });
});

app.post('/api/auth/logout', verifyToken, (req, res) => {
  tokens.delete(req.token);
  res.json({ success: true });
});

app.get('/api/stars', verifyToken, (req, res) => {
  const userStars = [];
  for (const star of stars.values()) {
    if (star.userId === req.userId) {
      userStars.push(star);
    }
  }
  userStars.sort((a, b) => a.createdAt - b.createdAt);
  res.json(userStars);
});

app.post('/api/stars', verifyToken, (req, res) => {
  const { x, y, color, size, content } = req.body;
  
  if (x === undefined || y === undefined) {
    return res.status(400).json({ error: '星星位置不能为空' });
  }
  
  const starId = uuidv4();
  const star = {
    id: starId,
    userId: req.userId,
    x,
    y,
    color: color || '#ffd93d',
    size: size || 40,
    content: content || '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  stars.set(starId, star);
  res.status(201).json(star);
});

app.put('/api/stars/:id', verifyToken, (req, res) => {
  const starId = req.params.id;
  const star = stars.get(starId);
  
  if (!star || star.userId !== req.userId) {
    return res.status(404).json({ error: '星星不存在' });
  }
  
  const { x, y, content, color, size } = req.body;
  
  if (x !== undefined) star.x = x;
  if (y !== undefined) star.y = y;
  if (content !== undefined) star.content = content;
  if (color !== undefined) star.color = color;
  if (size !== undefined) star.size = size;
  star.updatedAt = Date.now();
  
  res.json(star);
});

app.delete('/api/stars/:id', verifyToken, (req, res) => {
  const starId = req.params.id;
  const star = stars.get(starId);
  
  if (!star || star.userId !== req.userId) {
    return res.status(404).json({ error: '星星不存在' });
  }
  
  stars.delete(starId);
  
  for (const [key, value] of shareLinks) {
    if (value.starId === starId) {
      shareLinks.delete(key);
    }
  }
  
  res.json({ success: true });
});

app.post('/api/share/:starId', verifyToken, (req, res) => {
  const starId = req.params.id || req.params.starId;
  const star = stars.get(starId);
  
  if (!star || star.userId !== req.userId) {
    return res.status(404).json({ error: '星星不存在' });
  }
  
  const shortId = uuidv4().slice(0, 8);
  shareLinks.set(shortId, {
    starId,
    userId: req.userId,
    createdAt: Date.now()
  });
  
  res.json({
    shareId: shortId,
    shareUrl: `/share/${shortId}`
  });
});

app.get('/api/share/:shortId', (req, res) => {
  const shortId = req.params.shortId;
  const shareData = shareLinks.get(shortId);
  
  if (!shareData) {
    return res.status(404).json({ error: '分享链接不存在' });
  }
  
  const star = stars.get(shareData.starId);
  if (!star) {
    return res.status(404).json({ error: '星星不存在' });
  }
  
  const user = users.get(star.userId);
  
  res.json({
    star: {
      id: star.id,
      content: star.content,
      color: star.color,
      size: star.size,
      createdAt: star.createdAt
    },
    author: user ? { username: user.username } : null
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`时光·织梦录 后端服务器运行在 http://localhost:${PORT}`);
});
