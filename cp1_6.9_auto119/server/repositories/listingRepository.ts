import { v4 as uuidv4 } from 'uuid';
import { runQuery, getAll, getOne } from '../db';
import type { MarketListing } from '../../src/types';

interface DbListing {
  id: string;
  artwork_id: string;
  seller_id: string;
  seller_name: string;
  artwork_name: string;
  thumbnail_colors: string;
  price: number;
  created_at: string;
}

function mapListing(row: DbListing): MarketListing {
  return {
    id: row.id,
    artworkId: row.artwork_id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    artworkName: row.artwork_name,
    thumbnailColors: JSON.parse(row.thumbnail_colors),
    price: row.price,
    createdAt: row.created_at,
  };
}

export async function createListing(
  artworkId: string,
  sellerId: string,
  sellerName: string,
  artworkName: string,
  thumbnailColors: string[],
  price: number
): Promise<MarketListing> {
  const id = uuidv4();
  await runQuery(
    'INSERT INTO market_listings (id, artwork_id, seller_id, seller_name, artwork_name, thumbnail_colors, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, artworkId, sellerId, sellerName, artworkName, JSON.stringify(thumbnailColors), price]
  );
  const row = await getOne<DbListing>('SELECT * FROM market_listings WHERE id = ?', [id]);
  return mapListing(row!);
}

export async function getAllListings(): Promise<MarketListing[]> {
  const rows = await getAll<DbListing>(
    'SELECT * FROM market_listings ORDER BY created_at DESC'
  );
  return rows.map(mapListing);
}

export async function getListingById(id: string): Promise<MarketListing | null> {
  const row = await getOne<DbListing>('SELECT * FROM market_listings WHERE id = ?', [id]);
  if (!row) return null;
  return mapListing(row);
}

export async function deleteListing(id: string): Promise<void> {
  await runQuery('DELETE FROM market_listings WHERE id = ?', [id]);
}
