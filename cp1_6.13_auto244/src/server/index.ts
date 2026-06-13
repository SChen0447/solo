import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface User {
  id: string;
  username: string;
  password: string;
}

interface Postcard {
  id: string;
  userId: string;
  accessCode: string;
  imageData: string;
  lines: Array<{ points: { x: number; y: number }[]; color: string; width: number }>;
  emotion: string | null;
  viewCount: number;
  maxViews: number;
  createdAt: number;
  views: Array<{ time: number; ipSuffix: string }>;
}

const users: User[] = [];
const postcards: Postcard[] = [];

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getIpSuffix(ip: string): string {
  const parts = ip.split('.');
  return parts.length > 0 ? parts[parts.length - 1] : '0';
}

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user: User = {
      id: uuidv4(),
      username,
      password: hashedPassword,
    };
    users.push(user);
    res.json({ userId: user.id, username: user.username });
  } catch (error) {
    res.status(500).json({ error: '注册失败' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    res.json({ userId: user.id, username: user.username });
  } catch (error) {
    res.status(500).json({ error: '登录失败' });
  }
});

app.post('/api/postcards', (req: Request, res: Response) => {
  try {
    const { userId, imageData, lines, emotion } = req.body;
    if (!userId) {
      return res.status(401).json({ error: '未登录' });
    }
    let accessCode = generateAccessCode();
    while (postcards.some(p => p.accessCode === accessCode)) {
      accessCode = generateAccessCode();
    }
    const postcard: Postcard = {
      id: uuidv4(),
      userId,
      accessCode,
      imageData: imageData || '',
      lines: lines || [],
      emotion: emotion || null,
      viewCount: 0,
      maxViews: 5,
      createdAt: Date.now(),
      views: [],
    };
    postcards.push(postcard);
    res.json({ id: postcard.id, accessCode: postcard.accessCode });
  } catch (error) {
    res.status(500).json({ error: '保存失败' });
  }
});

app.get('/api/postcards/user/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userPostcards = postcards
      .filter(p => p.userId === userId)
      .map(p => ({
        id: p.id,
        accessCode: p.accessCode,
        imageData: p.imageData,
        emotion: p.emotion,
        viewCount: p.viewCount,
        maxViews: p.maxViews,
        createdAt: p.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json(userPostcards);
  } catch (error) {
    res.status(500).json({ error: '获取明信片列表失败' });
  }
});

app.get('/api/postcards/code/:accessCode', (req: Request, res: Response) => {
  try {
    const { accessCode } = req.params;
    const postcard = postcards.find(p => p.accessCode === accessCode.toUpperCase());
    if (!postcard) {
      return res.status(404).json({ error: '明信片不存在' });
    }
    const ip = (req.ip || req.socket.remoteAddress || '0.0.0.0').toString();
    const ipSuffix = getIpSuffix(ip);
    
    if (postcard.viewCount >= postcard.maxViews) {
      const idx = postcards.findIndex(p => p.id === postcard.id);
      if (idx !== -1) {
        postcards.splice(idx, 1);
      }
      return res.json({ 
        ...postcard, 
        shouldBurn: true,
        isBurned: true,
      });
    }
    
    postcard.viewCount++;
    postcard.views.push({ time: Date.now(), ipSuffix });
    
    const remaining = postcard.maxViews - postcard.viewCount;
    const shouldBurn = remaining <= 0;
    
    res.json({
      id: postcard.id,
      imageData: postcard.imageData,
      lines: postcard.lines,
      emotion: postcard.emotion,
      viewCount: postcard.viewCount,
      maxViews: postcard.maxViews,
      remainingViews: remaining,
      shouldBurn,
    });
  } catch (error) {
    res.status(500).json({ error: '获取明信片失败' });
  }
});

app.delete('/api/postcards/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = postcards.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: '明信片不存在' });
    }
    postcards.splice(idx, 1);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
