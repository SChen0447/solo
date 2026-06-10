import express from 'express';
import cors from 'cors';
import {
  Wish,
  addWish,
  illuminateWish,
  getWishesSortedByLatest,
  getWishesSortedByPopular,
  STAR_COLORS,
  COIN_TYPES,
} from './models.js';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get('/api/wishes/latest', (_req, res) => {
  const wishes = getWishesSortedByLatest();
  res.json(wishes);
});

app.get('/api/wishes/popular', (_req, res) => {
  const wishes = getWishesSortedByPopular();
  res.json(wishes);
});

app.get('/api/config', (_req, res) => {
  res.json({
    starColors: STAR_COLORS,
    coinTypes: COIN_TYPES,
  });
});

app.post('/api/wishes', (req, res) => {
  const { text, color, coinType } = req.body as Partial<Wish>;

  if (!text || !color || !coinType) {
    return res.status(400).json({ error: '缺少必填字段：text, color, coinType' });
  }

  if (text.length > 100) {
    return res.status(400).json({ error: '心愿文本不能超过100字' });
  }

  if (!STAR_COLORS.includes(color)) {
    return res.status(400).json({ error: '无效的星光颜色' });
  }

  if (!COIN_TYPES.includes(coinType as (typeof COIN_TYPES)[number])) {
    return res.status(400).json({ error: '无效的硬币类型' });
  }

  const wish = addWish({ text, color, coinType });
  res.status(201).json(wish);
});

app.post('/api/wishes/:id/illuminate', (req, res) => {
  const { id } = req.params;
  const wish = illuminateWish(id);

  if (!wish) {
    return res.status(404).json({ error: '心愿不存在' });
  }

  res.json(wish);
});

app.listen(PORT, () => {
  console.log(`✨ 星光许愿池后端服务已启动：http://localhost:${PORT}`);
});
