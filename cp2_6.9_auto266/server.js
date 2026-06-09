import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let records = [];

const seedData = () => {
  const today = new Date();
  const emotions = [
    { gradient: ['#FF6B6B', '#FFD93D'], label: '焦躁' },
    { gradient: ['#FF8C42', '#FFD166'], label: '焦虑' },
    { gradient: ['#F7DC6F', '#F9E79F'], label: '平静' },
    { gradient: ['#A8E6CF', '#88D8AB'], label: '愉悦' },
    { gradient: ['#74B9FF', '#0984E3'], label: '兴奋' },
    { gradient: ['#A29BFE', '#6C5CE7'], label: '感伤' },
  ];
  const diaries = [
    '今天阳光很好，心情也跟着明朗起来。',
    '工作有点忙，但效率不错。',
    '和朋友吃了顿火锅，很开心。',
    '读了一本好书，沉浸其中。',
    '有点累，但坚持下来了。',
    '看到了很美的晚霞。',
  ];
  const sampleImages = [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400',
    null,
  ];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    records.push({
      id: uuidv4(),
      date: date.toISOString().split('T')[0],
      gradientStart: emotion.gradient[0],
      gradientEnd: emotion.gradient[1],
      emotionLabel: emotion.label,
      diary: diaries[Math.floor(Math.random() * diaries.length)],
      image: sampleImages[Math.floor(Math.random() * sampleImages.length)],
      likes: Math.floor(Math.random() * 50),
      comments: [],
      createdAt: date.toISOString(),
    });
  }
};

seedData();

app.get('/api/records', (req, res) => {
  const { month } = req.query;
  let result = [...records];
  if (month) {
    result = result.filter((r) => r.date.startsWith(String(month)));
  }
  result.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(result);
});

app.post('/api/records', (req, res) => {
  const { date, gradientStart, gradientEnd, emotionLabel, diary, image } = req.body;
  const newRecord = {
    id: uuidv4(),
    date: date || new Date().toISOString().split('T')[0],
    gradientStart,
    gradientEnd,
    emotionLabel,
    diary: diary || '',
    image: image || null,
    likes: 0,
    comments: [],
    createdAt: new Date().toISOString(),
  };
  records.push(newRecord);
  records.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.status(201).json(newRecord);
});

app.delete('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  const deleted = records.splice(idx, 1)[0];
  res.json(deleted);
});

app.post('/api/records/:id/like', (req, res) => {
  const { id } = req.params;
  const record = records.find((r) => r.id === id);
  if (!record) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  record.likes += 1;
  res.json({ likes: record.likes });
});

app.listen(PORT, () => {
  console.log(`情绪光谱 API 服务器运行在 http://localhost:${PORT}`);
});
