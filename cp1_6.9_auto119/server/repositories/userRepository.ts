import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../db';
import type { User } from '../../src/types';

interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  coins: number;
  remaining_boxes: number;
  created_at: string;
}

export async function createUser(username: string, passwordHash: string): Promise<User> {
  const id = uuidv4();
  await runQuery(
    'INSERT INTO users (id, username, password_hash, coins, remaining_boxes) VALUES (?, ?, ?, 100, 3)',
    [id, username, passwordHash]
  );
  return { id, username, coins: 100, remainingBoxes: 3 };
}

export async function findUserByUsername(username: string): Promise<(User & { passwordHash: string }) | null> {
  const row = await getOne<DbUser>('SELECT * FROM users WHERE username = ?', [username]);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    coins: row.coins,
    remainingBoxes: row.remaining_boxes,
  };
}

export async function findUserById(id: string): Promise<User | null> {
  const row = await getOne<DbUser>('SELECT * FROM users WHERE id = ?', [id]);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    coins: row.coins,
    remainingBoxes: row.remaining_boxes,
  };
}

export async function updateUserCoins(userId: string, coins: number): Promise<void> {
  await runQuery('UPDATE users SET coins = ? WHERE id = ?', [coins, userId]);
}

export async function updateRemainingBoxes(userId: string, remainingBoxes: number): Promise<void> {
  await runQuery('UPDATE users SET remaining_boxes = ? WHERE id = ?', [remainingBoxes, userId]);
}

export async function getUserStats(userId: string): Promise<{ materialCount: number; artworkCount: number }> {
  const materialRow = await getOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM materials WHERE user_id = ?',
    [userId]
  );
  const artworkRow = await getOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM artworks WHERE user_id = ?',
    [userId]
  );
  return {
    materialCount: materialRow?.count || 0,
    artworkCount: artworkRow?.count || 0,
  };
}
