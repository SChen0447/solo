import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_FILE = path.join(__dirname, 'data.json');

const teaRecipes = [
  {
    id: 'thin',
    name: '薄茶',
    description: '低浓度，汤花稀疏但细腻，纹理如雪地',
    params: {
      bubbleCount: 60,
      minSize: 3,
      maxSize: 6,
      aggregation: 0.2,
      pattern: 'random',
      concentration: 'low'
    }
  },
  {
    id: 'thick',
    name: '浓茶',
    description: '高浓度，汤花厚密如奶油，纹理如山峦',
    params: {
      bubbleCount: 140,
      minSize: 5,
      maxSize: 10,
      aggregation: 0.55,
      pattern: 'concentric',
      concentration: 'high'
    }
  },
  {
    id: 'dou',
    name: '斗茶',
    description: '高浓度且快速击拂，汤花表面形成复杂花鸟图纹',
    params: {
      bubbleCount: 200,
      minSize: 4,
      maxSize: 12,
      aggregation: 0.8,
      pattern: 'spiral',
      concentration: 'extreme',
      hiddenPattern: true
    }
  }
];

const readData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('读取数据文件失败:', e);
  }
  return { records: [] };
};

const writeData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('写入数据文件失败:', e);
  }
};

app.get('/api/tearecipes', (req, res) => {
  res.json(teaRecipes);
});

app.get('/api/records', (req, res) => {
  const data = readData();
  res.json(data.records.slice(0, 5));
});

app.post('/api/saveRecord', (req, res) => {
  try {
    const { textureParams, score, inscription, thumbnail, scores } = req.body;
    const data = readData();
    const newRecord = {
      id: uuidv4(),
      date: new Date().toISOString(),
      textureParams,
      score,
      inscription,
      thumbnail,
      scores
    };
    data.records.unshift(newRecord);
    if (data.records.length > 5) {
      data.records = data.records.slice(0, 5);
    }
    writeData(data);
    res.json({ success: true, record: newRecord });
  } catch (error) {
    console.error('保存记录失败:', error);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

app.delete('/api/records/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    data.records = data.records.filter(r => r.id !== id);
    writeData(data);
    res.json({ success: true });
  } catch (error) {
    console.error('删除记录失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

app.listen(PORT, () => {
  console.log(`茶道服务器运行在 http://localhost:${PORT}`);
});
