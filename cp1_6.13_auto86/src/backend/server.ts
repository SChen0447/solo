import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

type PetalColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple';
type Rarity = 'common' | 'rare' | 'legendary';
type TaskType = 'checkin' | 'mood' | 'drawing';

interface Petal {
  color: PetalColor;
  taskType: TaskType;
  unlockedAt: number;
}

interface TaskProgress {
  type: TaskType;
  progress: number;
  completedToday: boolean;
  records: { time: number; detail?: string }[];
}

interface FlowerCard {
  id: string;
  name: string;
  rarity: Rarity;
  flowerType: string;
  imageData: string;
  createdAt: number;
}

interface ExchangeRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  offeredCardId: string;
  requestedCardId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

interface User {
  id: string;
  name: string;
  petals: Petal[];
  tasks: TaskProgress[];
  cards: FlowerCard[];
  lastLoginDate: string;
}

const flowerNames: Record<Rarity, string[]> = {
  common: ['樱花', '雏菊', '向日葵', '郁金香', '薰衣草', '铃兰'],
  rare: ['玫瑰', '牡丹', '百合', '君子兰', '山茶花', '风信子'],
  legendary: ['莲', '曼陀罗', '昙花', '彼岸花', '雪割草', '月下美人']
};

const petalColors: PetalColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple'];
const colorHex: Record<PetalColor, string> = {
  red: '#FF4444',
  orange: '#FF8C00',
  yellow: '#FFD700',
  green: '#32CD32',
  blue: '#1E90FF',
  indigo: '#4B0082',
  purple: '#9370DB'
};

const taskPetalMap: Record<TaskType, PetalColor[]> = {
  checkin: ['red', 'orange'],
  mood: ['yellow', 'green', 'blue'],
  drawing: ['indigo', 'purple']
};

const mockDB: { users: Map<string, User>; exchanges: Map<string, ExchangeRequest> } = {
  users: new Map(),
  exchanges: new Map()
};

const getToday = () => new Date().toISOString().split('T')[0];

const createUser = (id: string, name: string): User => ({
  id,
  name,
  petals: [],
  tasks: [
    { type: 'checkin', progress: 0, completedToday: false, records: [] },
    { type: 'mood', progress: 0, completedToday: false, records: [] },
    { type: 'drawing', progress: 0, completedToday: false, records: [] }
  ],
  cards: [],
  lastLoginDate: ''
});

const ensureUser = (userId: string): User => {
  if (!mockDB.users.has(userId)) {
    const user = createUser(userId, `用户${userId.slice(0, 6)}`);
    mockDB.users.set(userId, user);
    return user;
  }
  const user = mockDB.users.get(userId)!;
  if (user.lastLoginDate !== getToday()) {
    user.lastLoginDate = getToday();
    user.tasks.forEach(t => {
      t.completedToday = false;
      t.progress = 0;
    });
  }
  return user;
};

