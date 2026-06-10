export interface Wish {
  id: string;
  text: string;
  color: string;
  coinType: 'gold' | 'silver' | 'rainbow';
  createdAt: number;
  illuminateCount: number;
}

export const COIN_TYPES = ['gold', 'silver', 'rainbow'] as const;
export type CoinType = typeof COIN_TYPES[number];

export const STAR_COLORS = [
  '#ff88aa',
  '#88ffaa',
  '#88aaff',
  '#ffcc88',
  '#ff88cc',
  '#aaffaa',
  '#aa88ff',
  '#ffee88',
];

let wishes: Wish[] = [
  {
    id: '1',
    text: '希望家人平安健康，每一天都充满阳光和欢笑。',
    color: '#ff88aa',
    coinType: 'gold',
    createdAt: Date.now() - 3600000,
    illuminateCount: 12,
  },
  {
    id: '2',
    text: '愿世界和平，没有战争和饥饿，每个孩子都能快乐成长。',
    color: '#88aaff',
    coinType: 'silver',
    createdAt: Date.now() - 7200000,
    illuminateCount: 28,
  },
  {
    id: '3',
    text: '希望自己的努力能得到回报，事业更上一层楼。',
    color: '#ffcc88',
    coinType: 'rainbow',
    createdAt: Date.now() - 1800000,
    illuminateCount: 5,
  },
  {
    id: '4',
    text: '愿所有流浪的小动物都能找到温暖的家。',
    color: '#88ffaa',
    coinType: 'gold',
    createdAt: Date.now() - 5400000,
    illuminateCount: 19,
  },
  {
    id: '5',
    text: '希望能和喜欢的人一起看遍世间美景。',
    color: '#ff88cc',
    coinType: 'rainbow',
    createdAt: Date.now() - 900000,
    illuminateCount: 7,
  },
];

let nextId = 6;

export function getAllWishes(): Wish[] {
  return [...wishes];
}

export function getWishesSortedByLatest(): Wish[] {
  return [...wishes].sort((a, b) => b.createdAt - a.createdAt);
}

export function getWishesSortedByPopular(): Wish[] {
  return [...wishes].sort((a, b) => b.illuminateCount - a.illuminateCount);
}

export function addWish(data: Omit<Wish, 'id' | 'createdAt' | 'illuminateCount'>): Wish {
  const wish: Wish = {
    ...data,
    id: String(nextId++),
    createdAt: Date.now(),
    illuminateCount: 0,
  };
  wishes.unshift(wish);
  return wish;
}

export function illuminateWish(id: string): Wish | null {
  const wish = wishes.find((w) => w.id === id);
  if (wish) {
    wish.illuminateCount++;
    return wish;
  }
  return null;
}
