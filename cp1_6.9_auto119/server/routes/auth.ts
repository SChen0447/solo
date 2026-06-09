import { Router } from 'express';
import bcrypt from 'bcryptjs';
import * as userRepo from '../repositories/userRepository';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }
    if (username.length < 3 || password.length < 6) {
      res.status(400).json({ error: '用户名至少3位，密码至少6位' });
      return;
    }

    const existing = await userRepo.findUserByUsername(username);
    if (existing) {
      res.status(400).json({ error: '用户名已存在' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepo.createUser(username, passwordHash);
    const token = generateToken(user.id, user.username);

    res.json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: '用户名和密码不能为空' });
      return;
    }

    const user = await userRepo.findUserByUsername(username);
    if (!user) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const token = generateToken(user.id, user.username);
    const stats = await userRepo.getUserStats(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        coins: user.coins,
        remainingBoxes: user.remainingBoxes,
        materialCount: stats.materialCount,
        artworkCount: stats.artworkCount,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const user = await userRepo.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    const stats = await userRepo.getUserStats(userId);
    res.json({ ...user, ...stats });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

export default router;
