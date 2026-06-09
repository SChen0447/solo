import type { MenuItem, Category, OrderHistory, MenuItemWithHistory } from './types';

const categories: Category[] = ['咖啡', '甜点', '轻食', '特调'];

const baseMenuItems: Omit<MenuItem, 'waitTime'>[] = [
  { id: 'c1', name: '美式咖啡', category: '咖啡', price: 28, description: '经典美式，醇厚香浓' },
  { id: 'c2', name: '拿铁', category: '咖啡', price: 32, description: '丝滑牛奶与浓缩的完美融合' },
  { id: 'c3', name: '卡布奇诺', category: '咖啡', price: 32, description: '绵密奶泡，意式经典' },
  { id: 'c4', name: '手冲瑰夏', category: '咖啡', price: 48, description: '埃塞俄比亚精品豆，花香果香' },
  { id: 'd1', name: '提拉米苏', category: '甜点', price: 38, description: '意式经典，浓郁咖啡香' },
  { id: 'd2', name: '巴斯克蛋糕', category: '甜点', price: 36, description: '焦糖外皮，绵密内里' },
  { id: 'd3', name: '可颂', category: '甜点', price: 22, description: '法式经典，层层酥脆' },
  { id: 'd4', name: '蓝莓芝士', category: '甜点', price: 42, description: '浓郁芝士搭配新鲜蓝莓' },
  { id: 'l1', name: '牛油果吐司', category: '轻食', price: 45, description: '新鲜牛油果配全麦吐司' },
  { id: 'l2', name: '鸡胸肉沙拉', category: '轻食', price: 48, description: '低脂高蛋白，健康美味' },
  { id: 'l3', name: '牛肉帕尼尼', category: '轻食', price: 52, description: '意式三明治，芝士拉丝' },
  { id: 'l4', name: '番茄意面', category: '轻食', price: 46, description: '经典番茄肉酱意面' },
  { id: 's1', name: '荔枝气泡美式', category: '特调', price: 38, description: '清甜荔枝搭配咖啡' },
  { id: 's2', name: '桂花燕麦拿铁', category: '特调', price: 42, description: '秋日限定，桂花飘香' },
  { id: 's3', name: '莓果冰沙', category: '特调', price: 36, description: '混合莓果，冰爽解暑' },
  { id: 's4', name: '椰香冷萃', category: '特调', price: 40, description: '椰香浓郁，夏日特调' },
];

function generateHourlyHistory(): OrderHistory[] {
  const hours: OrderHistory[] = [];
  for (let h = 0; h < 24; h++) {
    let baseOrders = 5;
    if (h >= 8 && h <= 10) baseOrders = 35 + Math.random() * 25;
    else if (h >= 11 && h <= 14) baseOrders = 25 + Math.random() * 20;
    else if (h >= 15 && h <= 18) baseOrders = 30 + Math.random() * 20;
    else if (h >= 19 && h <= 21) baseOrders = 15 + Math.random() * 15;
    else if (h < 7 || h > 22) baseOrders = Math.random() * 8;
    else baseOrders = 10 + Math.random() * 15;
    hours.push({
      hour: `${h.toString().padStart(2, '0')}:00`,
      orders: Math.floor(baseOrders),
    });
  }
  return hours;
}

export function generateInitialMenu(): MenuItemWithHistory[] {
  return baseMenuItems.map((item) => ({
    ...item,
    waitTime: Math.floor(Math.random() * 20) + 3,
    orderHistory: generateHourlyHistory(),
  }));
}

type UpdateCallback = (items: MenuItemWithHistory[]) => void;

class MockDataService {
  private items: MenuItemWithHistory[];
  private listeners: Set<UpdateCallback>;
  private intervalId: ReturnType<typeof setInterval> | null;

  constructor() {
    this.items = generateInitialMenu();
    this.listeners = new Set();
    this.intervalId = null;
  }

  getMenu(): MenuItemWithHistory[] {
    return this.items;
  }

  subscribe(callback: UpdateCallback): () => void {
    this.listeners.add(callback);
    this.startUpdates();
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.stopUpdates();
      }
    };
  }

  private startUpdates(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.updateWaitTimes();
    }, 5000);
  }

  private stopUpdates(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private updateWaitTimes(): void {
    this.items = this.items.map((item) => {
      const change = Math.floor(Math.random() * 7) - 3;
      const newWait = Math.max(1, Math.min(30, item.waitTime + change));
      return { ...item, waitTime: newWait };
    });
    this.listeners.forEach((cb) => cb([...this.items]));
  }
}

export const mockDataService = new MockDataService();

export { categories };
