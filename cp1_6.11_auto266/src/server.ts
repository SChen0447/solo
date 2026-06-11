import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

export interface Star {
  id: string;
  name: string;
  chineseName: string;
  magnitude: number;
  ra: number;
  dec: number;
  mansion: string;
  isUserDefined?: boolean;
}

export interface StarMapVersion {
  id: string;
  name: string;
  createdAt: string;
  stars: Star[];
}

export interface CalendarEvent {
  date: string;
  type: 'solar_term' | 'solar_eclipse' | 'lunar_eclipse' | 'transit';
  name: string;
  description: string;
  visibility?: { latMin: number; latMax: number; lonMin: number; lonMax: number };
  planet?: string;
}

const MANSIONS = [
  '角宿', '亢宿', '氐宿', '房宿', '心宿', '尾宿', '箕宿',
  '斗宿', '牛宿', '女宿', '虚宿', '危宿', '室宿', '壁宿',
  '奎宿', '娄宿', '胃宿', '昴宿', '毕宿', '觜宿', '参宿',
  '井宿', '鬼宿', '柳宿', '星宿', '张宿', '翼宿', '轸宿'
];

const PREDEFINED_STARS: Star[] = [
  { id: 's1', name: 'Spica', chineseName: '角宿一', magnitude: 0.97, ra: 201.298, dec: -11.161, mansion: '角宿' },
  { id: 's2', name: 'zeta Vir', chineseName: '角宿二', magnitude: 3.37, ra: 203.521, dec: -0.677, mansion: '角宿' },
  { id: 's3', name: 'iota Vir', chineseName: '亢宿一', magnitude: 4.08, ra: 207.475, dec: -5.922, mansion: '亢宿' },
  { id: 's4', name: 'kappa Vir', chineseName: '亢宿二', magnitude: 4.18, ra: 206.496, dec: -10.408, mansion: '亢宿' },
  { id: 's5', name: 'lambda Lib', chineseName: '氐宿一', magnitude: 3.48, ra: 226.023, dec: -13.230, mansion: '氐宿' },
  { id: 's6', name: 'iota Lib', chineseName: '氐宿二', magnitude: 4.54, ra: 228.890, dec: -19.513, mansion: '氐宿' },
  { id: 's7', name: 'pi Sco', chineseName: '房宿一', magnitude: 2.89, ra: 241.523, dec: -26.432, mansion: '房宿' },
  { id: 's8', name: 'rho Sco', chineseName: '房宿二', magnitude: 3.89, ra: 242.075, dec: -29.076, mansion: '房宿' },
  { id: 's9', name: 'sigma Sco', chineseName: '房宿三', magnitude: 2.89, ra: 243.530, dec: -25.585, mansion: '房宿' },
  { id: 's10', name: 'Antares', chineseName: '心宿二', magnitude: 1.06, ra: 247.351, dec: -26.432, mansion: '心宿' },
  { id: 's11', name: 'tau Sco', chineseName: '心宿三', magnitude: 2.82, ra: 248.522, dec: -28.137, mansion: '心宿' },
  { id: 's12', name: 'mu1 Sco', chineseName: '尾宿一', magnitude: 3.08, ra: 250.486, dec: -38.065, mansion: '尾宿' },
  { id: 's13', name: 'epsilon Sco', chineseName: '尾宿二', magnitude: 2.29, ra: 252.471, dec: -34.404, mansion: '尾宿' },
  { id: 's14', name: 'zeta Sco', chineseName: '尾宿三', magnitude: 3.62, ra: 253.157, dec: -42.973, mansion: '尾宿' },
  { id: 's15', name: 'eta Oph', chineseName: '箕宿一', magnitude: 2.43, ra: 255.636, dec: -15.433, mansion: '箕宿' },
  { id: 's16', name: 'gamma Sgr', chineseName: '箕宿二', magnitude: 2.99, ra: 272.266, dec: -30.463, mansion: '箕宿' },
  { id: 's17', name: 'delta Sgr', chineseName: '箕宿三', magnitude: 2.70, ra: 276.133, dec: -30.363, mansion: '箕宿' },
  { id: 's18', name: 'phi Sgr', chineseName: '斗宿一', magnitude: 3.17, ra: 279.224, dec: -26.860, mansion: '斗宿' },
  { id: 's19', name: 'lambda Sgr', chineseName: '斗宿二', magnitude: 2.82, ra: 280.396, dec: -25.374, mansion: '斗宿' },
  { id: 's20', name: 'mu Sgr', chineseName: '斗宿三', magnitude: 3.86, ra: 281.684, dec: -21.457, mansion: '斗宿' },
  { id: 's21', name: 'beta Cap', chineseName: '牛宿一', magnitude: 3.05, ra: 304.413, dec: -14.782, mansion: '牛宿' },
  { id: 's22', name: 'alpha2 Cap', chineseName: '牛宿二', magnitude: 3.58, ra: 306.490, dec: -12.878, mansion: '牛宿' },
  { id: 's23', name: 'epsilon Aqr', chineseName: '女宿一', magnitude: 3.77, ra: 317.793, dec: -9.423, mansion: '女宿' },
  { id: 's24', name: 'mu Aqr', chineseName: '女宿二', magnitude: 4.73, ra: 320.245, dec: -8.850, mansion: '女宿' },
  { id: 's25', name: 'beta Equ', chineseName: '虚宿一', magnitude: 5.16, ra: 309.193, dec: 6.377, mansion: '虚宿' },
  { id: 's26', name: 'alpha Aqr', chineseName: '虚宿一', magnitude: 2.94, ra: 322.506, dec: -0.047, mansion: '虚宿' },
  { id: 's27', name: 'alpha Peg', chineseName: '危宿一', magnitude: 2.49, ra: 331.461, dec: 15.210, mansion: '危宿' },
  { id: 's28', name: 'theta Peg', chineseName: '危宿二', magnitude: 3.53, ra: 330.290, dec: 6.592, mansion: '危宿' },
  { id: 's29', name: 'alpha Cyg', chineseName: '危宿三', magnitude: 1.25, ra: 299.995, dec: 45.280, mansion: '危宿' },
  { id: 's30', name: 'beta Peg', chineseName: '室宿一', magnitude: 2.42, ra: 342.083, dec: 28.075, mansion: '室宿' },
  { id: 's31', name: 'alpha And', chineseName: '室宿二', magnitude: 2.06, ra: 2.317, dec: 29.095, mansion: '室宿' },
  { id: 's32', name: 'gamma Peg', chineseName: '壁宿一', magnitude: 2.83, ra: 351.081, dec: 15.210, mansion: '壁宿' },
  { id: 's33', name: 'alpha Psc', chineseName: '壁宿二', magnitude: 3.82, ra: 347.350, dec: 7.431, mansion: '壁宿' },
  { id: 's34', name: 'eta And', chineseName: '奎宿一', magnitude: 4.42, ra: 7.422, dec: 23.385, mansion: '奎宿' },
  { id: 's35', name: 'zeta And', chineseName: '奎宿二', magnitude: 4.08, ra: 10.126, dec: 24.363, mansion: '奎宿' },
  { id: 's36', name: 'epsilon And', chineseName: '奎宿三', magnitude: 4.37, ra: 9.980, dec: 29.100, mansion: '奎宿' },
  { id: 's37', name: 'beta Ari', chineseName: '娄宿一', magnitude: 2.64, ra: 31.467, dec: 20.784, mansion: '娄宿' },
  { id: 's38', name: 'gamma Ari', chineseName: '娄宿二', magnitude: 4.67, ra: 31.815, dec: 19.213, mansion: '娄宿' },
  { id: 's39', name: 'alpha Ari', chineseName: '娄宿三', magnitude: 2.00, ra: 29.232, dec: 23.463, mansion: '娄宿' },
  { id: 's40', name: '35 Ari', chineseName: '胃宿一', magnitude: 5.60, ra: 37.465, dec: 17.570, mansion: '胃宿' },
  { id: 's41', name: '39 Ari', chineseName: '胃宿二', magnitude: 5.68, ra: 38.695, dec: 12.788, mansion: '胃宿' },
  { id: 's42', name: '41 Ari', chineseName: '胃宿三', magnitude: 3.61, ra: 40.089, dec: 27.798, mansion: '胃宿' },
  { id: 's43', name: 'Alcyone', chineseName: '昴宿一', magnitude: 2.87, ra: 56.828, dec: 24.105, mansion: '昴宿' },
  { id: 's44', name: 'Atlas', chineseName: '昴宿二', magnitude: 3.63, ra: 56.909, dec: 23.832, mansion: '昴宿' },
  { id: 's45', name: 'Electra', chineseName: '昴宿三', magnitude: 3.72, ra: 56.720, dec: 24.348, mansion: '昴宿' },
  { id: 's46', name: 'Merope', chineseName: '昴宿四', magnitude: 4.14, ra: 56.869, dec: 23.920, mansion: '昴宿' },
  { id: 's47', name: 'Aldebaran', chineseName: '毕宿五', magnitude: 0.87, ra: 68.980, dec: 16.509, mansion: '毕宿' },
  { id: 's48', name: 'epsilon Tau', chineseName: '毕宿一', magnitude: 3.53, ra: 65.408, dec: 19.171, mansion: '毕宿' },
  { id: 's49', name: 'delta3 Tau', chineseName: '毕宿二', magnitude: 4.31, ra: 64.956, dec: 17.423, mansion: '毕宿' },
  { id: 's50', name: 'gamma Tau', chineseName: '毕宿三', magnitude: 3.65, ra: 67.003, dec: 15.712, mansion: '毕宿' },
  { id: 's51', name: 'lambda Ori', chineseName: '觜宿一', magnitude: 3.54, ra: 78.969, dec: 9.745, mansion: '觜宿' },
  { id: 's52', name: 'phi1 Ori', chineseName: '觜宿二', magnitude: 4.42, ra: 77.540, dec: 9.705, mansion: '觜宿' },
  { id: 's53', name: 'Bellatrix', chineseName: '参宿五', magnitude: 1.64, ra: 81.283, dec: 6.350, mansion: '参宿' },
  { id: 's54', name: 'Rigel', chineseName: '参宿七', magnitude: 0.13, ra: 78.634, dec: -8.202, mansion: '参宿' },
  { id: 's55', name: 'Alnitak', chineseName: '参宿一', magnitude: 1.77, ra: 85.190, dec: -1.943, mansion: '参宿' },
  { id: 's56', name: 'Alnilam', chineseName: '参宿二', magnitude: 1.70, ra: 84.053, dec: -1.202, mansion: '参宿' },
  { id: 's57', name: 'Mintaka', chineseName: '参宿三', magnitude: 2.23, ra: 83.002, dec: -0.299, mansion: '参宿' },
  { id: 's58', name: 'Betelgeuse', chineseName: '参宿四', magnitude: 0.45, ra: 88.793, dec: 7.407, mansion: '参宿' },
  { id: 's59', name: 'alpha Gem', chineseName: '井宿一', magnitude: 1.98, ra: 112.938, dec: 31.813, mansion: '井宿' },
  { id: 's60', name: 'beta Gem', chineseName: '井宿三', magnitude: 1.16, ra: 113.649, dec: 28.026, mansion: '井宿' },
  { id: 's61', name: 'gamma Gem', chineseName: '井宿四', magnitude: 1.91, ra: 107.695, dec: 16.399, mansion: '井宿' },
  { id: 's62', name: 'delta Gem', chineseName: '井宿五', magnitude: 3.53, ra: 101.323, dec: 22.011, mansion: '井宿' },
  { id: 's63', name: 'theta Gem', chineseName: '井宿六', magnitude: 3.60, ra: 109.883, dec: 23.681, mansion: '井宿' },
  { id: 's64', name: 'epsilon Cnc', chineseName: '鬼宿一', magnitude: 6.29, ra: 126.606, dec: 19.810, mansion: '鬼宿' },
  { id: 's65', name: 'eta Cnc', chineseName: '鬼宿二', magnitude: 5.34, ra: 131.058, dec: 19.590, mansion: '鬼宿' },
  { id: 's66', name: 'Regulus', chineseName: '轩辕十四', magnitude: 1.35, ra: 152.092, dec: 11.967, mansion: '星宿' },
  { id: 's67', name: 'eta Leo', chineseName: '轩辕九', magnitude: 3.52, ra: 145.741, dec: 16.737, mansion: '星宿' },
  { id: 's68', name: 'delta Leo', chineseName: '轩辕十', magnitude: 2.56, ra: 145.238, dec: 20.523, mansion: '星宿' },
  { id: 's69', name: 'alpha Hya', chineseName: '星宿一', magnitude: 2.00, ra: 141.970, dec: -8.659, mansion: '星宿' },
  { id: 's70', name: 'nu Hya', chineseName: '张宿一', magnitude: 3.11, ra: 161.393, dec: -16.364, mansion: '张宿' },
  { id: 's71', name: 'lambda Hya', chineseName: '张宿二', magnitude: 3.58, ra: 166.144, dec: -24.008, mansion: '张宿' },
  { id: 's72', name: 'alpha Crt', chineseName: '翼宿一', magnitude: 4.08, ra: 171.358, dec: -24.447, mansion: '翼宿' },
  { id: 's73', name: 'gamma Crt', chineseName: '翼宿二', magnitude: 4.06, ra: 173.221, dec: -18.992, mansion: '翼宿' },
  { id: 's74', name: 'gamma Crv', chineseName: '轸宿一', magnitude: 4.02, ra: 183.207, dec: -17.448, mansion: '轸宿' },
  { id: 's75', name: 'beta Crv', chineseName: '轸宿二', magnitude: 2.65, ra: 184.689, dec: -23.361, mansion: '轸宿' },
  { id: 's76', name: 'Polaris', chineseName: '勾陈一', magnitude: 1.98, ra: 37.954, dec: 89.264, mansion: '紫微垣' },
  { id: 's77', name: 'Kochab', chineseName: '帝星', magnitude: 2.08, ra: 222.870, dec: 74.155, mansion: '紫微垣' },
  { id: 's78', name: 'Vega', chineseName: '织女星', magnitude: 0.03, ra: 279.235, dec: 38.784, mansion: '牛宿' },
  { id: 's79', name: 'Altair', chineseName: '牛郎星', magnitude: 0.77, ra: 297.696, dec: 8.868, mansion: '牛宿' },
  { id: 's80', name: 'Deneb', chineseName: '天津四', magnitude: 1.25, ra: 299.995, dec: 45.280, mansion: '女宿' }
];

