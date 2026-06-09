import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, '..', 'database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        coins INTEGER NOT NULL DEFAULT 100,
        remaining_boxes INTEGER NOT NULL DEFAULT 3,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        template_id TEXT NOT NULL,
        name TEXT NOT NULL,
        rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic')),
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_materials_user ON materials(user_id)');

    db.run(`
      CREATE TABLE IF NOT EXISTS artworks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        description TEXT,
        thumbnail_colors TEXT NOT NULL,
        listed BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_artworks_user ON artworks(user_id)');

    db.run(`
      CREATE TABLE IF NOT EXISTS artwork_materials (
        artwork_id TEXT NOT NULL REFERENCES artworks(id),
        material_id TEXT NOT NULL REFERENCES materials(id),
        PRIMARY KEY (artwork_id, material_id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS market_listings (
        id TEXT PRIMARY KEY,
        artwork_id TEXT NOT NULL UNIQUE REFERENCES artworks(id),
        seller_id TEXT NOT NULL REFERENCES users(id),
        seller_name TEXT NOT NULL,
        artwork_name TEXT NOT NULL,
        thumbnail_colors TEXT NOT NULL,
        price INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_listings_seller ON market_listings(seller_id)');
  });
}

export function runQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function getOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve((row as T) || null);
    });
  });
}

export function getAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export default db;
