export interface ClimatePoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface YearlyData {
  year: number;
  temperature: number[];
  precipitation: number[];
}

export interface ClimateDataset {
  points: ClimatePoint[];
  yearly: YearlyData[];
}

export type DatasetType = 'temperature' | 'precipitation';

const CITY_NAMES = [
  '北京', '上海', '广州', '深圳', '成都', '武汉', '西安', '南京',
  '东京', '首尔', '新加坡', '曼谷', '孟买', '迪拜', '莫斯科',
  '伦敦', '巴黎', '柏林', '罗马', '马德里', '阿姆斯特丹',
  '纽约', '洛杉矶', '芝加哥', '多伦多', '温哥华', '墨西哥城',
  '圣保罗', '里约热内卢', '布宜诺斯艾利斯', '利马', '波哥大',
  '开罗', '开普敦', '拉各斯', '内罗毕', '卡萨布兰卡',
  '悉尼', '墨尔本', '奥克兰', '惠灵顿',
  '雷克雅未克', '奥斯陆', '斯德哥尔摩', '赫尔辛基',
  '伊斯坦布尔', '雅典', '开罗', '约翰内斯堡',
  '马尼拉', '雅加达', '吉隆坡', '胡志明市',
  '德黑兰', '利雅得', '安卡拉', '伊斯兰堡',
  '拉巴斯', '加拉加斯', '基多', '亚松森',
  '蒙罗维亚', '阿克拉', '阿比让', '喀土穆',
  '达喀尔', '阿尔及尔', '突尼斯', '的黎波里',
  '安曼', '贝鲁特', '大马士革', '耶路撒冷',
  '河内', '金边', '仰光', '加德满都',
  '科伦坡', '达卡', '卡拉奇', '拉合尔',
  '塔什干', '阿拉木图', '比什凯克', '阿什哈巴德',
  '乌兰巴托', '平壤', '万象', '帝力',
  '苏瓦', '努美阿', '帕皮提', '莫尔兹比港',
  '的里雅斯特', '马赛', '里昂', '巴塞罗那',
  '慕尼黑', '维也纳', '布拉格', '华沙',
  '布达佩斯', '贝尔格莱德', '索非亚', '布加勒斯特',
  '明斯克', '基辅', '里加', '塔林',
  '维尔纽斯', '萨格勒布', '卢布尔雅那', '地拉那',
  '斯科普里', '萨拉热窝', '波德戈里察', '普里什蒂纳',
  '基希讷乌', '第比利斯', '埃里温', '巴库',
  '阿斯马拉', '吉布提', '摩加迪沙', '马普托',
  '温得和克', '哈博罗内', '马塞卢', '姆巴巴内',
  '利隆圭', '卢萨卡', '哈拉雷', '多多马'
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateClimatePoints(): ClimatePoint[] {
  const points: ClimatePoint[] = [];
  const rand = seededRandom(42);
  let cityIndex = 0;

  for (let lat = -60; lat <= 70; lat += 15) {
    for (let lng = -170; lng <= 170; lng += 25) {
      const latOffset = (rand() - 0.5) * 10;
      const lngOffset = (rand() - 0.5) * 15;
      points.push({
        lat: Math.max(-85, Math.min(85, lat + latOffset)),
        lng: lng + lngOffset,
        name: cityIndex < CITY_NAMES.length ? CITY_NAMES[cityIndex++] : undefined
      });
    }
  }

  return points;
}

function getBaseTemperature(lat: number): number {
  const absLat = Math.abs(lat);
  if (absLat < 20) return 28 + (Math.random() - 0.5) * 6;
  if (absLat < 40) return 20 + (Math.random() - 0.5) * 10;
  if (absLat < 60) return 8 + (Math.random() - 0.5) * 10;
  return -10 + (Math.random() - 0.5) * 10;
}

function getBasePrecipitation(lat: number, lng: number): number {
  const absLat = Math.abs(lat);
  let base: number;
  if (absLat < 15) base = 200 + Math.sin(lng * 0.05) * 80;
  else if (absLat < 35) base = 80 + Math.sin(lng * 0.03) * 50;
  else if (absLat < 55) base = 100 + Math.cos(lng * 0.04) * 40;
  else base = 40 + Math.random() * 30;
  return Math.max(5, Math.min(450, base));
}

function generateYearlyData(points: ClimatePoint[]): YearlyData[] {
  const yearly: YearlyData[] = [];
  const rand = seededRandom(12345);

  for (let year = 2000; year <= 2020; year++) {
    const temperature: number[] = [];
    const precipitation: number[] = [];
    const yearOffset = (year - 2000) * 0.15;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const baseTemp = getBaseTemperature(p.lat);
      const tempVariation = (rand() - 0.5) * 4;
      temperature.push(Math.round((baseTemp + yearOffset + tempVariation) * 100) / 100);

      const basePrec = getBasePrecipitation(p.lat, p.lng);
      const precVariation = (rand() - 0.5) * 40;
      const precYearFactor = 1 + (year - 2000) * 0.008;
      precipitation.push(Math.round(Math.max(5, Math.min(450, basePrec * precYearFactor + precVariation)) * 100) / 100);
    }

    yearly.push({ year, temperature, precipitation });
  }

  return yearly;
}

export const climateDataset: ClimateDataset = (() => {
  const points = generateClimatePoints();
  const yearly = generateYearlyData(points);
  return { points, yearly };
})();

export function getValueRange(dataset: DatasetType): { min: number; max: number } {
  if (dataset === 'temperature') {
    return { min: -30, max: 50 };
  }
  return { min: 0, max: 500 };
}

export function getYearIndex(year: number): number {
  return Math.max(0, Math.min(20, year - 2000));
}