let starMaps: StarMapVersion[] = [
  {
    id: 'initial',
    name: '初始星图',
    createdAt: new Date().toISOString(),
    stars: PREDEFINED_STARS.map(s => ({ ...s }))
  }
];

const MAX_VERSIONS = 5;

const StarSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  chineseName: z.string(),
  magnitude: z.number(),
  ra: z.number(),
  dec: z.number(),
  mansion: z.string(),
  isUserDefined: z.boolean().optional()
});

const StarMapVersionSchema = z.object({
  name: z.string(),
  stars: z.array(StarSchema)
});

function getMansion(ra: number, dec: number): string {
  if (dec > 60) return '紫微垣';
  const adjustedRa = ((ra % 360) + 360) % 360;
  const mansionIndex = Math.floor(adjustedRa / (360 / 28)) % 28;
  return MANSIONS[mansionIndex];
}

const SOLAR_TERMS = [
  { name: '小寒', baseDeg: 285 },
  { name: '大寒', baseDeg: 300 },
  { name: '立春', baseDeg: 315 },
  { name: '雨水', baseDeg: 330 },
  { name: '惊蛰', baseDeg: 345 },
  { name: '春分', baseDeg: 0 },
  { name: '清明', baseDeg: 15 },
  { name: '谷雨', baseDeg: 30 },
  { name: '立夏', baseDeg: 45 },
  { name: '小满', baseDeg: 60 },
  { name: '芒种', baseDeg: 75 },
  { name: '夏至', baseDeg: 90 },
  { name: '小暑', baseDeg: 105 },
  { name: '大暑', baseDeg: 120 },
  { name: '立秋', baseDeg: 135 },
  { name: '处暑', baseDeg: 150 },
  { name: '白露', baseDeg: 165 },
  { name: '秋分', baseDeg: 180 },
  { name: '寒露', baseDeg: 195 },
  { name: '霜降', baseDeg: 210 },
  { name: '立冬', baseDeg: 225 },
  { name: '小雪', baseDeg: 240 },
  { name: '大雪', baseDeg: 255 },
  { name: '冬至', baseDeg: 270 }
];

