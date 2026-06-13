import express, { Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../../dist')));

const db = new sqlite3.Database('./letters.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS letters (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    recipientEmail TEXT,
    unlockDate TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    coverIndex INTEGER DEFAULT 0,
    userId TEXT DEFAULT 'default'
  )`);

  const sampleLetters = [
    {
      id: uuidv4(),
      title: '致一年后的自己',
      content: '# 你好，未来的我\n\n希望你现在过得很好。\n\n记得要**保持微笑**，勇敢面对每一天。\n\n> 时光不负有心人\n\n## 一些期待\n- 希望你已经学会了吉他\n- 希望你去了想去的地方旅行\n- 希望你身边的人都健康快乐\n\n加油！',
      recipientEmail: '',
      unlockDate: new Date(Date.now() + 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      coverIndex: 0
    },
    {
      id: uuidv4(),
      title: '给未来的小纸条',
      content: '## 嘿！\n\n这是一封一分钟后就能打开的信，测试一下效果～\n\n*祝你今天有个好心情！*',
      recipientEmail: '',
      unlockDate: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      coverIndex: 2
    },
    {
      id: uuidv4(),
      title: '给明天的你',
      content: '# 早安！\n\n如果这封信能被看到，说明"时光信箱"成功了！🎉\n\n记得喝杯水，保持健康。',
      recipientEmail: '',
      unlockDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      coverIndex: 4
    }
  ];

  sampleLetters.forEach((letter) => {
    db.run(
      `INSERT OR IGNORE INTO letters (id, title, content, recipientEmail, unlockDate, createdAt, status, coverIndex, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [letter.id, letter.title, letter.content, letter.recipientEmail, letter.unlockDate, letter.createdAt, letter.status, letter.coverIndex, 'default']
    );
  });
});

app.get('/api/letters', (req: Request, res: Response) => {
  const now = new Date().toISOString();
  db.all(`SELECT * FROM letters ORDER BY unlockDate ASC`, (err, rows: any[]) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const updatedRows = rows.map(row => ({
      ...row,
      status: new Date(row.unlockDate) <= new Date(now) ? 'unlocked' : 'pending'
    }));
    res.json(updatedRows);
  });
});

app.get('/api/letters/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.get(`SELECT * FROM letters WHERE id = ?`, [id], (err, row: any) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: '信件不存在' });
    }
    const status = new Date(row.unlockDate) <= new Date() ? 'unlocked' : 'pending';
    res.json({ ...row, status });
  });
});

app.post('/api/letters', (req: Request, res: Response) => {
  const { title, content, recipientEmail, unlockDate } = req.body;
  if (!title || !content || !unlockDate) {
    return res.status(400).json({ error: '标题、内容和解锁日期必填' });
  }
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const coverIndex = Math.floor(Math.random() * 6);
  db.run(
    `INSERT INTO letters (id, title, content, recipientEmail, unlockDate, createdAt, status, coverIndex, userId) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 'default')`,
    [id, title, content, recipientEmail || '', unlockDate, createdAt, coverIndex],
    function (this: any, err: any) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id, title, content, recipientEmail, unlockDate, createdAt, status: 'pending', coverIndex });
    }
  );
});

app.delete('/api/letters/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.run(`DELETE FROM letters WHERE id = ?`, [id], function (this: any, err: any) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '信件不存在' });
    }
    res.json({ message: '删除成功' });
  });
});

app.listen(PORT, () => {
  console.log(`时光信箱服务器运行在 http://localhost:${PORT}`);
});
