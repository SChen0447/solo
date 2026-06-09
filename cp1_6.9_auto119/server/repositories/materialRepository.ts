import { v4 as uuidv4 } from 'uuid';
import { runQuery, getAll, getOne } from '../db';
import type { Material, Rarity } from '../../src/types';

interface DbMaterial {
  id: string;
  user_id: string;
  template_id: string;
  name: string;
  rarity: Rarity;
  icon: string;
  color: string;
  created_at: string;
}

function mapMaterial(row: DbMaterial): Material {
  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    name: row.name,
    rarity: row.rarity,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
  };
}

export async function createMaterial(
  userId: string,
  templateId: string,
  name: string,
  rarity: Rarity,
  icon: string,
  color: string
): Promise<Material> {
  const id = uuidv4();
  await runQuery(
    'INSERT INTO materials (id, user_id, template_id, name, rarity, icon, color) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userId, templateId, name, rarity, icon, color]
  );
  const row = await getOne<DbMaterial>('SELECT * FROM materials WHERE id = ?', [id]);
  return mapMaterial(row!);
}

export async function getUserMaterials(userId: string): Promise<Material[]> {
  const rows = await getAll<DbMaterial>(
    'SELECT * FROM materials WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(mapMaterial);
}

export async function getMaterialsByIds(ids: string[]): Promise<Material[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = await getAll<DbMaterial>(
    `SELECT * FROM materials WHERE id IN (${placeholders})`,
    ids
  );
  return rows.map(mapMaterial);
}

export async function deleteMaterialsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await runQuery(`DELETE FROM materials WHERE id IN (${placeholders})`, ids);
}
