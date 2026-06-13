import express, { Request, Response } from 'express';
import crypto from 'crypto';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

interface User {
  id: string;
  username: string;
  password: string;
  token?: string;
  createdAt: string;
}

interface TeaSession {
  id: string;
  userId: string;
  date: string;
  totalScore: number;
  deformationCount: number;
  pourCount: number;
  averageResponseTime: number;
  scoreHistory: Array<{ timestamp: number; score: number }>;
}

const users: Map<string, User> = new Map();
const tokens: Map<string, string> = new Map();
const sessions: TeaSession[] = [];

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: '用户名至少3位，密码至少6位' });
    }

    const existingUser = Array.from(users.values()).find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const userId = crypto.randomUUID();
    const user: User = {
      id: userId,
      username,
      password: crypto.createHash('sha256').update(password).digest('hex'),
      createdAt: new Date().toISOString()
    };

    users.set(userId, user);

    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, userId);
    user.token = token;

    return res.status(201).json({
      message: '注册成功',
      token,
      user: { id: userId, username }
    });
  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const user = Array.from(users.values()).find(
      u => u.username === username && u.password === hashedPassword
    );

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, user.id);
    user.token = token;

    return res.json({
      message: '登录成功',
      token,
      user: { id: user.id, username }
    });
  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

const authenticate = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权访问' });
  }

  const token = authHeader.split(' ')[1];
  const userId = tokens.get(token);
  if (!userId || !users.has(userId)) {
    return res.status(401).json({ error: '无效的令牌' });
  }

  (req as any).userId = userId;
  next();
};

app.post('/api/tea-session', authenticate, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { totalScore, deformationCount, pourCount, averageResponseTime, scoreHistory } = req.body;

    const today = new Date().toISOString().split('T')[0];
    const existingIndex = sessions.findIndex(
      s => s.userId === userId && s.date === today
    );

    const sessionData: TeaSession = {
      id: existingIndex >= 0 ? sessions[existingIndex].id : crypto.randomUUID(),
      userId,
      date: today,
      totalScore: totalScore || 0,
      deformationCount: deformationCount || 0,
      pourCount: pourCount || 0,
      averageResponseTime: averageResponseTime || 0,
      scoreHistory: scoreHistory || []
    };

    if (existingIndex >= 0) {
      sessions[existingIndex] = sessionData;
    } else {
      sessions.push(sessionData);
    }

    return res.status(201).json({ message: '会话已保存', session: sessionData });
  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/tea-session', authenticate, (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userSessions = sessions
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({ sessions: userSessions });
  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`茶舍服务器运行在 http://localhost:${PORT}`);
});
