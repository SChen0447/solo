import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }
  res.json({
    id: path.basename(req.file.filename, path.extname(req.file.filename)),
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    size: req.file.size
  });
});

app.get('/api/audio/:id', (req, res) => {
  const { id } = req.params;
  const files = fs.readdirSync(uploadsDir);
  const matched = files.find(f => f.startsWith(id));
  if (matched) {
    res.sendFile(path.join(uploadsDir, matched));
  } else {
    res.status(404).json({ error: 'Audio not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Dialect Spectrogram server running on port ${PORT}`);
});
