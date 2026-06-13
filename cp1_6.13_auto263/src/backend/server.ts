import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Painting } from '../frontend/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const paintings: Painting[] = [
  {
    id: uuidv4(),
    title: '晨雾中的山谷',
    description: '清晨的薄雾笼罩着连绵的山峦，阳光透过云层洒下金色的光芒，远山如黛，近水含烟，宛如一幅流动的水墨画卷。水彩的晕染效果恰到好处地表现了雾气的朦胧感。',
    createdAt: '2024-03-15',
    imageUrl: 'https://picsum.photos/seed/art1/800/1000',
    thumbnailUrl: 'https://picsum.photos/seed/art1/400/500',
    category: 'landscape',
    width: 800,
    height: 1000,
  },
  {
    id: uuidv4(),
    title: '湖畔余晖',
    description: '夕阳西下，湖面上倒映着满天红霞。远处的芦苇在微风中轻轻摇曳，水鸟掠过水面激起层层涟漪。暖色调的橙红与冷色调的蓝紫在画面上交织成梦幻般的和谐。',
    createdAt: '2024-02-28',
    imageUrl: 'https://picsum.photos/seed/art2/1000/700',
    thumbnailUrl: 'https://picsum.photos/seed/art2/500/350',
    category: 'landscape',
    width: 1000,
    height: 700,
  },
  {
    id: uuidv4(),
    title: '山涧清溪',
    description: '清澈的溪水从山间蜿蜒流出，穿越青苔覆盖的岩石，发出悦耳的声响。岸边野花盛开，蝴蝶翩跹。画面以绿色为主调，用水彩的透明质感表现溪水的清澈见底。',
    createdAt: '2024-01-20',
    imageUrl: 'https://picsum.photos/seed/art3/900/900',
    thumbnailUrl: 'https://picsum.photos/seed/art3/450/450',
    category: 'landscape',
    width: 900,
    height: 900,
  },
  {
    id: uuidv4(),
    title: '春日牡丹',
    description: '国色天香的牡丹花在春日暖阳中绽放，层层叠叠的花瓣如同华丽的裙摆。深红、粉红、白色的花朵在翠绿的叶片衬托下更显雍容华贵，展现出东方美学的典雅韵味。',
    createdAt: '2024-04-10',
    imageUrl: 'https://picsum.photos/seed/art4/700/900',
    thumbnailUrl: 'https://picsum.photos/seed/art4/350/450',
    category: 'floral',
    width: 700,
    height: 900,
  },
  {
    id: uuidv4(),
    title: '薰衣草田园',
    description: '一望无际的紫色薰衣草在普罗旺斯的阳光下绽放，空气中弥漫着淡淡的芬芳。蜜蜂在花丛间忙碌，远处的风车缓缓转动。紫色的渐变层次展现了水彩独有的渲染魅力。',
    createdAt: '2024-03-28',
    imageUrl: 'https://picsum.photos/seed/art5/1000/700',
    thumbnailUrl: 'https://picsum.photos/seed/art5/500/350',
    category: 'floral',
    width: 1000,
    height: 700,
  },
  {
    id: uuidv4(),
    title: '瓶中百合',
    description: '素雅的白百合插在古朴的陶瓶中，花瓣上还带着晶莹的露珠。极简的构图却蕴含着无尽的禅意，水彩的留白让画面充满呼吸感，展现了东方插花艺术的精髓。',
    createdAt: '2024-02-14',
    imageUrl: 'https://picsum.photos/seed/art6/600/800',
    thumbnailUrl: 'https://picsum.photos/seed/art6/300/400',
    category: 'floral',
    width: 600,
    height: 800,
  },
  {
    id: uuidv4(),
    title: '梦境旋律',
    description: '流动的色彩在画布上自由舞动，蓝、紫、金三种主色调交织成梦幻般的视觉交响曲。抽象的形态如同音乐的可视化，每一个观者都能从中读出属于自己的故事。',
    createdAt: '2024-04-05',
    imageUrl: 'https://picsum.photos/seed/art7/900/900',
    thumbnailUrl: 'https://picsum.photos/seed/art7/450/450',
    category: 'abstract',
    width: 900,
    height: 900,
  },
  {
    id: uuidv4(),
    title: '色彩的诗',
    description: '以暖色调为主的抽象作品，橙红、金黄、赭石色在画面上碰撞交融。灵感来源于秋日的黄昏，水彩的湿画法让颜色自然晕染，形成了富有诗意的纹理与层次。',
    createdAt: '2024-01-30',
    imageUrl: 'https://picsum.photos/seed/art8/1000/800',
    thumbnailUrl: 'https://picsum.photos/seed/art8/500/400',
    category: 'abstract',
    width: 1000,
    height: 800,
  },
];

app.get('/api/paintings', (_req: Request, res: Response) => {
  res.json(paintings);
});

app.get('/api/paintings/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const painting = paintings.find((p) => p.id === id);
  if (!painting) {
    res.status(404).json({ error: '画作不存在' });
    return;
  }
  res.json(painting);
});

app.listen(PORT, () => {
  console.log(`纸间·光痕画廊 API 服务器已启动: http://localhost:${PORT}`);
  console.log(`可用接口:`);
  console.log(`  GET /api/paintings      - 获取所有画作列表`);
  console.log(`  GET /api/paintings/:id  - 获取单幅画作详情`);
});
