import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const FLOWER_VARIETIES = [
  '光芒菊', '星云兰', '晨曦花', '月影草', '星辰梅',
  '彩虹薇', '银河桐', '艳阳葵', '微风竹', '晨曦莲'
];

let plants = [];

app.get('/api/plants', (_req, res) => {
  const sortedPlants = [...plants].sort((a, b) => b.careCount - a.careCount);
  res.json(sortedPlants);
});

app.post('/api/plants', (req, res) => {
  const { name, imageUrl } = req.body;

  if (!name || !imageUrl) {
    return res.status(400).json({ error: '植物名称和图片不能为空' });
  }

  if (name.length > 10) {
    return res.status(400).json({ error: '植物名称不能超过10个字' });
  }

  const newPlant = {
    id: uuidv4(),
    name: name.trim(),
    imageUrl,
    careCount: 0,
    variety: null,
    bloomCount: 0,
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
  };

  plants.push(newPlant);
  res.status(201).json(newPlant);
});

app.post('/api/plants/:id/care', (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  if (type !== 'water' && type !== 'fertilize') {
    return res.status(400).json({ error: '养护类型必须是 water 或 fertilize' });
  }

  const plantIndex = plants.findIndex((p) => p.id === id);
  if (plantIndex === -1) {
    return res.status(404).json({ error: '植物不存在' });
  }

  plants[plantIndex].careCount += 1;

  const shouldBloom = plants[plantIndex].careCount > 0 &&
    plants[plantIndex].careCount % 10 === 0;

  let bloomData = null;
  if (shouldBloom) {
    const randomVariety = FLOWER_VARIETIES[Math.floor(Math.random() * FLOWER_VARIETIES.length)];
    plants[plantIndex].variety = randomVariety;
    plants[plantIndex].bloomCount += 1;
    bloomData = {
      variety: randomVariety,
      bloomCount: plants[plantIndex].bloomCount
    };
  }

  res.json({
    plant: plants[plantIndex],
    bloomed: shouldBloom,
    bloomData
  });
});

app.get('/api/plants/:id/bloom', (req, res) => {
  const { id } = req.params;
  const plant = plants.find((p) => p.id === id);

  if (!plant) {
    return res.status(404).json({ error: '植物不存在' });
  }

  res.json({
    id: plant.id,
    careCount: plant.careCount,
    variety: plant.variety,
    bloomCount: plant.bloomCount,
    nextBloomAt: Math.ceil(plant.careCount / 10) * 10
  });
});

app.listen(PORT, () => {
  console.log(`云植乐园后端服务已启动: http://localhost:${PORT}`);
});
