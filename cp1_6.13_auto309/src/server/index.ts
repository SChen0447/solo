import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'guangyu-memory-amber-secret-key-2024';

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  createdAt: string;
}

interface Capsule {
  id: string;
  userId: string;
  title: string;
  content: string;
  imageUrl?: string;
  musicUrl?: string;
  unlockDate: string;
  themeColor: string;
  createdAt: string;
  isOpened: boolean;
}

const users: User[] = [];
const capsules: Capsule[] = [];

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: '令牌无效或已过期' });
  }
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

app.post('/api/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    if (username.length > 20) {
      return res.status(400).json({ error: '用户名不能超过20个字符' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少需要6个字符' });
    }

    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser: User = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请填写用户名和密码' });
    }

    const user = users.find(u => u.username === username || u.email === username);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/capsules/:userId', authenticateToken, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if ((req as any).userId !== userId) {
      return res.status(403).json({ error: '无权访问此用户的数据' });
    }

    const userCapsules = capsules.filter(c => c.userId === userId);
    res.json({ capsules: userCapsules });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/capsules', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title, content, imageUrl, musicUrl, unlockDate, themeColor } = req.body;

    if (!title || !content || !unlockDate || !themeColor) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    if (title.length > 30) {
      return res.status(400).json({ error: '标题不能超过30个字符' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: '内容不能超过500个字符' });
    }

    if (imageUrl && !isValidUrl(imageUrl)) {
      return res.status(400).json({ error: '图片链接格式无效' });
    }

    if (musicUrl && !isValidUrl(musicUrl)) {
      return res.status(400).json({ error: '音乐链接格式无效' });
    }

    const unlockDateTime = new Date(unlockDate);
    const now = new Date();
    const minUnlockDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (unlockDateTime < minUnlockDate) {
      return res.status(400).json({ error: '解锁日期必须晚于当前时间至少1天' });
    }

    const newCapsule: Capsule = {
      id: uuidv4(),
      userId,
      title,
      content,
      imageUrl,
      musicUrl,
      unlockDate: unlockDateTime.toISOString(),
      themeColor,
      createdAt: new Date().toISOString(),
      isOpened: false
    };

    capsules.push(newCapsule);
    res.status(201).json({ message: '胶囊创建成功', capsule: newCapsule });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/capsule/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const capsule = capsules.find(c => c.id === id);

    if (!capsule) {
      return res.status(404).json({ error: '胶囊不存在' });
    }

    if (capsule.userId !== (req as any).userId) {
      return res.status(403).json({ error: '无权访问此胶囊' });
    }

    res.json({ capsule });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.listen(PORT, () => {
  console.log(`光语·记忆琥珀 后端服务器已启动: http://localhost:${PORT}`);
});
