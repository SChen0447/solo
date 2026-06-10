import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface User {
  id: string;
  username: string;
  password: string;
  avatar: string;
  createdAt: string;
}

interface CapsuleReply {
  id: string;
  content: string;
  createdAt: string;
}

interface Capsule {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  mood: string;
  moodColor: string;
  content: string;
  photos: string[];
  openAt: string;
  createdAt: string;
  isOpened: boolean;
  openedAt: string | null;
  reply: CapsuleReply | null;
}

const app = express();
const PORT = 3001;

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('只支持 jpg/png 格式图片'));
  }
});

const users: Map<string, User> = new Map();
const usernameIndex: Map<string, string> = new Map();
const capsules: Map<string, Capsule> = new Map();

const avatarColors = ['#ffdd88', '#88ccff', '#ff88cc', '#88ffaa', '#cc88ff', '#ffaa88'];

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (usernameIndex.has(username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const id = uuidv4();
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
  const user: User = {
    id,
    username,
    password,
    avatar: avatarColor,
    createdAt: new Date().toISOString()
  };
  users.set(id, user);
  usernameIndex.set(username, id);
  res.json({ id: user.id, username: user.username, avatar: user.avatar, createdAt: user.createdAt });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const userId = usernameIndex.get(username);
  if (!userId) {
    return res.status(404).json({ error: '用户不存在' });
  }
  const user = users.get(userId)!;
  if (user.password !== password) {
    return res.status(401).json({ error: '密码错误' });
  }
  res.json({ id: user.id, username: user.username, avatar: user.avatar, createdAt: user.createdAt });
});

app.get('/api/users/search', (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const query = (q as string).toLowerCase();
  const results = Array.from(users.values())
    .filter(u => u.username.toLowerCase().includes(query))
    .slice(0, 10)
    .map(u => ({ id: u.id, username: u.username, avatar: u.avatar }));
  res.json(results);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ id: user.id, username: user.username, avatar: user.avatar, createdAt: user.createdAt });
});

app.get('/api/capsules', (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId 不能为空' });
  const userCapsules = Array.from(capsules.values()).filter(
    c => c.senderId === userId || c.recipientId === userId
  );
  res.json(userCapsules);
});

app.post('/api/capsules', (req: Request, res: Response) => {
  const {
    senderId, senderName, recipientName, mood, moodColor,
    content, photos, openAt
  } = req.body;

  if (!senderId || !recipientName || !mood || !content || !openAt) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const recipientUsernameLower = (recipientName as string).toLowerCase();
  let recipientId: string | null = null;
  for (const [uname, uid] of usernameIndex.entries()) {
    if (uname.toLowerCase() === recipientUsernameLower) {
      recipientId = uid;
      break;
    }
  }
  if (!recipientId) {
    return res.status(404).json({ error: '收件人不存在' });
  }

  const recipient = users.get(recipientId)!;
  const capsule: Capsule = {
    id: uuidv4(),
    senderId,
    senderName: senderName || users.get(senderId)?.username || '',
    recipientId,
    recipientName: recipient.username,
    mood,
    moodColor,
    content,
    photos: photos || [],
    openAt,
    createdAt: new Date().toISOString(),
    isOpened: false,
    openedAt: null,
    reply: null
  };
  capsules.set(capsule.id, capsule);
  res.json(capsule);
});

app.get('/api/capsules/:id', (req: Request, res: Response) => {
  const capsule = capsules.get(req.params.id);
  if (!capsule) return res.status(404).json({ error: '胶囊不存在' });
  res.json(capsule);
});

app.post('/api/capsules/:id/open', (req: Request, res: Response) => {
  const capsule = capsules.get(req.params.id);
  if (!capsule) return res.status(404).json({ error: '胶囊不存在' });

  const now = new Date();
  const openAt = new Date(capsule.openAt);
  if (now < openAt) {
    return res.status(403).json({ error: '还未到开启时间', openAt: capsule.openAt });
  }

  capsule.isOpened = true;
  capsule.openedAt = now.toISOString();
  capsules.set(capsule.id, capsule);
  res.json(capsule);
});

app.post('/api/capsules/:id/reply', (req: Request, res: Response) => {
  const capsule = capsules.get(req.params.id);
  if (!capsule) return res.status(404).json({ error: '胶囊不存在' });
  if (!capsule.isOpened) return res.status(403).json({ error: '请先开启胶囊' });

  const { content } = req.body;
  if (!content || content.length > 100) {
    return res.status(400).json({ error: '回复内容长度应在1-100字之间' });
  }

  capsule.reply = {
    id: uuidv4(),
    content,
    createdAt: new Date().toISOString()
  };
  capsules.set(capsule.id, capsule);
  res.json(capsule);
});

app.post('/api/upload', upload.array('photos', 3), (req: Request, res: Response) => {
  if (!req.files) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  const files = req.files as Express.Multer.File[];
  const urls = files.map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

app.listen(PORT, () => {
  console.log(`星尘胶囊后端服务已启动: http://localhost:${PORT}`);
});
