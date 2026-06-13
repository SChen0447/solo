import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = 'liuguang-memory-echo-secret-key-2024';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/audio', express.static(path.join(__dirname, '../audio')));

interface User {
  id: string;
  username: string;
  password: string;
  createdAt: string;
}

interface DiaryEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  moodColor: string;
  musicId: string;
  createdAt: string;
}

const users: User[] = [];
const diaries: DiaryEntry[] = [];

const PRESET_TRACKS = [
  { id: 'track1', name: '晨曦微光', duration: 30 },
  { id: 'track2', name: '星河漫游', duration: 35 },
  { id: 'track3', name: '雨后初晴', duration: 28 },
  { id: 'track4', name: '深海呢喃', duration: 40 },
  { id: 'track5', name: '霓虹梦境', duration: 32 },
  { id: 'track6', name: '晚风私语', duration: 36 }
];

const MOOD_COLORS = [
  '#ff6b6b', '#ffa502', '#ffd93d', '#6bcb77',
  '#48dbfb', '#5f27cd', '#ff9ff3', '#00d2d3',
  '#ee5a6f', '#a55eea', '#26de81', '#fd9644'
];

interface AuthRequest extends express.Request {
  userId?: string;
}

const authenticateToken = (
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: '无效的认证令牌' });
  }
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: '用户名至少3个字符，密码至少6个字符' });
    }

    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user: User = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    users.push(user);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: { id: user.id, username: user.username, createdAt: user.createdAt }
    });
  } catch (err) {
    console.error('注册错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: { id: user.id, username: user.username, createdAt: user.createdAt }
    });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/diaries', authenticateToken, (req: AuthRequest, res) => {
  try {
    const userDiaries = diaries
      .filter(d => d.userId === req.userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(userDiaries);
  } catch (err) {
    console.error('获取日记错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/diaries', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { title, content, moodColor, musicId } = req.body;

    if (!title || !content || !moodColor || !musicId) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    if (title.length > 20) {
      return res.status(400).json({ error: '标题不能超过20个字符' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: '正文不能超过500个字符' });
    }

    if (!MOOD_COLORS.includes(moodColor)) {
      return res.status(400).json({ error: '无效的心情颜色' });
    }

    if (!PRESET_TRACKS.find(t => t.id === musicId)) {
      return res.status(400).json({ error: '无效的音乐曲目' });
    }

    const diary: DiaryEntry = {
      id: uuidv4(),
      userId: req.userId!,
      title,
      content,
      moodColor,
      musicId,
      createdAt: new Date().toISOString()
    };
    diaries.push(diary);
    res.status(201).json(diary);
  } catch (err) {
    console.error('创建日记错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/diaries/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const diary = diaries.find(d => d.id === req.params.id && d.userId === req.userId);
    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }
    res.json(diary);
  } catch (err) {
    console.error('获取日记详情错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.delete('/api/diaries/:id', authenticateToken, (req: AuthRequest, res) => {
  try {
    const index = diaries.findIndex(d => d.id === req.params.id && d.userId === req.userId);
    if (index === -1) {
      return res.status(404).json({ error: '日记不存在' });
    }
    diaries.splice(index, 1);
    res.json({ message: '日记已删除' });
  } catch (err) {
    console.error('删除日记错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/tracks', (_req, res) => {
  res.json(PRESET_TRACKS);
});

app.get('/api/colors', (_req, res) => {
  res.json(MOOD_COLORS);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`流光·记忆回响 后端服务已启动: http://localhost:${PORT}`);
});
