import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const VALID_USERS: Record<string, { password: string; token: string }> = {
  admin: { password: 'password123', token: 'token-admin-12345' }
};

interface AuthRequest extends express.Request {
  username?: string;
}

const authMiddleware = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  const user = Object.entries(VALID_USERS).find(([_, v]) => v.token === token);
  if (!user) {
    return res.status(401).json({ error: '无效的token' });
  }
  req.username = user[0];
  next();
};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = VALID_USERS[username];
  if (user && user.password === password) {
    return res.json({ success: true, token: user.token, username });
  }
  return res.status(401).json({ success: false, error: '用户名或密码错误' });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (VALID_USERS[username]) {
    return res.status(400).json({ success: false, error: '用户名已存在' });
  }
  if (!username || !password) {
    return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
  }
  VALID_USERS[username] = {
    password,
    token: `token-${username}-${Date.now()}`
  };
  return res.json({ success: true, token: VALID_USERS[username].token, username });
});

app.post('/api/change-password', authMiddleware, (req: AuthRequest, res) => {
  const { oldPassword, newPassword } = req.body;
  const username = req.username!;
  const user = VALID_USERS[username];
  if (user.password !== oldPassword) {
    return res.status(400).json({ success: false, error: '原密码错误' });
  }
  user.password = newPassword;
  return res.json({ success: true });
});

app.get('/api/journal/dates', authMiddleware, (req: AuthRequest, res) => {
  const username = req.username!;
  const dates: string[] = [];
  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR);
    files.forEach(file => {
      const match = file.match(new RegExp(`^${username}_(\\d{8})\\.json$`));
      if (match) {
        dates.push(match[1]);
      }
    });
  }
  res.json({ dates });
});

app.get('/api/journal/:date', authMiddleware, (req: AuthRequest, res) => {
  const username = req.username!;
  const date = req.params.date;
  const filePath = path.join(DATA_DIR, `${username}_${date}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return res.json(JSON.parse(content));
    } catch (e) {
      return res.status(500).json({ error: '读取文件失败' });
    }
  }
  return res.json({ strokes: [], stickers: [] });
});

app.post('/api/journal/:date', authMiddleware, (req: AuthRequest, res) => {
  const username = req.username!;
  const date = req.params.date;
  const { strokes, stickers } = req.body;
  const filePath = path.join(DATA_DIR, `${username}_${date}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify({ date, strokes, stickers, updatedAt: new Date().toISOString() }, null, 2));
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: '保存失败' });
  }
});

app.get('/api/journal/export', authMiddleware, async (req: AuthRequest, res) => {
  const username = req.username!;
  const zip = new JSZip();
  const folder = zip.folder(`journals-${username}`);

  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR);
    const userFiles = files.filter(file => file.startsWith(`${username}_`));
    userFiles.forEach(file => {
      const filePath = path.join(DATA_DIR, file);
      const content = fs.readFileSync(filePath);
      folder?.file(file, content);
    });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="journals-${username}.zip"`);

  const stream = await zip.generateAsync({ type: 'nodebuffer', streamFiles: true, compression: 'DEFLATE' });
  res.send(stream);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
