import { v4 as uuidv4 } from 'uuid';
import { runQuery, getAll, getOne } from '../db';
import type { Artwork } from '../../src/types';

interface DbArtwork {
  id: string;
  user_id: string;
  name: string;
  description: string;
  thumbnail_colors: string;
  listed: number;
  created_at: string;
}

function mapArtwork(row: DbArtwork, materialIds: string[] = []): Artwork {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    thumbnailColors: JSON.parse(row.thumbnail_colors),
    materials: materialIds,
    createdAt: row.created_at,
    listed: row.listed === 1,
  };
}

export async function createArtwork(
  userId: string,
  name: string,
  description: string,
  thumbnailColors: string[],
  materialIds: string[]
): Promise<Artwork> {
  const id = uuidv4();
  await runQuery(
    'INSERT INTO artworks (id, user_id, name, description, thumbnail_colors, listed) VALUES (?, ?, ?, ?, ?, 0)',
    [id, userId, name, description, JSON.stringify(thumbnailColors)]
  );
  for (const materialId of materialIds) {
    await runQuery(
      'INSERT INTO artwork_materials (artwork_id, material_id) VALUES (?, ?)',
      [id, materialId]
    );
  }
  const row = await getOne<DbArtwork>('SELECT * FROM artworks WHERE id = ?', [id]);
  return mapArtwork(row!, materialIds);
}

export async function getUserArtworks(userId: string): Promise<Artwork[]> {
  const rows = await getAll<DbArtwork>(
    'SELECT * FROM artworks WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  const result: Artwork[] = [];
  for (const row of rows) {
    const materialRows = await getAll<{ material_id: string }>(
      'SELECT material_id FROM artwork_materials WHERE artwork_id = ?',
      [row.id]
    );
    const materialIds = materialRows.map(r => r.material_id);
    result.push(mapArtwork(row, materialIds));
  }
  return result;
}

export async function getArtworkById(id: string): Promise<Artwork | null> {
  const row = await getOne<DbArtwork>('SELECT * FROM artworks WHERE id = ?', [id]);
  if (!row) return null;
  const materialRows = await getAll<{ material_id: string }>(
    'SELECT material_id FROM artwork_materials WHERE artwork_id = ?',
    [id]
  );
  const materialIds = materialRows.map(r => r.material_id);
  return mapArtwork(row, materialIds);
}

export async function updateArtworkOwner(artworkId: string, newOwnerId: string): Promise<void> {
  await runQuery('UPDATE artworks SET user_id = ?, listed = 0 WHERE id = ?', [newOwnerId, artworkId]);
}

export async function setArtworkListed(artworkId: string, listed: boolean): Promise<void> {
  await runQuery('UPDATE artworks SET listed = ? WHERE id = ?', [listed ? 1 : 0, artworkId]);
}