const generateFlowerSVG = (flowerType: string, rarity: Rarity): string => {
  const rarityColors: Record<Rarity, [string, string]> = {
    common: ['#32CD32', '#FFD700'],
    rare: ['#1E90FF', '#9370DB'],
    legendary: ['#FF4444', '#FFD700']
  };
  const [c1, c2] = rarityColors[rarity];
  const id = uuidv4().replace(/-/g, '');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="150" height="150">
    <defs>
      <radialGradient id="bg_${id}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0.1"/>
      </radialGradient>
      <filter id="noise_${id}">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="${Math.floor(Math.random()*100)}"/>
        <feColorMatrix values="0 0 0 0 0.9  0 0 0 0 0.5  0 0 0 0 0.1  0 0 0 0.15 0"/>
        <feComposite in2="SourceGraphic" operator="in"/>
      </filter>
    </defs>
    <circle cx="100" cy="100" r="95" fill="url(#bg_${id})" stroke="${c2}" stroke-width="2"/>
    <g filter="url(#noise_${id})" opacity="0.7">
      <ellipse cx="100" cy="55" rx="22" ry="35" fill="${c1}" transform="rotate(0 100 100)"/>
      <ellipse cx="100" cy="55" rx="22" ry="35" fill="${c1}" transform="rotate(51 100 100)"/>
      <ellipse cx="100" cy="55" rx="22" ry="35" fill="${c1}" transform="rotate(103 100 100)"/>
      <ellipse cx="100" cy="55" rx="22" ry="35" fill="${c1}" transform="rotate(154 100 100)"/>
      <ellipse cx="100" cy="55" rx="22" ry="35" fill="${c1}" transform="rotate(206 100 100)"/>
      <ellipse cx="100" cy="55" rx="22" ry="35" fill="${c1}" transform="rotate("257 100 100)"/>
      <ellipse cx="100" cy="55" rx="22" ry="35" fill="${c1}" transform="rotate(309 100 100)"/>
    </g>
    <circle cx="100" cy="100" r="18" fill="${c2}" stroke="${c1}" stroke-width="2"/>
    <circle cx="92" cy="96" r="4" fill="#fff" opacity="0.8"/>
    <text x="100" y="175" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" stroke="#000" stroke-width="0.5" font-family="sans-serif">${flowerType}</text>
  </svg>`;
};

const createCard = (rarity: Rarity): FlowerCard => {
  const names = flowerNames[rarity];
  const flowerType = names[Math.floor(Math.random() * names.length)];
  const svgStr = generateFlowerSVG(flowerType, rarity);
  const imageData = 'data:image/svg+xml;base64,' + Buffer.from(svgStr).toString('base64');
  return {
    id: uuidv4(),
    name: flowerType,
    rarity,
    flowerType,
    imageData,
    createdAt: Date.now()
  };
};

const rollRarity = (): Rarity => {
  const r = Math.random();
  if (r < 0.65) return 'common';
  if (r < 0.92) return 'rare';
  return 'legendary';
};

app.get('/api/users/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = ensureUser(userId);
  res.json({ success: true, data: user });
});

app.post('/api/users/:userId/tasks/:taskType/complete', (req: Request, res: Response) => {
  const { userId, taskType } = req.params;
  const { detail } = req.body;
  const user = ensureUser(userId);
  const task = user.tasks.find(t => t.type === taskType as TaskType);
  
  if (!task) return res.json({ success: false, error: '任务不存在' });
  if (task.progress >= 3) return res.json({ success: false, error: '今日进度已满' });

  task.progress++;
  task.records.push({ time: Date.now(), detail });
  
  let newPetal: Petal | null = null;
  if (task.progress >= 3 && !task.completedToday) {
    task.completedToday = true;
    const available = taskPetalMap[taskType as TaskType].filter(
      c => !user.petals.some(p => p.color === c)
    );
    const pool = available.length > 0 ? available : petalColors;
    const color = pool[Math.floor(Math.random() * pool.length)];
    if (!user.petals.some(p => p.color === color)) {
      newPetal = { color, taskType: taskType as TaskType, unlockedAt: Date.now() };
      user.petals.push(newPetal);
    }
  }

  res.json({ success: true, data: { task, newPetal, petals: user.petals } });
});

app.get('/api/users/:userId/petals', (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = ensureUser(userId);
  res.json({ success: true, data: { petals: user.petals, colors: colorHex } });
});

app.post('/api/users/:userId/blindbox/open', (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = ensureUser(userId);
  
  if (user.petals.length < 7) {
    return res.json({ success: false, error: '花瓣数量不足，需要集齐7片' });
  }
  
  const uniqueColors = new Set(user.petals.map(p => p.color));
  if (uniqueColors.size < 7) {
    return res.json({ success: false, error: '需要集齐7种不同颜色的花瓣' });
  }

  user.petals = [];
  const rarity = rollRarity();
  const card = createCard(rarity);
  user.cards.push(card);
  
  res.json({ success: true, data: { card, remainingPetals: user.petals } });
});

app.get('/api/users/:userId/cards', (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = ensureUser(userId);
  res.json({ success: true, data: user.cards });
});

app.post('/api/users/:userId/cards/synthesize', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { card1Id, card2Id } = req.body;
  const user = ensureUser(userId);
  
  const c1 = user.cards.find(c => c.id === card1Id);
  const c2 = user.cards.find(c => c.id === card2Id);
  
  if (!c1 || !c2) return res.json({ success: false, error: '卡片不存在' });
  if (c1.rarity !== c2.rarity) return res.json({ success: false, error: '稀有度不同无法合成' });
  
  user.cards = user.cards.filter(c => c.id !== card1Id && c.id !== card2Id);
  
  const nextRarity: Record<Rarity, Rarity> = { common: 'rare', rare: 'legendary', legendary: 'legendary' };
  const newRarity = Math.random() < 0.85 ? nextRarity[c1.rarity] : c1.rarity;
  const newCard = createCard(newRarity);
  user.cards.push(newCard);
  
  res.json({ success: true, data: { newCard, consumed: [c1, c2] } });
});

app.get('/api/users/search', (req: Request, res: Response) => {
  const results = Array.from(mockDB.users.values())
    .filter(u => u.id !== (req.query.excludeId as string))
    .slice(0, 20)
    .map(u => ({ id: u.id, name: u.name, cardCount: u.cards.length }));
  res.json({ success: true, data: results });
});

app.get('/api/users/:userId/public', (req: Request, res: Response) => {
  const { userId } = req.params;
  const user = ensureUser(userId);
  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      cards: user.cards.map(c => ({
        id: c.id,
        name: c.name,
        rarity: c.rarity,
        imageData: c.imageData
      }))
    }
  });
});

app.post('/api/exchanges', (req: Request, res: Response) => {
  const { fromUserId, toUserId, offeredCardId, requestedCardId } = req.body;
  
  const fromUser = mockDB.users.get(fromUserId);
  const toUser = mockDB.users.get(toUserId);
  
  if (!fromUser || !toUser) return res.json({ success: false, error: '用户不存在' });
  if (!fromUser.cards.find(c => c.id === offeredCardId)) return res.json({ success: false, error: '发起方无此卡片' });
  if (!toUser.cards.find(c => c.id === requestedCardId)) return res.json({ success: false, error: '对方无此卡片' });
  
  const exchange: ExchangeRequest = {
    id: uuidv4(),
    fromUserId,
    toUserId,
    offeredCardId,
    requestedCardId,
    status: 'pending',
    createdAt: Date.now()
  };
  mockDB.exchanges.set(exchange.id, exchange);
  
  res.json({ success: true, data: exchange });
});

app.get('/api/exchanges/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  ensureUser(userId);
  const list = Array.from(mockDB.exchanges.values())
    .filter(e => e.fromUserId === userId || e.toUserId === userId)
    .map(e => {
      const from = mockDB.users.get(e.fromUserId);
      const to = mockDB.users.get(e.toUserId);
      const offered = from?.cards.find(c => c.id === e.offeredCardId);
      const requested = to?.cards.find(c => c.id === e.requestedCardId);
      return { ...e, fromName: from?.name, toName: to?.name, offeredCard: offered, requestedCard: requested };
    });
  res.json({ success: true, data: list });
});

app.post('/api/exchanges/:id/accept', (req: Request, res: Response) => {
  const { id } = req.params;
  const exchange = mockDB.exchanges.get(id);
  
  if (!exchange) return res.json({ success: false, error: '请求不存在' });
  if (exchange.status !== 'pending') return res.json({ success: false, error: '请求状态异常' });
  
  const fromUser = mockDB.users.get(exchange.fromUserId);
  const toUser = mockDB.users.get(exchange.toUserId);
  if (!fromUser || !toUser) return res.json({ success: false, error: '用户不存在' });
  
  const offeredCard = fromUser.cards.find(c => c.id === exchange.offeredCardId);
  const requestedCard = toUser.cards.find(c => c.id === exchange.requestedCardId);
  if (!offeredCard || !requestedCard) return res.json({ success: false, error: '卡片不存在' });
  
  fromUser.cards = fromUser.cards.filter(c => c.id !== exchange.offeredCardId);
  toUser.cards = toUser.cards.filter(c => c.id !== exchange.requestedCardId);
  fromUser.cards.push(requestedCard);
  toUser.cards.push(offeredCard);
  
  exchange.status = 'accepted';
  res.json({ success: true, data: exchange });
});

app.post('/api/exchanges/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params;
  const exchange = mockDB.exchanges.get(id);
  if (!exchange) return res.json({ success: false, error: '请求不存在' });
  exchange.status = 'rejected';
  res.json({ success: true, data: exchange });
});

app.listen(PORT, () => {
  console.log(`🌸 秘境花语后端服务运行在 http://localhost:${PORT}`);
});