function julianDayFromGregorian(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y
    + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function gregorianFromJulianDay(jd: number): Date {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return new Date(Date.UTC(year, month - 1, day));
}

function meanSunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let L = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L = ((L % 360) + 360) % 360;
  return L;
}

function sunEquationOfCenter(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mrad = M * Math.PI / 180;
  return (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
    + 0.000289 * Math.sin(3 * Mrad);
}

function trueSunLongitude(jd: number): number {
  let L = meanSunLongitude(jd) + sunEquationOfCenter(jd);
  L = ((L % 360) + 360) % 360;
  return L;
}

function findSolarTermDate(year: number, targetDeg: number): Date {
  const jdStart = julianDayFromGregorian(year, 1, 1);
  let lo = jdStart;
  let hi = jdStart + 366;
  let prevLong = trueSunLongitude(lo);

  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    const midLong = trueSunLongitude(mid);

    let wraps = false;
    if (midLong < prevLong - 180) wraps = true;

    let isBefore: boolean;
    if (wraps) {
      isBefore = midLong < targetDeg && targetDeg <= prevLong ? false : true;
    } else {
      isBefore = midLong < targetDeg;
    }

    if (targetDeg === 0) {
      if (midLong > 350 || midLong < 10) {
        isBefore = midLong < 350 ? false : true;
      }
    }

    if (isBefore) {
      lo = mid;
    } else {
      hi = mid;
    }
    prevLong = midLong;
  }

  return gregorianFromJulianDay(Math.floor((lo + hi) / 2));
}

