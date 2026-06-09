import express, { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes } from 'crypto';
import type { User, Exhibition, Exhibit, LightTrail } from '../shared/types';

const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

interface UserWithPassword extends User {
  passwordHash: string;
}

const users = new Map<string, UserWithPassword>();
const exhibitions = new Map<string, Exhibition>();
const exhibits = new Map<string, Exhibit>();
const lightTrails = new Map<string, LightTrail>();
const tokens = new Map<string, { userId: string; expiresAt: number }>();

const TOKEN_TTL = 30 * 60 * 1000;

const generateId = (): string => randomBytes(12).toString('hex');

const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

const createToken = (userId: string): string => {
  const token = randomBytes(32).toString('hex');
  tokens.set(token, { userId, expiresAt: Date.now() + TOKEN_TTL });
  return token;
};

const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未授权访问' });
    return;
  }
  const token = authHeader.slice(7);
  const session = tokens.get(token);
  if (!session || session.expiresAt < Date.now()) {
    tokens.delete(token);
    res.status(401).json({ error: '会话已过期' });
    return;
  }
  (req as any).userId = session.userId;
  next();
};

const sanitizeUser = (user: UserWithPassword): User => {
  const { passwordHash, ...safe } = user;
  return safe;
};

// Auth endpoints
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  for (const user of users.values()) {
    if (user.username === username) {
      res.status(400).json({ error: '用户名已存在' });
      return;
    }
  }
  const user: UserWithPassword = {
    id: generateId(),
    username,
    passwordHash: hashPassword(password),
    createdAt: Date.now()
  };
  users.set(user.id, user);
  const token = createToken(user.id);
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  const user = [...users.values()].find(u => u.username === username);
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }
  const token = createToken(user.id);
  res.json({ token, user: sanitizeUser(user) });
});

// Exhibition endpoints
app.get('/api/exhibitions', (req: Request, res: Response) => {
  const all = [...exhibitions.values()];
  res.json(all);
});

