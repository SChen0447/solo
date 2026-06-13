import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 5000;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

interface Photo {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  lat: number;
  lng: number;
  date: string;
  diary: string;
  tags: string[];
  createdAt: number;
}

let photos: Photo[] = [];

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持JPEG、PNG、GIF、WebP格式的图片'));
    }
  }
});

app.post('/api/photos', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的照片' });
    }

    const { lat, lng, date, diary, tags } = req.body;

    if (!lat || !lng) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '请在地图上标记位置' });
    }

    if (!date) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '请选择日期' });
    }

    if (diary && diary.length > 200) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: '日记内容不能超过200字' });
    }

    let parsedTags: string[] = [];
    try {
      parsedTags = tags ? JSON.parse(tags) : [];
    } catch {
      parsedTags = [];
    }

    const photo: Photo = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      date,
      diary: diary || '',
      tags: parsedTags,
      createdAt: Date.now()
    };

    photos.push(photo);
    res.status(201).json(photo);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '照片大小不能超过5MB' });
    }
    res.status(500).json({ error: error instanceof Error ? error.message : '上传失败' });
  }
});

app.get('/api/photos', (_req, res) => {
  const sortedPhotos = [...photos].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  res.json(sortedPhotos);
});

app.get('/api/photos/search', (req, res) => {
  const { query, dateStart, dateEnd } = req.query;

  let filtered = [...photos];

  if (query && typeof query === 'string') {
    const keyword = query.toLowerCase();
    filtered = filtered.filter(photo => 
      photo.tags.some(tag => tag.toLowerCase().includes(keyword))
    );
  }

  if (dateStart && typeof dateStart === 'string') {
    const start = new Date(dateStart).getTime();
    filtered = filtered.filter(photo => 
      new Date(photo.date).getTime() >= start
    );
  }

  if (dateEnd && typeof dateEnd === 'string') {
    const end = new Date(dateEnd).getTime();
    filtered = filtered.filter(photo => 
      new Date(photo.date).getTime() <= end
    );
  }

  const sortedPhotos = filtered.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  res.json(sortedPhotos);
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