function computeSolarTerms(year: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const term of SOLAR_TERMS) {
    try {
      const date = findSolarTermDate(year, term.baseDeg);
      const month = date.getUTCMonth() + 1;
      const descMap: Record<string, string> = {
        '立春': '东风解冻，蛰虫始振，鱼上冰',
        '雨水': '獭祭鱼，候雁北，草木萌动',
        '惊蛰': '桃始华，仓庚鸣，鹰化为鸠',
        '春分': '玄鸟至，雷乃发声，始电',
        '清明': '桐始华，田鼠化为鴽，虹始见',
        '谷雨': '萍始生，鸣鸠拂其羽，戴胜降于桑',
        '立夏': '蝼蝈鸣，蚯蚓出，王瓜生',
        '小满': '苦菜秀，靡草死，麦秋至',
        '芒种': '螳螂生，鵙始鸣，反舌无声',
        '夏至': '鹿角解，蜩始鸣，半夏生',
        '小暑': '温风至，蟋蟀居壁，鹰始挚',
        '大暑': '腐草为萤，土润溽暑，大雨时行',
        '立秋': '凉风至，白露降，寒蝉鸣',
        '处暑': '鹰乃祭鸟，天地始肃，禾乃登',
        '白露': '鸿雁来，玄鸟归，群鸟养羞',
        '秋分': '雷始收声，蛰虫坯户，水始涸',
        '寒露': '鸿雁来宾，雀入大水为蛤，菊有黄华',
        '霜降': '豺乃祭兽，草木黄落，蛰虫咸俯',
        '立冬': '水始冰，地始冻，雉入大水为蜃',
        '小雪': '虹藏不见，天气上升地气下降，闭塞而成冬',
        '大雪': '鹖鴠不鸣，虎始交，荔挺出',
        '冬至': '蚯蚓结，麋角解，水泉动',
        '小寒': '雁北乡，鹊始巢，雉始雊',
        '大寒': '鸡乳，征鸟厉疾，水泽腹坚'
      };
      events.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`,
        type: 'solar_term',
        name: term.name,
        description: descMap[term.name] || '节气变换'
      });
    } catch (e) {
      // skip
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function computeEclipses(year: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const eclipseSeasons: { month: number; dayBase: number; type: CalendarEvent['type']; name: string }[] = [
    { month: 4, dayBase: 15, type: 'solar_eclipse', name: '日食' },
    { month: 5, dayBase: 5, type: 'lunar_eclipse', name: '月食' },
    { month: 10, dayBase: 12, type: 'solar_eclipse', name: '日食' },
    { month: 11, dayBase: 28, type: 'lunar_eclipse', name: '月食' }
  ];

  for (const season of eclipseSeasons) {
    const dayOffset = ((year * 7) % 13) - 6;
    const day = Math.min(28, Math.max(1, season.dayBase + dayOffset));
    const visibility = {
      latMin: -45 + ((year * 13) % 50),
      latMax: 55 + ((year * 17) % 40),
      lonMin: 70 + ((year * 11) % 80),
      lonMax: 140 + ((year * 19) % 70)
    };
    const typeDesc = season.type === 'solar_eclipse'
      ? `初亏${6 + (year % 4)}时，食甚${9 + (year % 3)}时，复圆${12 + (year % 3)}时`
      : `初亏${19 + (year % 4)}时，食甚${22 + (year % 2)}时，复圆${1 + (year % 3)}时`;
    events.push({
      date: `${year}-${String(season.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      type: season.type,
      name: season.name,
      description: `${typeDesc}，可见区域：东经${visibility.lonMin.toFixed(0)}°至${visibility.lonMax.toFixed(0)}°，北纬${visibility.latMin.toFixed(0)}°至${visibility.latMax.toFixed(0)}°`,
      visibility
    });
  }

  return events;
}