app.post('/api/exhibitions', authenticate, (req: Request, res: Response) => {
  const { name, themeColor } = req.body;
  if (!name) {
    res.status(400).json({ error: '展厅名称不能为空' });
    return;
  }
  const exhibition: Exhibition = {
    id: generateId(),
    ownerId: (req as any).userId,
    name,
    themeColor: themeColor || '#66aaff',
    likes: 0,
    visitors: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  exhibitions.set(exhibition.id, exhibition);
  res.json(exhibition);
});

app.get('/api/exhibitions/:id', (req: Request, res: Response) => {
  const exhibition = exhibitions.get(req.params.id);
  if (!exhibition) {
    res.status(404).json({ error: '展厅不存在' });
    return;
  }
  res.json(exhibition);
});

app.put('/api/exhibitions/:id', authenticate, (req: Request, res: Response) => {
  const exhibition = exhibitions.get(req.params.id);
  if (!exhibition) {
    res.status(404).json({ error: '展厅不存在' });
    return;
  }
  if (exhibition.ownerId !== (req as any).userId) {
    res.status(403).json({ error: '无权限编辑' });
    return;
  }
  const updated: Exhibition = {
    ...exhibition,
    ...req.body,
    id: exhibition.id,
    ownerId: exhibition.ownerId,
    updatedAt: Date.now()
  };
  exhibitions.set(exhibition.id, updated);
  res.json(updated);
});

app.post('/api/exhibitions/:id/like', (req: Request, res: Response) => {
  const exhibition = exhibitions.get(req.params.id);
  if (!exhibition) {
    res.status(404).json({ error: '展厅不存在' });
    return;
  }
  exhibition.likes += 1;
  exhibition.updatedAt = Date.now();
  res.json({ likes: exhibition.likes });
});

// Exhibit endpoints
app.get('/api/exhibitions/:id/exhibits', (req: Request, res: Response) => {
  const list = [...exhibits.values()].filter(e => e.exhibitionId === req.params.id);
  res.json(list);
});

app.post('/api/exhibits', authenticate, (req: Request, res: Response) => {
  const { exhibitionId, name, description, x, y, lightType, glowColor } = req.body;
  if (!exhibitionId || !name) {
    res.status(400).json({ error: '展厅ID和展品名称不能为空' });
    return;
  }
  const exhibition = exhibitions.get(exhibitionId);
  if (!exhibition) {
    res.status(404).json({ error: '展厅不存在' });
    return;
  }
  if (exhibition.ownerId !== (req as any).userId) {
    res.status(403).json({ error: '无权限编辑' });
    return;
  }
  const exhibit: Exhibit = {
    id: generateId(),
    exhibitionId,
    name,
    description: description || '',
    x: x ?? 100,
    y: y ?? 100,
    lightType: lightType || 'pulse',
    glowColor: glowColor || '#ffaa66',
    createdAt: Date.now()
  };
  exhibits.set(exhibit.id, exhibit);
  res.json(exhibit);
});

app.put('/api/exhibits/:id', authenticate, (req: Request, res: Response) => {
  const exhibit = exhibits.get(req.params.id);
  if (!exhibit) {
    res.status(404).json({ error: '展品不存在' });
    return;
  }
  const exhibition = exhibitions.get(exhibit.exhibitionId);
  if (!exhibition || exhibition.ownerId !== (req as any).userId) {
    res.status(403).json({ error: '无权限编辑' });
    return;
  }
  const updated: Exhibit = {
    ...exhibit,
    ...req.body,
    id: exhibit.id,
    exhibitionId: exhibit.exhibitionId,
    createdAt: exhibit.createdAt
  };
  exhibits.set(exhibit.id, updated);
  res.json(updated);
});

app.delete('/api/exhibits/:id', authenticate, (req: Request, res: Response) => {
  const exhibit = exhibits.get(req.params.id);
  if (!exhibit) {
    res.status(404).json({ error: '展品不存在' });
    return;
  }
  const exhibition = exhibitions.get(exhibit.exhibitionId);
  if (!exhibition || exhibition.ownerId !== (req as any).userId) {
    res.status(403).json({ error: '无权限编辑' });
    return;
  }
  exhibits.delete(exhibit.id);
  res.json({ success: true });
});

// Light trail (comment) endpoints
app.get('/api/exhibits/:id/trails', (req: Request, res: Response) => {
  const now = Date.now();
  const list = [...lightTrails.values()]
    .filter(t => t.exhibitId === req.params.id && t.expiresAt > now);
  res.json(list);
});

app.post('/api/exhibits/:id/trails', (req: Request, res: Response) => {
  const exhibit = exhibits.get(req.params.id);
  if (!exhibit) {
    res.status(404).json({ error: '展品不存在' });
    return;
  }
  const { points, color } = req.body;
  if (!points || !Array.isArray(points)) {
    res.status(400).json({ error: '无效的轨迹点' });
    return;
  }
  const trail: LightTrail = {
    id: generateId(),
    exhibitId: exhibit.id,
    visitorId: req.headers['x-visitor-id'] as string || generateId(),
    points,
    color: color || '#ffcc44',
    createdAt: Date.now(),
    expiresAt: Date.now() + 5000
  };
  lightTrails.set(trail.id, trail);
  res.json(trail);
});

// Seed sample data
const seedData = () => {
  const demoUser: UserWithPassword = {
    id: 'demo1',
    username: 'demo',
    passwordHash: hashPassword('demo123'),
    createdAt: Date.now()
  };
  users.set(demoUser.id, demoUser);

  const demoExhibition: Exhibition = {
    id: 'exhib1',
    ownerId: demoUser.id,
    name: '数字艺术展 · 光之序曲',
    themeColor: '#ffaa66',
    likes: 128,
    visitors: ['visitor1', 'visitor2'],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now()
  };
  exhibitions.set(demoExhibition.id, demoExhibition);

  const demoExhibits: Exhibit[] = [
    {
      id: 'ex1',
      exhibitionId: demoExhibition.id,
      name: '量子波动',
      description: '基于量子力学波形数据生成的动态数字雕塑',
      x: 200,
      y: 220,
      lightType: 'pulse',
      glowColor: '#ff6b9d',
      createdAt: Date.now()
    },
    {
      id: 'ex2',
      exhibitionId: demoExhibition.id,
      name: '星尘旋涡',
      description: '由哈勃望远镜数据重构的宇宙星云',
      x: 500,
      y: 200,
      lightType: 'rotate',
      glowColor: '#66aaff',
      createdAt: Date.now()
    },
    {
      id: 'ex3',
      exhibitionId: demoExhibition.id,
      name: '数据瀑布',
      description: '实时金融数据可视化艺术装置',
      x: 800,
      y: 280,
      lightType: 'ripple',
      glowColor: '#00ffcc',
      createdAt: Date.now()
    }
  ];
  demoExhibits.forEach(e => exhibits.set(e.id, e));
};

seedData();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
