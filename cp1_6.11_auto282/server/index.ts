import express, { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { DivinationResult, Achievement, SolarTerm } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const SOLAR_TERMS: SolarTerm[] = [
  { name: '立春', date: '02-04', description: '东风解冻，蛰虫始振', month: 2 },
  { name: '雨水', date: '02-19', description: '獭祭鱼，鸿雁来', month: 2 },
  { name: '惊蛰', date: '03-06', description: '桃始华，仓庚鸣', month: 3 },
  { name: '春分', date: '03-21', description: '玄鸟至，雷乃发声', month: 3 },
  { name: '清明', date: '04-05', description: '桐始华，田鼠化为鴽', month: 4 },
  { name: '谷雨', date: '04-20', description: '萍始生，鸣鸠拂其羽', month: 4 },
  { name: '立夏', date: '05-06', description: '蝼蝈鸣，蚯蚓出', month: 5 },
  { name: '小满', date: '05-21', description: '苦菜秀，靡草死', month: 5 },
  { name: '芒种', date: '06-06', description: '螳螂生，鵙始鸣', month: 6 },
  { name: '夏至', date: '06-21', description: '鹿角解，蜩始鸣', month: 6 },
  { name: '小暑', date: '07-07', description: '温风至，蟋蟀居壁', month: 7 },
  { name: '大暑', date: '07-23', description: '腐草为萤，土润溽暑', month: 7 },
  { name: '立秋', date: '08-08', description: '凉风至，白露降', month: 8 },
  { name: '处暑', date: '08-23', description: '鹰乃祭鸟，天地始肃', month: 8 },
  { name: '白露', date: '09-08', description: '鸿雁来，玄鸟归', month: 9 },
  { name: '秋分', date: '09-23', description: '雷始收声，蛰虫坯户', month: 9 },
  { name: '寒露', date: '10-08', description: '鸿雁来宾，雀入大水为蛤', month: 10 },
  { name: '霜降', date: '10-24', description: '豺乃祭兽，草木黄落', month: 10 },
  { name: '立冬', date: '11-07', description: '水始冰，地始冻', month: 11 },
  { name: '小雪', date: '11-22', description: '虹藏不见，天气上升地气下降', month: 11 },
  { name: '大雪', date: '12-07', description: '鹖鴠不鸣，虎始交', month: 12 },
  { name: '冬至', date: '12-22', description: '蚯蚓结，麋角解', month: 12 },
  { name: '小寒', date: '01-06', description: '雁北乡，鹊始巢', month: 1 },
  { name: '大寒', date: '01-20', description: '鸡乳，征鸟厉疾', month: 1 },
];

let divinationRecords: DivinationResult[] = [];

let achievements: Achievement[] = [
  { id: '1', name: '首次观星', description: '完成第一次占卜', unlocked: false, icon: '⭐' },
  { id: '2', name: '占卜达人', description: '完成十次占卜', unlocked: false, icon: '🔮' },
  { id: '3', name: '节气收藏家', description: '解锁所有节气', unlocked: false, icon: '📅' },
  { id: '4', name: '月相大师', description: '观测到全部八种月相', unlocked: false, icon: '🌙' },
  { id: '5', name: '易学精通', description: '获得乾卦', unlocked: false, icon: '☯️' },
];

const unlockedTerms = new Set<string>();
const observedPhases = new Set<number>();
let totalDivinations = 0;
let collectedTexts = 0;

const divinationSchema = z.object({
  moonPhase: z.number().min(0).max(7),
  coins: z.array(z.number().min(0).max(1)).length(3),
  targetDate: z.string(),
});

const getLunarDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.getMonth();
  const lunarMonths = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  return `${lunarMonths[month]}月${lunarDays[(day - 1) % 30]}`;
};