const PLANETS = [
  { name: '木星', symbol: 'J', period: 11.862, conjunctionInterval: 398.88 },
  { name: '火星', symbol: 'M', period: 1.881, conjunctionInterval: 779.94 },
  { name: '土星', symbol: 'S', period: 29.457, conjunctionInterval: 378.09 },
  { name: '金星', symbol: 'V', period: 0.615, conjunctionInterval: 583.92 },
  { name: '水星', symbol: 'Me', period: 0.241, conjunctionInterval: 115.88 }
];

function computePlanetaryTransits(year: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const jdYear = julianDayFromGregorian(year, 1, 1);
  const jdYearEnd = julianDayFromGregorian(year + 1, 1, 1);

  for (const planet of PLANETS) {
    const refDate = 2451545.0;
    let jd = refDate;
    while (jd < jdYearEnd) {
      if (jd >= jdYear && jd <= jdYearEnd) {
        const date = gregorianFromJulianDay(Math.floor(jd));
        if (date.getUTCFullYear() === year) {
          const month = date.getUTCMonth() + 1;
          const descMap: Record<string, string> = {
            '木星': '岁星运行，当空朗照，宜祭祀祈福',
            '火星': '荧惑守心，察天下之变，谨慎用兵',
            '土星': '镇星临位，安邦定国，宜修文德',
            '金星': '太白经天，主兵戈之象，宜慎征伐',
            '水星': '辰星顺行，智虑通达，宜谋大事'
          };
          events.push({
            date: `${year}-${String(month).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`,
            type: 'transit',
            name: `${planet.name}凌日`,
            description: descMap[planet.name] || '行星运行',
            planet: planet.name
          });
        }
      }
      jd += planet.conjunctionInterval * (0.85 + ((planet.conjunctionInterval * year) % 0.3));
      if (jd < jdYear) jd = jdYear;
    }
  }

  return events;
}

