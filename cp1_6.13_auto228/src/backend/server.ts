import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

type Theme = '星夜' | '暮光' | '极光' | '深海' | '晨曦' | '火山' | '迷雾' | '潮汐' | '梦境' | '沙漠';

interface Painting {
  id: string;
  title: string;
  artist: string;
  theme: Theme;
  description: string;
  petalCount: number;
}

const themePalettes: Record<Theme, string[]> = {
  '星夜': ['#0d47a1', '#1976d2', '#42a5f5', '#90caf9', '#311b92', '#4527a0', '#5e35b2'],
  '暮光': ['#ff6f00', '#ff8f00', '#ffa000', '#ffb300', '#bf360c', '#e64a19', '#f57c00'],
  '极光': ['#00e676', '#69f0ae', '#00e5ff', '#40c4ff', '#aa00ff', '#e040fb', '#18ffff'],
  '深海': ['#006064', '#00838f', '#0097a7', '#00acc1', '#1a237e', '#283593', '#3949ab'],
  '晨曦': ['#fff59d', '#ffee58', '#ffca28', '#ffa726', '#f06292', '#f48fb1', '#f8bbd0'],
  '火山': ['#b71c1c', '#c62828', '#d32f2f', '#e53935', '#ff5722', '#ff7043', '#ffab40'],
  '迷雾': ['#37474f', '#455a64', '#546e7a', '#607d8b', '#78909c', '#90a4ae', '#b0bec5'],
  '潮汐': ['#0277bd', '#0288d1', '#039be5', '#03a9f4', '#80deea', '#4dd0e1', '#26c6da'],
  '梦境': ['#7b1fa2', '#8e24aa', '#9c27b0', '#ab47bc', '#ce93d8', '#ba68c8', '#f3e5f5'],
  '沙漠': ['#ef6c00', '#f57c00', '#fb8c00', '#ffa726', '#ffcc80', '#ffe0b2', '#fff3e0'],
};

const initialPaintings: Omit<Painting, 'id'>[] = [
  { title: '星辰碎片', artist: '林墨', theme: '星夜', description: '散落的星光化作永恒的碎片，在黑暗中闪烁着古老的秘密。', petalCount: 42 },
  { title: '余晖之境', artist: '苏瑾', theme: '暮光', description: '夕阳沉入地平线，世界被染成一片温暖的金色梦境。', petalCount: 28 },
  { title: '极光之舞', artist: '陈枫', theme: '极光', description: '天际的彩带如精灵般翩翩起舞，编织着北极的童话。', petalCount: 65 },
  { title: '深渊低语', artist: '韩澈', theme: '深海', description: '在万米深海之下，传来远古生物的神秘呢喃。', petalCount: 19 },
  { title: '黎明序曲', artist: '柳烟', theme: '晨曦', description: '第一缕阳光穿透云层，奏响新一天的华美乐章。', petalCount: 53 },
  { title: '熔岩之心', artist: '石岩', theme: '火山', description: '大地的心脏在燃烧，喷涌出创世之初的炽热力量。', petalCount: 37 },
  { title: '迷雾归途', artist: '楚云', theme: '迷雾', description: '浓雾笼罩的古道上，谁在寻找回家的方向。', petalCount: 24 },
  { title: '潮汐之歌', artist: '蓝澜', theme: '潮汐', description: '月亮的呼吸化作海浪的节奏，一遍遍吟唱着亘古的歌谣。', petalCount: 58 },
  { title: '幻梦回廊', artist: '紫萱', theme: '梦境', description: '穿梭于现实与幻境之间，每一步都是新的奇遇。', petalCount: 71 },
  { title: '金沙印记', artist: '黄尘', theme: '沙漠', description: '风沙掩埋了千年的文明，却抹不去那些辉煌的印记。', petalCount: 33 },
];

let paintings: Painting[] = initialPaintings.map((p) => ({
  ...p,
  id: uuidv4(),
}));

app.get('/api/paintings', (_req, res) => {
  res.json({
    paintings,
    themePalettes,
  });
});

app.post('/api/paintings/:id/petal', (req, res) => {
  const { id } = req.params;
  const painting = paintings.find((p) => p.id === id);

  if (!painting) {
    res.status(404).json({ error: '画作未找到' });
    return;
  }

  painting.petalCount += 1;
  res.json({
    success: true,
    painting,
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`时痕·艺廊 后端服务已启动: http://localhost:${PORT}`);
});
