export interface Star {
  id: string;
  name: string;
  x: number;
  y: number;
  magnitude: number;
  opacity: number;
  isMain: boolean;
}

export interface Planet {
  name: string;
  symbol: string;
  angle: number;
  color: string;
  distance: number;
}

export interface DivinationResult {
  id: string;
  date: string;
  lunarDate: string;
  solarTerm: string;
  moonPhase: number;
  coins: number[];
  hexagram: string;
  text: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  icon: string;
}

export interface SolarTerm {
  name: string;
  date: string;
  description: string;
  month: number;
}

export interface CoinState {
  value: number | null;
  isFlipping: boolean;
}

export type MoonPhaseType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const MOON_PHASE_NAMES = [
  '新月', '蛾眉月', '上弦月', '盈凸月',
  '满月', '亏凸月', '下弦月', '残月'
] as const;

export const HEXAGRAMS = [
  { name: '乾', lines: [1, 1, 1, 1, 1, 1], meaning: '天行健，君子以自强不息' },
  { name: '坤', lines: [0, 0, 0, 0, 0, 0], meaning: '地势坤，君子以厚德载物' },
  { name: '屯', lines: [1, 0, 0, 0, 1, 0], meaning: '云雷屯，君子以经纶' },
  { name: '蒙', lines: [0, 1, 0, 0, 0, 1], meaning: '山下出泉，蒙，君子以果行育德' },
  { name: '需', lines: [1, 1, 1, 0, 1, 0], meaning: '云上于天，需，君子以饮食宴乐' },
  { name: '讼', lines: [0, 1, 0, 1, 1, 1], meaning: '天与水违行，讼，君子以作事谋始' },
];

export const SOLAR_TERMS: SolarTerm[] = [
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

export const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
export const LUNAR_DAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
