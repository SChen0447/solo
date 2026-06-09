import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { readJSONFile, writeJSONFile, UsersData } from '../utils/jsonStore';
import { generateId, generateAvatar, isValidEmail, sanitizeString } from '../utils/helpers';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth';
import { User, PublicUser } from '../../../shared/types';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password || !nickname) {
      res.status(400).json({ success: false, error: '请填写所有必填字段' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ success: false, error: '邮箱格式不正确' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: '密码长度至少6位' });
      return;
    }

    if (nickname.length < 2 || nickname.length > 20) {
      res.status(400).json({ success: false, error: '昵称长度应在2-20个字符之间' });
      return;
    }

    const data = readJSONFile<UsersData>('users.json', { users: [] });
    const cleanEmail = sanitizeString(email.toLowerCase());

    const existingUser = data.users.find((u: User) => u.email === cleanEmail);
    if (existingUser) {
      res.status(400).json({ success: false, error: '该邮箱已被注册' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const cleanNickname = sanitizeString(nickname);
    const avatar = generateAvatar(cleanNickname);

    const newUser: User = {
      id: generateId(),
      email: cleanEmail,
      passwordHash,
      nickname: cleanNickname,
      avatar,
      createdAt: new Date().toISOString()
    };

    data.users.push(newUser);
    writeJSONFile('users.json', data);

    const token = generateToken(newUser.id);
    const publicUser: PublicUser = {
      id: newUser.id,
      nickname: newUser.nickname,
      avatar: newUser.avatar
    };

    res.json({ success: true, data: { token, user: publicUser } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: '请填写邮箱和密码' });
      return;
    }

    const data = readJSONFile<UsersData>('users.json', { users: [] });
    const cleanEmail = sanitizeString(email.toLowerCase());

    const user = data.users.find((u: User) => u.email === cleanEmail);
    if (!user) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: '邮箱或密码错误' });
      return;
    }

    const token = generateToken(user.id);
    const publicUser: PublicUser = {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar
    };

    res.json({ success: true, data: { token, user: publicUser } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const data = readJSONFile<UsersData>('users.json', { users: [] });

    const user = data.users.find((u: User) => u.id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    const publicUser: PublicUser = {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar
    };

    res.json({ success: true, data: publicUser });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

export default router;
