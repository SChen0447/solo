import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

type NoteType = 'top' | 'middle' | 'base';

interface AromaBase {
  id: string;
  name: string;
  nameEn: string;
  note: NoteType;
  color: string;
  description: string;
  iconSvg: string;
  tags: string[];
}

interface BlendItem {
  baseId: string;
  ratio: number;
}

interface BlendResult {
  id: string;
  topNotes: { name: string; ratio: number; color: string }[];
  middleNotes: { name: string; ratio: number; color: string }[];
  baseNotes: { name: string; ratio: number; color: string }[];
  totalScore: number;
  longevity: number;
  projection: number;
  moodTags: { label: string; description: string }[];
  dominantColor: string;
  createdAt: string;
}

const aromaBases: AromaBase[] = [
  { id: 'bergamot', name: '佛手柑', nameEn: 'Bergamot', note: 'top', color: '#f5d742', description: '明亮清新的柑橘香气，带有微苦的花香调', iconSvg: '🍊', tags: ['清新', '柑橘', '明亮'] },
  { id: 'lemon', name: '柠檬', nameEn: 'Lemon', note: 'top', color: '#fff176', description: '酸爽醒神的经典柑橘香，干净利落', iconSvg: '🍋', tags: ['清新', '柑橘', '醒神'] },
  { id: 'grapefruit', name: '葡萄柚', nameEn: 'Grapefruit', note: 'top', color: '#ff8a65', description: '微苦的柑橘香，带有粉红胡椒般的辛香', iconSvg: '🍊', tags: ['清新', '柑橘', '微苦'] },
  { id: 'mint', name: '薄荷', nameEn: 'Mint', note: 'top', color: '#81c784', description: '清凉提神的草本香气，如薄荷糖般清爽', iconSvg: '🌿', tags: ['清凉', '草本', '提神'] },
  { id: 'green-tea', name: '绿茶', nameEn: 'Green Tea', note: 'top', color: '#aed581', description: '清雅的茶香，带有淡淡的青草气息', iconSvg: '🍵', tags: ['清雅', '茶香', '自然'] },
  { id: 'sea-breeze', name: '海洋风', nameEn: 'Sea Breeze', note: 'top', color: '#4fc3f7', description: '清冽的水生气息，仿若海风拂面', iconSvg: '🌊', tags: ['清冽', '水生', '海洋'] },
  { id: 'pear', name: '梨', nameEn: 'Pear', note: 'top', color: '#fff59d', description: '多汁甜美的果香，带有清脆的新鲜感', iconSvg: '🍐', tags: ['甜美', '果香', '清脆'] },
  { id: 'pink-pepper', name: '粉红胡椒', nameEn: 'Pink Pepper', note: 'top', color: '#f48fb1', description: '微辛的香料气息，带有柑橘般的清新', iconSvg: '🌶️', tags: ['辛香', '胡椒', '活泼'] },
  { id: 'mandarin', name: '橘子', nameEn: 'Mandarin', note: 'top', color: '#ffb74d', description: '甜蜜温暖的柑橘香，比橙子更柔和', iconSvg: '🍊', tags: ['甜美', '柑橘', '温暖'] },
  { id: 'ginger', name: '生姜', nameEn: 'Ginger', note: 'top', color: '#ffcc80', description: '辛香温暖的根茎香，带有一丝辛辣', iconSvg: '🫚', tags: ['辛香', '温暖', '辛辣'] },

  { id: 'jasmine', name: '茉莉', nameEn: 'Jasmine', note: 'middle', color: '#f48fb1', description: '浓郁优雅的白花香气，夜晚更为馥郁', iconSvg: '🌸', tags: ['花香', '优雅', '浓郁'] },
  { id: 'rose', name: '玫瑰', nameEn: 'Rose', note: 'middle', color: '#f06292', description: '经典华贵的花中之后，层次丰富', iconSvg: '🌹', tags: ['花香', '华贵', '经典'] },
  { id: 'ylang-ylang', name: '依兰依兰', nameEn: 'Ylang Ylang', note: 'middle', color: '#ffd54f', description: '浓郁甜美的热带花香，带有异域风情', iconSvg: '🌼', tags: ['花香', '甜美', '异域'] },
  { id: 'lavender', name: '薰衣草', nameEn: 'Lavender', note: 'middle', color: '#9575cd', description: '舒缓宁静的草本花香，普罗旺斯的气息', iconSvg: '💜', tags: ['舒缓', '草本', '宁静'] },
  { id: 'iris', name: '鸢尾', nameEn: 'Iris', note: 'middle', color: '#ba68c8', description: '高雅的粉感花香，如丝绸般顺滑', iconSvg: '💐', tags: ['高雅', '粉感', '丝滑'] },
  { id: 'peony', name: '牡丹', nameEn: 'Peony', note: 'middle', color: '#f8bbd0', description: '娇嫩丰盈的花香，带有淡淡的甜味', iconSvg: '🌺', tags: ['花香', '娇嫩', '丰盈'] },
  { id: 'cinnamon', name: '肉桂', nameEn: 'Cinnamon', note: 'middle', color: '#d7ccc8', description: '温暖辛辣的香料香，冬日的暖意', iconSvg: '🍂', tags: ['辛香', '温暖', '香料'] },
  { id: 'cardamom', name: '小豆蔻', nameEn: 'Cardamom', note: 'middle', color: '#a1887f', description: '清凉辛香的东方香料，带有柠檬般的清新', iconSvg: '🫛', tags: ['辛香', '东方', '清凉'] },
  { id: 'sage', name: '鼠尾草', nameEn: 'Sage', note: 'middle', color: '#81c784', description: '草本芳香，带有淡淡的药用气息', iconSvg: '🌿', tags: ['草本', '芳香', '自然'] },
  { id: 'tuberose', name: '晚香玉', nameEn: 'Tuberose', note: 'middle', color: '#fff9c4', description: '浓郁甜腻的白色花香，夜晚绽放的诱惑', iconSvg: '🌷', tags: ['花香', '浓郁', '诱惑'] },

  { id: 'sandalwood', name: '檀木', nameEn: 'Sandalwood', note: 'base', color: '#8d6e63', description: '温润奶香的木质香，禅意悠远', iconSvg: '🪵', tags: ['木质', '温润', '奶香'] },
  { id: 'cedar', name: '雪松', nameEn: 'Cedar', note: 'base', color: '#6d4c41', description: '干燥挺拔的木质香，如森林中的清晨', iconSvg: '🌲', tags: ['木质', '干燥', '森林'] },
  { id: 'oud', name: '沉香', nameEn: 'Oud', note: 'base', color: '#5d4037', description: '浓郁神秘的东方香材，烟熏木质', iconSvg: '🪔', tags: ['木质', '东方', '神秘'] },
  { id: 'vanilla', name: '香草', nameEn: 'Vanilla', note: 'base', color: '#ffe0b2', description: '甜蜜温暖的美食调，让人感到幸福', iconSvg: '🍦', tags: ['甜美', '美食', '温暖'] },
  { id: 'musk', name: '麝香', nameEn: 'Musk', note: 'base', color: '#e0e0e0', description: '肌肤般的温柔气息，持久而性感', iconSvg: '✨', tags: ['温柔', '肌肤', '性感'] },
  { id: 'amber', name: '琥珀', nameEn: 'Amber', note: 'base', color: '#ff8f00', description: '温暖树脂的金色香气，华丽而持久', iconSvg: '🟠', tags: ['树脂', '温暖', '华丽'] },
  { id: 'patchouli', name: '广藿香', nameEn: 'Patchouli', note: 'base', color: '#558b2f', description: '泥土气息的草本香，带有复古感', iconSvg: '🌿', tags: ['草本', '泥土', '复古'] },
  { id: 'tonka', name: '零陵香豆', nameEn: 'Tonka Bean', note: 'base', color: '#795548', description: '杏仁与香草的混合甜香，温暖诱人', iconSvg: '🫘', tags: ['甜美', '温暖', '杏仁'] },
  { id: 'leather', name: '皮革', nameEn: 'Leather', note: 'base', color: '#4e342e', description: '高级皮具的质感香，优雅而性感', iconSvg: '👜', tags: ['皮革', '优雅', '性感'] },
  { id: 'benzoin', name: '安息香', nameEn: 'Benzoin', note: 'base', color: '#ff9800', description: '香甜的树脂香，带有香草和肉桂的气息', iconSvg: '🌲', tags: ['树脂', '香甜', '温暖'] },
];

