import type { Spice, CargoItem, LogEntry, LogType } from '@/types/index';

export const INITIAL_SPICES: Spice[] = [
  { id: 'cinnamon', name: '肉桂', basePrice: 50, quality: 'A', perishIndex: 3, icon: '🌿' },
  { id: 'pepper', name: '胡椒', basePrice: 30, quality: 'B', perishIndex: 2, icon: '🌶️' },
  { id: 'cloves', name: '丁香', basePrice: 80, quality: 'A', perishIndex: 4, icon: '🌸' },
  { id: 'nutmeg', name: '肉豆蔻', basePrice: 70, quality: 'B', perishIndex: 5, icon: '🥜' },
  { id: 'saffron', name: '藏红花', basePrice: 150, quality: 'A', perishIndex: 6, icon: '🌼' },
];

export function calculateCargoTotal(cargo: CargoItem[]): number {
  return cargo.reduce((sum, item) => sum + item.quantity, 0);
}

export function calculateCargoCost(cargo: CargoItem[]): number {
  return cargo.reduce((sum, item) => sum + item.quantity * item.buyPrice, 0);
}

export function createLogEntry(
  round: number,
  type: LogType,
  message: string
): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    round,
    timestamp: Date.now(),
    type,
    message,
  };
}

export function getSpiceById(spices: Spice[], id: string): Spice | undefined {
  return spices.find((s) => s.id === id);
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN')}`;
}

export function getGameRating(
  totalProfit: number,
  successfulTrades: number,
  voyageCount: number
): { level: string; title: string; icon: string } {
  const successRate = voyageCount > 0 ? successfulTrades / voyageCount : 0;
  const score = totalProfit + successfulTrades * 500;

  if (score >= 50000 && successRate >= 0.9) {
    return { level: 'S', title: '香料王', icon: '👑' };
  }
  if (score >= 30000 && successRate >= 0.8) {
    return { level: 'A', title: '大商贾', icon: '🏆' };
  }
  if (score >= 15000 && successRate >= 0.7) {
    return { level: 'B', title: '富商', icon: '💰' };
  }
  if (score >= 5000 && successRate >= 0.6) {
    return { level: 'C', title: '行商', icon: '📦' };
  }
  return { level: 'D', title: '铜商', icon: '⚖️' };
}
