import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Formula, FormulaNode, FormulaListItem, Rating } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'perfumer.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS formulas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '匿名调香师',
    nodes_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    average_rating REAL NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    favorite_count INTEGER NOT NULL DEFAULT 0,
    is_public INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    formula_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
    comment TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (formula_id) REFERENCES formulas(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    formula_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (formula_id) REFERENCES formulas(id)
  );

  CREATE INDEX IF NOT EXISTS idx_formulas_rating ON formulas(average_rating DESC, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ratings_formula ON ratings(formula_id);
  CREATE INDEX IF NOT EXISTS idx_favorites_formula ON favorites(formula_id);
`);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

function roundOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

app.get('/api/fragrances', (req, res) => {
  const { PRESET_FRAGRANCES } = require('./types');
  res.json({ success: true, data: PRESET_FRAGRANCES });
});

app.get('/api/formulas', (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, author, created_at as createdAt,
           average_rating as averageRating, rating_count as ratingCount,
           favorite_count as favoriteCount
    FROM formulas
    WHERE is_public = 1
    ORDER BY averageRating DESC, createdAt DESC
  `).all() as FormulaListItem[];

  res.json({ success: true, data: rows });
});

app.post('/api/formulas', (req, res) => {
  const { name, author, nodes, isPublic = true } = req.body as {
    name: string;
    author?: string;
    nodes: FormulaNode[];
    isPublic?: boolean;
  };

  if (!name || !nodes || nodes.length === 0) {
    return res.status(400).json({ success: false, error: '配方名称和至少一个香基节点是必需的' });
  }

  const id = generateId();
  const createdAt = Date.now();
  const nodesJson = JSON.stringify(nodes);

  db.prepare(`
    INSERT INTO formulas (id, name, author, nodes_json, created_at, is_public)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, author || '匿名调香师', nodesJson, createdAt, isPublic ? 1 : 0);

  const formula: Formula = {
    id,
    name,
    author: author || '匿名调香师',
    nodes,
    createdAt,
    averageRating: 0,
    ratingCount: 0,
    favoriteCount: 0,
    isPublic,
  };

  res.json({ success: true, data: formula });
});

app.get('/api/formulas/:id', (req, res) => {
  const row: any = db.prepare(`
    SELECT id, name, author, nodes_json as nodesJson, created_at as createdAt,
           average_rating as averageRating, rating_count as ratingCount,
           favorite_count as favoriteCount, is_public as isPublic
    FROM formulas WHERE id = ?
  `).get(req.params.id);

  if (!row) {
    return res.status(404).json({ success: false, error: '配方不存在' });
  }

  const formula: Formula = {
    id: row.id,
    name: row.name,
    author: row.author,
    nodes: JSON.parse(row.nodesJson),
    createdAt: row.createdAt,
    averageRating: row.averageRating,
    ratingCount: row.ratingCount,
    favoriteCount: row.favoriteCount,
    isPublic: !!row.isPublic,
  };

  res.json({ success: true, data: formula });
});

app.post('/api/formulas/:id/rate', (req, res) => {
  const { score, comment = '' } = req.body as { score: number; comment?: string };

  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ success: false, error: '评分必须在1-5之间' });
  }

  const formulaId = req.params.id;
  const formula: any = db.prepare('SELECT * FROM formulas WHERE id = ?').get(formulaId);
  if (!formula) {
    return res.status(404).json({ success: false, error: '配方不存在' });
  }

  const ratingId = generateId();
  const createdAt = Date.now();
  const safeComment = comment.slice(0, 50);

  const insertRating = db.prepare(`
    INSERT INTO ratings (id, formula_id, score, comment, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertRating.run(ratingId, formulaId, score, safeComment, createdAt);

  const avgRow: any = db.prepare(`
    SELECT AVG(score) as avg, COUNT(*) as cnt FROM ratings WHERE formula_id = ?
  `).get(formulaId);

  const newAvg = roundOneDecimal(avgRow.avg || 0);
  const newCount = avgRow.cnt || 0;

  db.prepare(`
    UPDATE formulas SET average_rating = ?, rating_count = ? WHERE id = ?
  `).run(newAvg, newCount, formulaId);

  const rating: Rating = {
    id: ratingId,
    formulaId,
    score,
    comment: safeComment,
    createdAt,
  };

  res.json({ success: true, data: { rating, averageRating: newAvg, ratingCount: newCount } });
});

app.post('/api/formulas/:id/favorite', (req, res) => {
  const { sessionId = 'default' } = req.body as { sessionId?: string };
  const formulaId = req.params.id;

  const formula: any = db.prepare('SELECT * FROM formulas WHERE id = ?').get(formulaId);
  if (!formula) {
    return res.status(404).json({ success: false, error: '配方不存在' });
  }

  const existing: any = db.prepare(`
    SELECT * FROM favorites WHERE formula_id = ? AND session_id = ?
  `).get(formulaId, sessionId);

  let favorited: boolean;
  if (existing) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
    favorited = false;
  } else {
    const favId = generateId();
    db.prepare(`
      INSERT INTO favorites (id, formula_id, session_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(favId, formulaId, sessionId, Date.now());
    favorited = true;
  }

  const countRow: any = db.prepare(`
    SELECT COUNT(*) as cnt FROM favorites WHERE formula_id = ?
  `).get(formulaId);
  const newCount = countRow.cnt || 0;

  db.prepare('UPDATE formulas SET favorite_count = ? WHERE id = ?').run(newCount, formulaId);

  res.json({ success: true, data: { favorited, favoriteCount: newCount } });
});

app.get('/api/formulas/:id/ratings', (req, res) => {
  const rows = db.prepare(`
    SELECT id, formula_id as formulaId, score, comment, created_at as createdAt
    FROM ratings WHERE formula_id = ? ORDER BY createdAt DESC
  `).all(req.params.id) as Rating[];

  res.json({ success: true, data: rows });
});

app.listen(PORT, () => {
  console.log(`虚拟调香师实验室后端服务已启动: http://localhost:${PORT}`);
});
