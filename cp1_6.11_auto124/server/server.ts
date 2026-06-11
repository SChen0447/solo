import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BOTTLES_FILE = path.join(DATA_DIR, 'bottles.json');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use((_req: Request, res: Response, next: () => void) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'audio/mpeg',
      'audio/wav',
      'video/mp4',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

interface BottleData {
  id: string;
  title: string;
  content: string;
  fontFamily: 'default' | 'handwriting';
  media: Array<{
    id: string;
    type: 'image' | 'audio' | 'video';
    url: string;
    name: string;
    size: number;
  }>;
  openAt: number;
  createdAt: number;
  creatorId: string;
  color: 'pink' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
  blessings: Array<{
    id: string;
    content: string;
    createdAt: number;
    template: 'letter' | 'leaf' | 'feather' | 'origami';
  }>;
  position: {
    x: number;
    y: number;
    speed: number;
    direction: number;
    size: number;
  };
}

const readBottles = (): BottleData[] => {
  try {
    if (fs.existsSync(BOTTLES_FILE)) {
      const data = fs.readFileSync(BOTTLES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // ignore
  }
  return [];
};

const writeBottles = (bottles: BottleData[]) => {
  try {
    fs.writeFileSync(BOTTLES_FILE, JSON.stringify(bottles, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing bottles:', err);
  }
};

app.post('/api/upload', upload.array('files', 10), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const uploadedFiles = files.map((file) => {
      let type: 'image' | 'audio' | 'video' = 'image';
      if (file.mimetype.startsWith('image')) type = 'image';
      else if (file.mimetype.startsWith('audio')) type = 'audio';
      else if (file.mimetype.startsWith('video')) type = 'video';

      return {
        id: uuidv4(),
        type,
        url: `/uploads/${file.filename}`,
        name: file.originalname,
        size: file.size,
      };
    });

    res.json({ success: true, files: uploadedFiles });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/bottles', (req: Request, res: Response) => {
  try {
    const bottle = req.body as BottleData;
    if (!bottle.id) {
      bottle.id = `bottle-${Date.now()}-${uuidv4().slice(0, 8)}`;
    }
    if (!bottle.createdAt) {
      bottle.createdAt = Date.now();
    }
    if (!bottle.blessings) {
      bottle.blessings = [];
    }
    if (!bottle.position) {
      bottle.position = {
        x: 5 + Math.random() * 90,
        y: 5 + Math.random() * 80,
        speed: 0.3 + Math.random() * 0.5,
        direction: Math.random() > 0.5 ? 1 : -1,
        size: 50 + Math.random() * 30,
      };
    }

    const bottles = readBottles();
    bottles.unshift(bottle);
    writeBottles(bottles);

    res.json({ success: true, bottle });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/bottles', (_req: Request, res: Response) => {
  try {
    const bottles = readBottles();
    res.json({ success: true, bottles });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/bottles/:id', (req: Request, res: Response) => {
  try {
    const bottles = readBottles();
    const bottle = bottles.find((b) => b.id === req.params.id);
    if (!bottle) {
      res.status(404).json({ success: false, error: 'Bottle not found' });
      return;
    }
    res.json({ success: true, bottle });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/bottles/:id/blessings', (req: Request, res: Response) => {
  try {
    const { content, template } = req.body;
    if (!content || !template) {
      res.status(400).json({ success: false, error: 'Content and template are required' });
      return;
    }

    const bottles = readBottles();
    const bottleIndex = bottles.findIndex((b) => b.id === req.params.id);
    if (bottleIndex === -1) {
      res.status(404).json({ success: false, error: 'Bottle not found' });
      return;
    }

    const blessing = {
      id: uuidv4(),
      content,
      template,
      createdAt: Date.now(),
    };

    bottles[bottleIndex].blessings.push(blessing);
    writeBottles(bottles);

    res.json({ success: true, blessing });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🚀 Time Capsule Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${UPLOAD_DIR}`);
  console.log(`📁 Data directory: ${DATA_DIR}`);
});

export default app;
