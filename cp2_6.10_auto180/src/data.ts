export type Origin = '埃塞俄比亚' | '哥伦比亚' | '巴西' | '哥斯达黎加' | '肯尼亚';

export interface Flavors {
  acidity: number;
  bitterness: number;
  sweetness: number;
  body: number;
  aftertaste: number;
}

export interface CoffeeRecord {
  id: string;
  name: string;
  origin: Origin;
  roastDate: string;
  brewTemp: number;
  ratio: string;
  flavors: Flavors;
  overallScore: number;
  notes: string;
}

export const ORIGIN_COLORS: Record<Origin, string> = {
  '埃塞俄比亚': '#d4a373',
  '哥伦比亚': '#90a955',
  '巴西': '#7b2cbf',
  '哥斯达黎加': '#e29578',
  '肯尼亚': '#006d77'
};

export const ORIGIN_LIST: Origin[] = ['埃塞俄比亚', '哥伦比亚', '巴西', '哥斯达黎加', '肯尼亚'];

export const FLAVOR_LABELS = ['酸度', '苦度', '甜度', '醇厚度', '余韵'];

export function getScoreColor(score: number): string {
  if (score < 5) return '#e63946';
  if (score <= 7.5) return '#f4a261';
  return '#2a9d8f';
}

export type TastingStatus = '巅峰期' | '良好期' | '已过最佳期';

export function getTastingStatus(daysSinceRoast: number): { label: TastingStatus; bgColor: string } {
  if (daysSinceRoast <= 7) return { label: '巅峰期', bgColor: '#2a9d8f' };
  if (daysSinceRoast <= 21) return { label: '良好期', bgColor: '#e9c46a' };
  return { label: '已过最佳期', bgColor: '#e76f51' };
}

export function getDaysSinceRoast(roastDateStr: string): number {
  const today = new Date();
  const roast = new Date(roastDateStr);
  const diff = today.getTime() - roast.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function getBrewTip(flavors: Flavors): string {
  const tips: string[] = [];
  if (flavors.acidity > 7) {
    tips.push('风味较酸，建议使用较低水温（88-90°C）突出花果香气');
  }
  if (flavors.bitterness > 7) {
    tips.push('苦味偏重，建议使用较高粉水比（1:16-1:18）减少苦涩感');
  }
  if (flavors.sweetness > 7) {
    tips.push('甜度突出，推荐手冲法分段注水，充分释放甜感');
  }
  if (flavors.body > 7) {
    tips.push('醇厚度饱满，适合法压壶或意式浓缩萃取');
  }
  if (flavors.aftertaste > 7) {
    tips.push('余韵悠长，建议慢冲延长萃取时间，层次更丰富');
  }
  if (tips.length === 0) {
    tips.push('风味均衡，推荐标准手冲参数：水温92°C，粉水比1:15');
  }
  return tips.join('；') + '。';
}

export function generateMockData(): CoffeeRecord[] {
  const today = new Date();
  const d = (offset: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    return date.toISOString().slice(0, 10);
  };

  return [
    {
      id: '1',
      name: '耶加雪菲 水洗',
      origin: '埃塞俄比亚',
      roastDate: d(3),
      brewTemp: 90,
      ratio: '1:15',
      flavors: { acidity: 8.5, bitterness: 3.0, sweetness: 7.5, body: 5.5, aftertaste: 8.0 },
      overallScore: 8.6,
      notes: '茉莉花香明显，柠檬和柑橘酸质明亮，回甘持久'
    },
    {
      id: '2',
      name: '慧兰 粉波旁',
      origin: '哥伦比亚',
      roastDate: d(10),
      brewTemp: 92,
      ratio: '1:16',
      flavors: { acidity: 6.5, bitterness: 4.5, sweetness: 8.0, body: 7.0, aftertaste: 7.5 },
      overallScore: 8.2,
      notes: '焦糖和巧克力甜感，温和水果酸，口感圆润'
    },
    {
      id: '3',
      name: '喜拉多 半日晒',
      origin: '巴西',
      roastDate: d(25),
      brewTemp: 94,
      ratio: '1:14',
      flavors: { acidity: 4.0, bitterness: 6.5, sweetness: 6.0, body: 8.5, aftertaste: 5.5 },
      overallScore: 6.8,
      notes: '坚果和可可风味，醇厚度高，适合做意式基底'
    },
    {
      id: '4',
      name: '塔拉珠 蜜处理',
      origin: '哥斯达黎加',
      roastDate: d(5),
      brewTemp: 91,
      ratio: '1:15',
      flavors: { acidity: 7.5, bitterness: 3.5, sweetness: 8.5, body: 6.0, aftertaste: 7.0 },
      overallScore: 8.4,
      notes: '蜂蜜和红糖甜感，橙子酸质柔和，干净度高'
    },
    {
      id: '5',
      name: '涅里 AA 水洗',
      origin: '肯尼亚',
      roastDate: d(8),
      brewTemp: 90,
      ratio: '1:16',
      flavors: { acidity: 9.0, bitterness: 4.0, sweetness: 7.0, body: 6.5, aftertaste: 8.5 },
      overallScore: 8.8,
      notes: '黑醋栗和番茄酸，复杂多汁，余韵悠长'
    },
    {
      id: '6',
      name: '西达摩 日晒',
      origin: '埃塞俄比亚',
      roastDate: d(15),
      brewTemp: 92,
      ratio: '1:15',
      flavors: { acidity: 7.0, bitterness: 4.5, sweetness: 9.0, body: 6.0, aftertaste: 7.5 },
      overallScore: 8.0,
      notes: '蓝莓和草莓发酵果香，甜感爆炸，口感顺滑'
    }
  ];
}

export function flavorsToArray(flavors: Flavors): number[] {
  return [flavors.acidity, flavors.bitterness, flavors.sweetness, flavors.body, flavors.aftertaste];
}
