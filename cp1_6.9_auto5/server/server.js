const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPEG 和 PNG 格式'));
    }
  }
});

let recipes = [];
let logs = [];

function generateThumbnail(filePath, filename) {
  const ext = path.extname(filename);
  const thumbName = `thumb_${path.basename(filename, ext)}${ext}`;
  const thumbPath = path.join(uploadsDir, thumbName);
  
  fs.copyFileSync(filePath, thumbPath);
  return `/uploads/${thumbName}`;
}

app.get('/api/recipes', (req, res) => {
  res.json(recipes);
});

app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipes.find(r => r.id === req.params.id);
  if (!recipe) {
    return res.status(404).json({ error: '配方不存在' });
  }
  res.json(recipe);
});

app.post('/api/recipes', (req, res) => {
  const { name, temperature, time, ingredients, steps, difficulty, coverImage } = req.body;
  const newRecipe = {
    id: uuidv4(),
    name,
    temperature,
    time,
    ingredients: ingredients || [],
    steps: steps || [],
    difficulty: difficulty || '中等',
    coverImage: coverImage || null,
    createdAt: new Date().toISOString()
  };
  recipes.push(newRecipe);
  res.status(201).json(newRecipe);
});

app.put('/api/recipes/:id', (req, res) => {
  const index = recipes.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '配方不存在' });
  }
  recipes[index] = { ...recipes[index], ...req.body };
  res.json(recipes[index]);
});

app.delete('/api/recipes/:id', (req, res) => {
  const index = recipes.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '配方不存在' });
  }
  recipes.splice(index, 1);
  logs = logs.filter(l => l.recipeId !== req.params.id);
  res.json({ success: true });
});

app.get('/api/recipes/:id/logs', (req, res) => {
  const recipeLogs = logs
    .filter(l => l.recipeId === req.params.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(recipeLogs);
});

app.post('/api/recipes/:id/logs', (req, res) => {
  const { date, result, note, photoUrl, photoThumb } = req.body;
  const newLog = {
    id: uuidv4(),
    recipeId: req.params.id,
    date: date || new Date().toISOString(),
    result: result || '一般',
    note: note || '',
    photoUrl: photoUrl || null,
    photoThumb: photoThumb || null,
    createdAt: new Date().toISOString()
  };
  logs.push(newLog);
  res.status(201).json(newLog);
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  const filePath = req.file.path;
  const thumbUrl = generateThumbnail(filePath, req.file.filename);
  res.json({
    originalUrl: `/uploads/${req.file.filename}`,
    thumbnailUrl: thumbUrl
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小不能超过 2MB' });
    }
  }
  res.status(500).json({ error: err.message || '服务器错误' });
});

app.listen(PORT, () => {
  console.log(`烘焙日志服务器运行在 http://localhost:${PORT}`);
});