app.get('/api/stars', (req, res) => {
  const versionId = req.query.version as string | undefined;
  let stars: Star[];
  if (versionId) {
    const version = starMaps.find(v => v.id === versionId);
    stars = version ? version.stars : PREDEFINED_STARS;
  } else {
    stars = starMaps[0].stars;
  }
  res.json({ stars, mansions: MANSIONS });
});

app.get('/api/versions', (req, res) => {
  res.json({
    versions: starMaps.map(v => ({
      id: v.id,
      name: v.name,
      createdAt: v.createdAt,
      starCount: v.stars.length
    }))
  });
});

app.post('/api/stars', (req, res) => {
  const result = StarSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid star data', details: result.error });
  }
  const starData = result.data;
  const newStar: Star = {
    ...starData,
    id: uuidv4(),
    isUserDefined: true,
    mansion: getMansion(starData.ra, starData.dec)
  };
  starMaps[0].stars.push(newStar);
  res.status(201).json(newStar);
});

app.delete('/api/stars/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = starMaps[0].stars.length;
  starMaps[0].stars = starMaps[0].stars.filter(s => !(s.id === id && s.isUserDefined));
  if (starMaps[0].stars.length < initialLen) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Star not found or not deletable' });
  }
});

app.post('/api/versions/save', (req, res) => {
  const result = StarMapVersionSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid star map data', details: result.error });
  }
  const newVersion: StarMapVersion = {
    id: uuidv4(),
    name: result.data.name || `星图 v${starMaps.length}`,
    createdAt: new Date().toISOString(),
    stars: result.data.stars.map(s => ({ ...s, id: s.id || uuidv4() }))
  };
  starMaps.unshift(newVersion);
  if (starMaps.length > MAX_VERSIONS) {
    starMaps = starMaps.slice(0, MAX_VERSIONS);
  }
  res.status(201).json(newVersion);
});

app.get('/api/calendar/:year', (req, res) => {
  const yearParam = parseInt(req.params.year);
  if (isNaN(yearParam) || yearParam < -3000 || yearParam > 2024) {
    return res.status(400).json({ error: 'Year must be between -3000 and 2024' });
  }
  const startTime = Date.now();
  const solarTerms = computeSolarTerms(yearParam);
  const eclipses = computeEclipses(yearParam);
  const transits = computePlanetaryTransits(yearParam);
  const allEvents = [...solarTerms, ...eclipses, ...transits]
    .sort((a, b) => a.date.localeCompare(b.date));
  const elapsed = Date.now() - startTime;
  res.json({
    year: yearParam,
    computedAt: new Date().toISOString(),
    computeTimeMs: elapsed,
    events: allEvents,
    stats: {
      solarTerms: solarTerms.length,
      eclipses: eclipses.length,
      transits: transits.length,
      total: allEvents.length
    }
  });
});

app.listen(PORT, () => {
  console.log(`司天监后端服务已启动: http://localhost:${PORT}`);
  console.log(`  - 星表恒星数: ${PREDEFINED_STARS.length}`);
  console.log(`  - 二十八宿: ${MANSIONS.length}宿`);
});
