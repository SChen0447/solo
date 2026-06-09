import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { User, JWTPayload } from '../shared/types.js';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = 'reader-bookshelf-drift-secret-key-2024';
const AVATAR_COLORS = [
  '#e57373', '#f06292', '#ba68c8', '#9575cd',
  '#7986cb', '#64b5f6', '#4fc3f7', '#4dd0e1',
  '#4db6ac', '#81c784', '#aed581', '#ffb74d',
  '#ff8a65', '#a1887f', '#90a4ae'
];

export function generateAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: User): string {
  const payload: JWTPayload = { userId: user.id, nickname: user.nickname };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未授权' });
    return;
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: '令牌无效' });
    return;
  }
  req.user = payload;
  next();
}

export async function registerUser(nickname: string, password: string): Promise<User> {
  const existing = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
  if (existing) {
    throw new Error('昵称已存在');
  }
  const passwordHash = await hashPassword(password);
  const avatarColor = generateAvatarColor();
  const stmt = db.prepare(
    'INSERT INTO users (nickname, password_hash, avatar_color) VALUES (?, ?, ?)'
  );
  const result = stmt.run(nickname, passwordHash, avatarColor);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
}

export async function loginUser(nickname: string, password: string): Promise<{ user: User; token: string } | null> {
  const user = db.prepare('SELECT * FROM users WHERE nickname = ?').get(nickname) as User | undefined;
  if (!user) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  const token = generateToken(user);
  return { user, token };
}

export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT id, nickname, avatar_color, created_at FROM users WHERE id = ?').get(id) as User | undefined;
}
