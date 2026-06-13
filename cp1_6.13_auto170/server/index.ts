import express from 'express';
import cors from 'cors';

interface Orb {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  memory: string;
  createdAt: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const ORB_COLORS = [
  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3',
  '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0'
];

const DEFAULT_MEMORIES = [
  '那年夏天，风拂过麦田，带来了远方的歌谣。',
  '雨夜的咖啡店，玻璃窗上的水珠折射出温暖的灯光。',
  '第一次学会骑自行车时，摔倒又爬起的那个午后。',
  '奶奶厨房里飘出的饭菜香，是童年最熟悉的味道。',
  '海边的落日，把天空染成了橘子汽水的颜色。',
  '深夜图书馆里，书页翻动的声音与心跳同频。',
  '雪地里留下的第一串脚印，延伸向未知的远方。',
  '毕业典礼上，大家笑着笑着就哭了的那个瞬间。',
  '旧抽屉里翻出的明信片，字迹已有些模糊。',
  '火车窗外掠过的风景，像极了那些年错过的梦。',
  '樱花飘落的速度，是每秒五厘米。',
  '清晨第一缕阳光穿过窗帘，落在枕边的温柔。',
  '巷口卖糖葫芦的吆喝声，唤醒了沉睡的童年。',
  '信纸上写下又划掉的名字，藏着年少的心事。',
  '冬日里握过的那双温暖的手，至今仍有余温。',
  '阳台上养的那盆多肉，在不知不觉中长大了许多。',
  '街角偶遇的流浪猫，在脚边蹭了蹭就消失在夜色中。',
  '电台里随机播放的那首歌，是好久不见的老朋友。',
  '攒了很久的零花钱买下的第一本书，扉页还留着稚嫩的签名。',
  '母亲织的围巾，针脚有些歪扭，却格外温暖。',
  '放学路上追过的那只蝴蝶，最后飞进了夕阳里。',
  '抽屉里的弹珠，闪烁着被遗忘的星光。',
  '第一次登台演出，聚光灯下紧张得手心冒汗。',
  '和好友躺在草地上看星星，聊到天亮的那些夜晚。',
  '老家院子里的老槐树，每年春天都会开满白色的小花。'
];

function generateInitialOrbs(): Orb[] {
  const orbs: Orb[] = [];
  const count = 20 + Math.floor(Math.random() * 11);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 40 + Math.random() * 140;
    orbs.push({
      id: `orb-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
      x: Math.cos(angle) * radius,
      y: 10 + Math.random() * 60,
      z: Math.sin(angle) * radius,
      color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)],
      memory: DEFAULT_MEMORIES[i % DEFAULT_MEMORIES.length],
      createdAt: Date.now() - Math.floor(Math.random() * 10000000)
    });
  }
  return orbs;
}

let orbs: Orb[] = generateInitialOrbs();

app.get('/api/orbs', (_req, res) => {
  res.json(orbs);
});

app.post('/api/orbs', (req, res) => {
  const { x, y, z, memory } = req.body;
  const newOrb: Orb = {
    id: `orb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    x: typeof x === 'number' ? x : (Math.random() - 0.5) * 300,
    y: typeof y === 'number' ? y : 10 + Math.random() * 60,
    z: typeof z === 'number' ? z : (Math.random() - 0.5) * 300,
    color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)],
    memory: (memory && memory.trim()) || '这里曾有一段回忆',
    createdAt: Date.now()
  };
  orbs.push(newOrb);
  res.status(201).json(newOrb);
});

app.delete('/api/orbs/:id', (req, res) => {
  const id = req.params.id;
  const idx = orbs.findIndex(o => o.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Orb not found' });
    return;
  }
  const deleted = orbs.splice(idx, 1)[0];
  res.json(deleted);
});

app.listen(PORT, () => {
  console.log(`[浮光·漫记馆] 后端服务器运行在 http://localhost:${PORT}`);
});
