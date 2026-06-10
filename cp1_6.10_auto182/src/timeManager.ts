const PERIODS: string[] = [
  '子', '丑', '寅', '卯', '辰', '巳',
  '午', '未', '申', '酉', '戌', '亥'
];

const PERIOD_POEMS: Record<string, string> = {
  '子': '夜半钟声到客船',
  '丑': '鸡声茅店月',
  '寅': '平旦气方清',
  '卯': '日出而作',
  '辰': '晨光熹微',
  '巳': '日上正赤如丹',
  '午': '日中为市',
  '未': '日昃之离',
  '申': '哺时啜粥',
  '酉': '日落西山',
  '戌': '黄昏时分',
  '亥': '夜深人静'
};

const LUNAR_MONTHS: string[] = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'
];

const LUNAR_DAYS: string[] = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

const HEAVENLY_STEMS: string[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES: string[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const SOLAR_TERMS: string[] = [
  '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
  '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'
];

const TERM_DATES_APPROX: number[] = [
  4, 19, 5, 20, 4, 20,
  5, 21, 5, 21, 7, 23,
  7, 23, 7, 23, 8, 23,
  7, 22, 7, 22, 5, 20
];

type PeriodCallback = (period: string) => void;

const periodCallbacks: Set<PeriodCallback> = new Set();
let currentPeriod: string = '';
let tickerInterval: number | null = null;

export function getCurrentPeriod(): string {
  const now: Date = new Date();
  const hour: number = now.getHours();
  const minute: number = now.getMinutes();
  const totalMinutes: number = hour * 60 + minute;
  const adjustedMinutes: number = (totalMinutes + 60) % 1440;
  const periodIndex: number = Math.floor(adjustedMinutes / 120) % 12;
  return PERIODS[periodIndex];
}

export function getCurrentPoem(): string {
  return PERIOD_POEMS[getCurrentPeriod()] || '';
}

export function getPoemByPeriod(period: string): string {
  return PERIOD_POEMS[period] || '';
}

function getGanZhiYear(year: number): string {
  const stemIndex: number = (year - 4) % 10;
  const branchIndex: number = (year - 4) % 12;
  return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[branchIndex] + '年';
}

export function getLunarDate(): string {
  const now: Date = new Date();
  const year: number = now.getFullYear();
  const month: number = now.getMonth();
  const day: number = now.getDate();
  
  const ganZhi: string = getGanZhiYear(year);
  const lunarMonthIndex: number = month % 12;
  const lunarDayIndex: number = (day - 1) % 30;
  
  return ganZhi + LUNAR_MONTHS[lunarMonthIndex] + LUNAR_DAYS[lunarDayIndex];
}

export function getSolarTerm(): string {
  const now: Date = new Date();
  const month: number = now.getMonth();
  const day: number = now.getDate();
  
  const termIndexInMonth: number = day >= TERM_DATES_APPROX[month * 2 + 1] ? 1 : 0;
  const termIndex: number = month * 2 + termIndexInMonth;
  
  return SOLAR_TERMS[termIndex % 24];
}

export function onPeriodChange(callback: PeriodCallback): () => void {
  periodCallbacks.add(callback);
  return (): void => {
    periodCallbacks.delete(callback);
  };
}

function notifyPeriodChange(period: string): void {
  periodCallbacks.forEach((cb: PeriodCallback): void => {
    try {
      cb(period);
    } catch (e) {
      console.error('Period callback error:', e);
    }
  });
}

export function startTicker(): void {
  if (tickerInterval !== null) return;
  
  currentPeriod = getCurrentPeriod();
  
  const checkPeriod = (): void => {
    const newPeriod: string = getCurrentPeriod();
    if (newPeriod !== currentPeriod) {
      currentPeriod = newPeriod;
      notifyPeriodChange(newPeriod);
    }
  };
  
  tickerInterval = window.setInterval(checkPeriod, 10000);
}

export function stopTicker(): void {
  if (tickerInterval !== null) {
    clearInterval(tickerInterval);
    tickerInterval = null;
  }
}

export interface TimeInfo {
  period: string;
  lunarDate: string;
  solarTerm: string;
  poem: string;
}

export function getTimeInfo(): TimeInfo {
  return {
    period: getCurrentPeriod(),
    lunarDate: getLunarDate(),
    solarTerm: getSolarTerm(),
    poem: getCurrentPoem()
  };
}
