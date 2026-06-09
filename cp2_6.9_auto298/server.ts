import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Bottle {
  id: string;
  content: string;
  origin: string;
  tags: string[];
  userTags?: string[];
  timestamp: number;
  picked: boolean;
}

const PRESET_TAGS = [
  '海盐', '檀木', '青梅', '雨林', '焦糖', '硝烟', '薄荷', '玫瑰',
  '雪松', '茉莉', '咖啡', '海盐', '柠檬', '麝香', '琥珀', '薰衣草',
  '雨水', '海水', '香草', '竹子'
];

const SAMPLE_BOTTLES: Bottle[] = [
  {
    id: 'bottle-001',
    content: '那年夏天在里斯本的海边，夕阳把整片海染成了金红色。我坐在礁石上，闻到了咸咸的海风和远处传来的吉他声。那是我二十岁的夏天，一切都还充满可能。',
    origin: '葡萄牙 · 里斯本',
    tags: ['海盐', '焦糖'],
    timestamp: Date.now() - 86400000 * 3,
    picked: false
  },
  {
    id: 'bottle-002',
    content: '京都的清晨，雨后的竹林里弥漫着湿润的木头和苔藓的气息。僧人在扫地，沙沙的声音让人心安。那一刻我突然明白，有些宁静只能在远方才能找到。',
    origin: '日本 · 京都',
    tags: ['竹子', '雨水'],
    timestamp: Date.now() - 86400000 * 7,
    picked: false
  },
  {
    id: 'bottle-003',
    content: '外婆家的老房子，每到端午就会煮青梅酒。酸中带甜的香气，是我整个童年的味道。现在外婆不在了，但每年这个味道，我还在。',
    origin: '中国 · 江南',
    tags: ['青梅', '香草'],
    timestamp: Date.now() - 86400000 * 12,
    picked: false
  },
  {
    id: 'bottle-004',
    content: '第一次站在硝烟弥漫的训练场，紧张到呼吸困难。但那股火药味混着汗水味，后来成了我最熟悉的安全感。',
    origin: '美国 · 纽约',
    tags: ['硝烟', '檀木'],
    timestamp: Date.now() - 86400000 * 20,
    picked: false
  },
  {
    id: 'bottle-005',
    content: '摩洛哥的沙漠之夜，星空低得仿佛伸手可及。营火噼啪作响，空气中飘着薄荷茶和远处驼队的铃声。',
    origin: '摩洛哥 · 撒哈拉',
    tags: ['薄荷', '琥珀'],
    timestamp: Date.now() - 86400000 * 30,
    picked: false
  },
  {
    id: 'bottle-006',
    content: '巴黎街角那家开了一百年的咖啡馆，推开木门的第一口espresso的焦香混着邻桌女士身上的玫瑰香水味，让这个雨天变得温柔。',
    origin: '法国 · 巴黎',
    tags: ['咖啡', '玫瑰'],
    timestamp: Date.now() - 86400000 * 45,
    picked: false
  },
  {
    id: 'bottle-007',
    content: '冰岛的极光下，温泉的硫磺味混着雪的清冷。那一刻觉得自己渺小得像尘埃，却又拥有了整个宇宙。',
    origin: '冰岛 · 雷克雅未克',
    tags: ['海水', '雪松'],
    timestamp: Date.now() - 86400000 * 60,
    picked: false
  },
  {
    id: 'bottle-008',
    content: '外婆晒的薰衣草香囊，打开抽屉时总会想起她坐在院子里摘花的样子。阳光正好，风也温柔。',
    origin: '法国 · 普罗旺斯',
    tags: ['薰衣草', '香草'],
    timestamp: Date.now() - 86400000 * 90,
    picked: false
  }
];

let bottles: Bottle[] = [...SAMPLE_BOTTLES];

app.get('/api/tags', (_req: Request, res: Response) => {
  res.json({ tags: PRESET_TAGS });
});

app.get('/api/bottles/random', (_req: Request, res: Response) => {
  const available = bottles.filter(b => !b.picked);
  if (available.length === 0) {
    bottles = SAMPLE_BOTTLES.map(b => ({ ...b, picked: false, userTags: undefined }));
  }
  const randomIndex = Math.floor(Math.random() * bottles.length);
  const bottle = bottles[randomIndex];
  bottle.picked = true;
  res.json(bottle);
});

app.get('/api/bottles/:id/status', (req: Request, res: Response) => {
  const bottle = bottles.find(b => b.id === req.params.id);
  if (!bottle) {
    res.status(404).json({ error: 'Bottle not found' });
    return;
  }
  res.json({ picked: bottle.picked });
});

app.post('/api/bottles/:id/tags', (req: Request, res: Response) => {
  const bottle = bottles.find(b => b.id === req.params.id);
  if (!bottle) {
    res.status(404).json({ error: 'Bottle not found' });
    return;
  }
  const tags: string[] = req.body.tags || [];
  bottle.userTags = tags.slice(0, 3);
  res.json({ success: true, bottle });
});

app.listen(PORT, () => {
  console.log(`Scent Drift Bottle server running on http://localhost:${PORT}`);
});