const getNearbySolarTerm = (date: Date): { term: SolarTerm; daysUntil: number } => {
  const year = date.getFullYear();
  let nearestTerm = SOLAR_TERMS[0];
  let minDiff = Infinity;

  for (const term of SOLAR_TERMS) {
    const [month, day] = term.date.split('-').map(Number);
    const termDate = new Date(year, month - 1, day);
    const diff = Math.abs(date.getTime() - termDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < minDiff) {
      minDiff = diff;
      nearestTerm = term;
    }
  }

  const [month, day] = nearestTerm.date.split('-').map(Number);
  const termDate = new Date(year, month - 1, day);
  const daysUntil = Math.ceil((termDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  return { term: nearestTerm, daysUntil };
};

const generateDivinationText = (moonPhase: number, coins: number[], solarTerm: SolarTerm): { text: string; hexagram: string } => {
  const moonPhaseNames = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];
  const hexagramNames = ['乾', '坤', '屯', '蒙', '需', '讼', '师', '比'];
  const hexagramLines = ['初九，潜龙勿用', '初六，履霜坚冰至', '初九，磐桓利居贞', '初六，发蒙利用刑人', '初九，需于郊利用恒', '初六，不永所事小有言'];

  const coinSum = coins.reduce((a, b) => a + b, 0);
  const hexagramIndex = coinSum + moonPhase % hexagramNames.length;
  const hexagram = hexagramNames[hexagramIndex % hexagramNames.length];
  const line = hexagramLines[hexagramIndex % hexagramLines.length];

  const moonDesc = moonPhase === 0 ? '月晦' : moonPhase === 4 ? '月满' : '月明';
  const seasonDesc = solarTerm.description.split('，')[0];

  const fortunes = [
    `${moonDesc}星明，${hexagram}卦${line}；${solarTerm.name}在即，${seasonDesc}，宜静待之。`,
    `星移斗转，${hexagram}卦${line}；${solarTerm.name}将至，${seasonDesc}，利有攸往。`,
    `月华初${moonPhaseNames[moonPhase]}，${hexagram}卦${line}；${solarTerm.name}，${seasonDesc}，宜守正。`,
  ];

  return {
    text: fortunes[hexagramIndex % fortunes.length],
    hexagram,
  };
};

const checkAchievements = (divination: DivinationResult): Achievement | null => {
  totalDivinations++;
  collectedTexts++;
  unlockedTerms.add(divination.solarTerm);
  observedPhases.add(divination.moonPhase);

  let newAchievement: Achievement | null = null;

  if (totalDivinations === 1 && !achievements[0].unlocked) {
    achievements[0].unlocked = true;
    achievements[0].unlockedAt = new Date().toISOString();
    newAchievement = { ...achievements[0] };
  }

  if (totalDivinations === 10 && !achievements[1].unlocked) {
    achievements[1].unlocked = true;
    achievements[1].unlockedAt = new Date().toISOString();
    newAchievement = { ...achievements[1] };
  }

  if (unlockedTerms.size === 24 && !achievements[2].unlocked) {
    achievements[2].unlocked = true;
    achievements[2].unlockedAt = new Date().toISOString();
    newAchievement = { ...achievements[2] };
  }

  if (observedPhases.size === 8 && !achievements[3].unlocked) {
    achievements[3].unlocked = true;
    achievements[3].unlockedAt = new Date().toISOString();
    newAchievement = { ...achievements[3] };
  }

  if (divination.hexagram === '乾' && !achievements[4].unlocked) {
    achievements[4].unlocked = true;
    achievements[4].unlockedAt = new Date().toISOString();
    newAchievement = { ...achievements[4] };
  }

  return newAchievement;
};

app.get('/api/solar-terms', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: SOLAR_TERMS,
  });
});

app.post('/api/divination', (req: Request, res: Response) => {
  const validation = divinationSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error.errors,
    });
  }

  const { moonPhase, coins, targetDate } = validation.data;
  const date = new Date(targetDate);
  const lunarDate = getLunarDate(date);
  const { term } = getNearbySolarTerm(date);
  const { text, hexagram } = generateDivinationText(moonPhase, coins, term);

  const result: DivinationResult = {
    id: uuidv4(),
    date: targetDate,
    lunarDate,
    solarTerm: term.name,
    moonPhase,
    coins,
    hexagram,
    text,
    createdAt: new Date().toISOString(),
  };

  divinationRecords.unshift(result);
  const newAchievement = checkAchievements(result);

  res.json({
    success: true,
    data: result,
    achievement: newAchievement || undefined,
  });
});

app.get('/api/divination', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: divinationRecords,
  });
});

app.get('/api/divination/:id', (req: Request, res: Response) => {
  const record = divinationRecords.find(r => r.id === req.params.id);
  if (!record) {
    return res.status(404).json({
      success: false,
      error: 'Record not found',
    });
  }
  res.json({
    success: true,
    data: record,
  });
});

app.delete('/api/divination/:id', (req: Request, res: Response) => {
  const index = divinationRecords.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Record not found',
    });
  }
  divinationRecords.splice(index, 1);
  res.json({
    success: true,
    message: 'Record deleted',
  });
});

app.get('/api/achievements', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      totalDivinations,
      collectedTexts,
      unlockedTerms: Array.from(unlockedTerms),
      achievements,
    },
  });
});

app.post('/api/achievements', (req: Request, res: Response) => {
  const { achievementId } = req.body;
  const achievement = achievements.find(a => a.id === achievementId);
  if (!achievement) {
    return res.status(404).json({
      success: false,
      error: 'Achievement not found',
    });
  }
  if (!achievement.unlocked) {
    achievement.unlocked = true;
    achievement.unlockedAt = new Date().toISOString();
  }
  res.json({
    success: true,
    data: achievement,
  });
});

app.listen(PORT, () => {
  console.log(`观星台后端服务运行在 http://localhost:${PORT}`);
});