const blendSchema = z.object({
  bases: z.array(
    z.object({
      baseId: z.string(),
      ratio: z.number().min(1).max(100),
    })
  ).min(1).max(5),
});

const moodTagPool = [
  { label: '宁静', description: '带来内心的平静与安详，如湖面般澄澈' },
  { label: '温暖', description: '如阳光洒在身上的温馨感，让人安心' },
  { label: '清新', description: '如清晨的第一缕风，干净而明亮' },
  { label: '神秘', description: '深邃而引人探索，带有东方的玄秘感' },
  { label: '优雅', description: '精致而有品位，散发着高级感' },
  { label: '活泼', description: '充满活力与朝气，让人心情愉悦' },
  { label: '性感', description: '带有挑逗的魅力，令人心动' },
  { label: '复古', description: '怀旧的气息，穿越时光的优雅' },
  { label: '自然', description: '大自然的味道，返璞归真' },
  { label: '奢华', description: '华丽而精致，彰显不凡品味' },
];

app.get('/api/bases', (_req, res) => {
  res.json(aromaBases);
});

app.post('/api/blend', (req, res) => {
  const result = blendSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ error: 'Invalid blend data' });
  }

  const { bases } = result.data;
  const blendResult = calculateBlendResult(bases);
  res.json(blendResult);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('blend:start', async (data: { bases: BlendItem[] }) => {
    const result = blendSchema.safeParse(data);

    if (!result.success) {
      socket.emit('blend:error', { message: 'Invalid blend data' });
      return;
    }

    const progressSteps = [0, 25, 50, 75, 100];

    for (let i = 0; i < progressSteps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      socket.emit('blend:progress', { progress: progressSteps[i] });
    }

    const blendResult = calculateBlendResult(data.bases);
    socket.emit('blend:complete', { result: blendResult });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

function calculateBlendResult(bases: BlendItem[]): BlendResult {
  const baseMap = new Map(aromaBases.map((b) => [b.id, b]));
  const totalRatio = bases.reduce((sum, b) => sum + b.ratio, 0);

  const topNotes: { name: string; ratio: number; color: string }[] = [];
  const middleNotes: { name: string; ratio: number; color: string }[] = [];
  const baseNotes: { name: string; ratio: number; color: string }[] = [];

  let totalScore = 0;
  let longevity = 0;
  let projection = 0;
  let dominantColor = '#b87333';
  let maxRatio = 0;

  bases.forEach((item) => {
    const base = baseMap.get(item.baseId);
    if (!base) return;

    const normalizedRatio = Math.round((item.ratio / totalRatio) * 100);

    const noteInfo = { id: base.id, name: base.name, ratio: normalizedRatio, color: base.color };

    if (base.note === 'top') {
      topNotes.push(noteInfo);
    } else if (base.note === 'middle') {
      middleNotes.push(noteInfo);
    } else {
      baseNotes.push(noteInfo);
    }

    if (item.ratio > maxRatio) {
      maxRatio = item.ratio;
      dominantColor = base.color;
    }

    totalScore += item.ratio * (base.note === 'top' ? 0.8 : base.note === 'middle' ? 1.0 : 1.2);
    longevity += item.ratio * (base.note === 'top' ? 0.3 : base.note === 'middle' ? 0.7 : 1.0);
    projection += item.ratio * (base.note === 'top' ? 1.0 : base.note === 'middle' ? 0.7 : 0.4);
  });

  totalScore = Math.min(100, Math.round(totalScore / totalRatio * 10));
  longevity = Math.min(100, Math.round(longevity / totalRatio * 100));
  projection = Math.min(100, Math.round(projection / totalRatio * 100));

  const allTags: string[] = [];
  bases.forEach((item) => {
    const base = baseMap.get(item.baseId);
    if (base) {
      for (let i = 0; i < Math.ceil(item.ratio / 20); i++) {
        allTags.push(...base.tags);
      }
    }
  });

  const tagCount = new Map<string, number>();
  allTags.forEach((tag) => {
    tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
  });

  const sortedTags = Array.from(tagCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const moodTags = sortedTags.map((tagLabel) => {
    const found = moodTagPool.find((t) => t.label === tagLabel);
    if (found) return found;
    return { label: tagLabel, description: `带有${tagLabel}的独特气息` };
  });

  while (moodTags.length < 3) {
    const randomTag = moodTagPool[Math.floor(Math.random() * moodTagPool.length)];
    if (!moodTags.some((t) => t.label === randomTag.label)) {
      moodTags.push(randomTag);
    }
  }

  return {
    id: uuidv4(),
    topNotes,
    middleNotes,
    baseNotes,
    totalScore,
    longevity,
    projection,
    moodTags,
    dominantColor,
    createdAt: new Date().toISOString(),
  };
}

const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log(`Perfume Lab Server running on port ${PORT}`);
  console.log(`- GET /api/bases - Get all aroma bases`);
  console.log(`- POST /api/blend - Calculate blend result`);
  console.log(`- Socket.IO - Real-time blending progress`);
});
