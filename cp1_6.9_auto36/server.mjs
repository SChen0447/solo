import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = uuidv4() + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const exts = ['.mp3', '.wav'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (exts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 MP3 和 WAV 格式'));
    }
  }
});

app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }
  res.json({
    filename: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    size: req.file.size
  });
});

app.listen(PORT, () => {
  console.log(`音频标注后端服务器运行在 http://localhost:${PORT}`);
  console.log(`上传目录: ${UPLOAD_DIR}`);
});
