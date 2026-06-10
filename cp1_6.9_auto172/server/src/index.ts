import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { users, recipes, usernameIndex, genId, User, Recipe, RecipeElements, RecipeConditions } from './store';
import { authMiddleware, signToken, AuthRequest } from './auth';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || username.length < 2 || password.length < 4) {
      res.status(400).json({ error: '用户名至少2位，密码至少4位' });
      return;
    }
    if (usernameIndex.has(username)) {
      res.status(409).json({ error: '用户名已存在' });
      return;
    }
    const id = genId();
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = { id, username, passwordHash, createdAt: Date.now() };
    users.set(id, user);
    usernameIndex.set(username, id);
    const token = signToken(id, username);
    res.json({ token, user: { id, username, createdAt: user.createdAt } });
  } catch (e) {
    res.status(500).json({ error: '注册失败' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const userId = usernameIndex.get(username);
    if (!userId) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }
    const user = users.get(userId)!;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }
    const token = signToken(user.id, user.username);
    res.json({ token, user: { id: user.id, username: user.username, createdAt: user.createdAt } });
  } catch (e) {
    res.status(500).json({ error: '登录失败' });
  }
});

app.get('/api/recipes', (_req: Request, res: Response) => {
  const list = Array.from(recipes.values())
    .filter(r => r.isPublic)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

app.get('/api/recipes/mine', authMiddleware, (req: AuthRequest, res: Response) => {
  const list = Array.from(recipes.values())
    .filter(r => r.ownerId === req.userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

app.get('/api/recipes/:id', (req: Request, res: Response) => {
  const r = recipes.get(req.params.id);
  if (!r) {
    res.status(404).json({ error: '配方不存在' });
    return;
  }
  res.json(r);
});

interface CreateRecipeBody {
  name: string;
  isPublic?: boolean;
  elements: RecipeElements;
  conditions: RecipeConditions;
  color: string;
  particleDensity: number;
}

app.post('/api/recipes', authMiddleware, (req: AuthRequest, res: Response) => {
  const body = req.body as CreateRecipeBody;
  if (!body.name || !body.elements || !body.conditions) {
    res.status(400).json({ error: '参数不完整' });
    return;
  }
  const id = genId();
  const recipe: Recipe = {
    id,
    ownerId: req.userId!,
    ownerName: req.username!,
    name: body.name,
    createdAt: Date.now(),
    isPublic: body.isPublic !== false,
    elements: body.elements,
    conditions: body.conditions,
    color: body.color || '#8888ff',
    particleDensity: body.particleDensity || 50,
    likes: []
  };
  recipes.set(id, recipe);
  res.status(201).json(recipe);
});

app.patch('/api/recipes/:id/like', authMiddleware, (req: AuthRequest, res: Response) => {
  const r = recipes.get(req.params.id);
  if (!r) {
    res.status(404).json({ error: '配方不存在' });
    return;
  }
  const idx = r.likes.indexOf(req.userId!);
  if (idx >= 0) {
    r.likes.splice(idx, 1);
  } else {
    r.likes.push(req.userId!);
  }
  res.json({ likes: r.likes.length, liked: idx < 0 });
});

app.listen(PORT, () => {
  console.log(`[Stardust Alchemy] API server running on http://localhost:${PORT}`);
});
