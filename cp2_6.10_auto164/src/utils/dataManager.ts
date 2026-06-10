import { CoffeeItem, FilterType, Season } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'coffee-menu-data';

export function loadFromStorage(): CoffeeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as CoffeeItem[];
      }
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return generateDefaultData();
}

export function saveToStorage(items: CoffeeItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function filterBySeason(items: CoffeeItem[], filter: FilterType): CoffeeItem[] {
  if (filter === 'all') return items;
  return items.filter((item) => item.season === filter);
}

export function calculateFloatingPrice(basePrice: number, percentage: number): number {
  const multiplier = 1 + percentage / 100;
  return Math.round(basePrice * multiplier * 100) / 100;
}

export function generateShareLink(items: CoffeeItem[]): string {
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(items)))));
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#menu=${encoded}`;
}

export function parseShareLink(): CoffeeItem[] | null {
  const hash = window.location.hash;
  const match = hash.match(/#menu=(.+)/);
  if (match && match[1]) {
    try {
      const decoded = decodeURIComponent(escape(atob(decodeURIComponent(match[1]))));
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) {
        return parsed as CoffeeItem[];
      }
    } catch (e) {
      console.error('Failed to parse share link:', e);
    }
  }
  return null;
}

export function generateDefaultData(): CoffeeItem[] {
  const data: CoffeeItem[] = [
    {
      id: uuidv4(),
      name: '樱花燕麦拿铁',
      ingredients: ['浓缩咖啡', '燕麦奶', '樱花糖浆', '樱花花瓣'],
      price: 32,
      pairedSnack: '蔓越莓司康',
      description: '春日限定，柔和的樱花香气与燕麦奶的醇厚完美融合，点缀新鲜樱花花瓣，带来清新的春日体验。',
      season: 'spring',
    },
    {
      id: uuidv4(),
      name: '抹茶草莓拿铁',
      ingredients: ['抹茶粉', '牛奶', '草莓酱', '鲜草莓'],
      price: 35,
      pairedSnack: '抹茶曲奇',
      description: '春季新品，宇治抹茶与新鲜草莓的甜蜜碰撞，层次丰富，色彩粉嫩。',
      season: 'spring',
    },
    {
      id: uuidv4(),
      name: '蜂蜜柚子美式',
      ingredients: ['浓缩咖啡', '柚子茶', '蜂蜜', '气泡水'],
      price: 28,
      pairedSnack: '水果塔',
      description: '柚子的清香与咖啡的微苦相互衬托，蜂蜜调和口感，是春季消暑的绝佳选择。',
      season: 'spring',
    },
    {
      id: uuidv4(),
      name: '冰橙香美式',
      ingredients: ['浓缩咖啡', '鲜橙汁', '橙皮', '冰块'],
      price: 30,
      pairedSnack: '杏仁可颂',
      description: '夏日必备，鲜橙的酸甜唤醒味蕾，冰凉的美式咖啡带来清爽的冲击。',
      season: 'summer',
    },
    {
      id: uuidv4(),
      name: '椰香冰拿铁',
      ingredients: ['浓缩咖啡', '椰奶', '椰浆', '椰片'],
      price: 33,
      pairedSnack: '焦糖布丁',
      description: '浓郁椰香与丝滑拿铁的热带风情，撒上烤椰片，仿佛置身海岛。',
      season: 'summer',
    },
    {
      id: uuidv4(),
      name: '柠檬气泡冷萃',
      ingredients: ['冷萃咖啡', '柠檬汁', '气泡水', '柠檬片'],
      price: 31,
      pairedSnack: '提拉米苏',
      description: '12小时低温冷萃搭配清新柠檬和气泡，清爽解暑，夏日续命神器。',
      season: 'summer',
    },
    {
      id: uuidv4(),
      name: '焦糖肉桂拿铁',
      ingredients: ['浓缩咖啡', '牛奶', '焦糖酱', '肉桂粉'],
      price: 29,
      pairedSnack: '蓝莓芝士蛋糕',
      description: '秋日暖饮，焦糖的甜蜜与肉桂的温暖香料气息，是秋天的味道。',
      season: 'autumn',
    },
    {
      id: uuidv4(),
      name: '栗子蒙布朗拿铁',
      ingredients: ['浓缩咖啡', '牛奶', '栗子酱', '栗子碎'],
      price: 36,
      pairedSnack: '巧克力熔岩蛋糕',
      description: '秋季限定，香甜栗泥与浓缩咖啡的完美结合，顶部点缀栗子碎，口感丰富。',
      season: 'autumn',
    },
    {
      id: uuidv4(),
      name: '南瓜香料拿铁',
      ingredients: ['浓缩咖啡', '牛奶', '南瓜酱', '南瓜香料'],
      price: 34,
      pairedSnack: '蔓越莓司康',
      description: '秋日经典，南瓜的绵密香甜搭配温暖香料，带来满满的秋日仪式感。',
      season: 'autumn',
    },
    {
      id: uuidv4(),
      name: '姜饼风味拿铁',
      ingredients: ['浓缩咖啡', '牛奶', '姜饼糖浆', '姜饼碎'],
      price: 32,
      pairedSnack: '提拉米苏',
      description: '冬日暖心，姜饼的温暖香料与咖啡完美融合，顶部姜饼碎增添节日氛围。',
      season: 'winter',
    },
    {
      id: uuidv4(),
      name: '热可可摩卡',
      ingredients: ['浓缩咖啡', '牛奶', '黑巧克力', '棉花糖'],
      price: 35,
      pairedSnack: '巧克力熔岩蛋糕',
      description: '浓醇黑巧克力与意式浓缩的双重奏，顶部棉花糖融化在热饮中，甜蜜温暖。',
      season: 'winter',
    },
    {
      id: uuidv4(),
      name: '薄荷白巧克力拿铁',
      ingredients: ['浓缩咖啡', '牛奶', '白巧克力', '薄荷糖浆'],
      price: 33,
      pairedSnack: '蓝莓芝士蛋糕',
      description: '冬季限定，清新薄荷与丝滑白巧克力的奇妙组合，带来清凉又温暖的独特体验。',
      season: 'winter',
    },
  ];
  return data;
}
