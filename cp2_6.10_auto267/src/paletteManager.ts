export interface PaletteColor {
  name: string;
  hex: string;
}

export interface LogEntry {
  member: string;
  memberColor: string;
  action: string;
  timestamp: number;
}

export interface Member {
  name: string;
  color: string;
}

const MAX_COLORS = 32;
const MAX_LOGS = 10;

const MEMBERS: Member[] = [
  { name: '红色', color: '#ef4444' },
  { name: '绿色', color: '#22c55e' },
  { name: '蓝色', color: '#3b82f6' }
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16)
  };
}

function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

function normalizeHex(hex: string): string {
  if (hex.startsWith('#')) {
    return hex.toLowerCase();
  }
  return `#${hex.toLowerCase()}`;
}

export class PaletteManager {
  private colors: PaletteColor[] = [];
  private logs: LogEntry[] = [];
  private customCounter: number = 0;
  private listeners: Set<() => void> = new Set();
  private logListeners: Set<() => void> = new Set();

  constructor() {
    this.initDefaultPalette();
  }

  private initDefaultPalette(): void {
    const defaults: PaletteColor[] = [
      { name: '火焰红', hex: '#ff6b6b' },
      { name: '向日葵', hex: '#ffd93d' },
      { name: '薄荷绿', hex: '#6bcb77' },
      { name: '天空蓝', hex: '#4d96ff' },
      { name: '葡萄紫', hex: '#9b59b6' },
      { name: '暖橙', hex: '#ff9f43' },
      { name: '樱花粉', hex: '#ff85a1' },
      { name: '深灰', hex: '#576574' }
    ];
    this.colors = [...defaults];
    this.customCounter = this.colors.length + 1;
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribeLogs(callback: () => void): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }

  private notifyLogs(): void {
    this.logListeners.forEach(cb => cb());
  }

  getColors(): PaletteColor[] {
    return [...this.colors];
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getMembers(): Member[] {
    return [...MEMBERS];
  }

  getMaxColors(): number {
    return MAX_COLORS;
  }

  isFull(): boolean {
    return this.colors.length >= MAX_COLORS;
  }

  addColor(hex: string): boolean {
    if (this.isFull()) {
      return false;
    }
    const normalizedHex = normalizeHex(hex);
    if (!isValidHex(normalizedHex)) {
      return false;
    }
    const name = `自定义色${this.customCounter++}`;
    this.colors.push({ name, hex: normalizedHex });
    this.addLog('添加了', normalizedHex, name);
    this.notify();
    return true;
  }

  removeColor(index: number): boolean {
    if (index < 0 || index >= this.colors.length) {
      return false;
    }
    const removed = this.colors.splice(index, 1)[0];
    this.addLog('删除了', removed.hex, removed.name);
    this.notify();
    return true;
  }

  updateColorName(index: number, newName: string): boolean {
    if (index < 0 || index >= this.colors.length) {
      return false;
    }
    const trimmedName = newName.trim();
    if (!trimmedName) {
      return false;
    }
    const oldColor = this.colors[index];
    this.colors[index] = { ...oldColor, name: trimmedName };
    this.addLog('重命名了', oldColor.hex, trimmedName);
    this.notify();
    return true;
  }

  updateColorHex(index: number, newHex: string): boolean {
    if (index < 0 || index >= this.colors.length) {
      return false;
    }
    const normalizedHex = normalizeHex(newHex);
    if (!isValidHex(normalizedHex)) {
      return false;
    }
    const oldColor = this.colors[index];
    this.colors[index] = { ...oldColor, hex: normalizedHex };
    this.addLog('修改了', normalizedHex, oldColor.name);
    this.notify();
    return true;
  }

  moveColor(fromIndex: number, toIndex: number): boolean {
    if (
      fromIndex < 0 ||
      fromIndex >= this.colors.length ||
      toIndex < 0 ||
      toIndex >= this.colors.length ||
      fromIndex === toIndex
    ) {
      return false;
    }
    const [moved] = this.colors.splice(fromIndex, 1);
    this.colors.splice(toIndex, 0, moved);
    this.addLog('调整了顺序', moved.hex, moved.name);
    this.notify();
    return true;
  }

  findClosestColor(targetHex: string): PaletteColor | null {
    if (this.colors.length === 0) {
      return null;
    }
    let closest = this.colors[0];
    let minDist = colorDistance(targetHex, closest.hex);
    for (let i = 1; i < this.colors.length; i++) {
      const dist = colorDistance(targetHex, this.colors[i].hex);
      if (dist < minDist) {
        minDist = dist;
        closest = this.colors[i];
      }
    }
    return closest;
  }

  findClosestColorIndex(targetHex: string): number {
    if (this.colors.length === 0) {
      return -1;
    }
    let closestIndex = 0;
    let minDist = colorDistance(targetHex, this.colors[0].hex);
    for (let i = 1; i < this.colors.length; i++) {
      const dist = colorDistance(targetHex, this.colors[i].hex);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }
    return closestIndex;
  }

  exportToJson(): string {
    const data = this.colors.map(c => ({ name: c.name, hex: c.hex }));
    return JSON.stringify(data, null, 2);
  }

  importFromJson(jsonStr: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        return { success: false, error: '色板数据必须是数组格式' };
      }
      if (parsed.length > MAX_COLORS) {
        return { success: false, error: `色板最多容纳${MAX_COLORS}种颜色` };
      }
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (
          typeof item !== 'object' ||
          item === null ||
          typeof item.name !== 'string' ||
          typeof item.hex !== 'string' ||
          !isValidHex(normalizeHex(item.hex))
        ) {
          return {
            success: false,
            error: `第${i + 1}项格式错误，必须包含合法的 name 和 hex 字段`
          };
        }
      }
      const newColors: PaletteColor[] = parsed.map((item: { name: string; hex: string }) => ({
        name: item.name,
        hex: normalizeHex(item.hex)
      }));
      this.colors = newColors;
      this.customCounter = Math.max(this.customCounter, this.colors.length + 1);
      this.addSimpleLog('导入了新色板');
      this.notify();
      return { success: true };
    } catch (e) {
      return { success: false, error: 'JSON 解析失败' };
    }
  }

  private addLog(action: string, hex: string, colorName: string): void {
    const member = MEMBERS[Math.floor(Math.random() * MEMBERS.length)];
    this.logs.unshift({
      member: member.name,
      memberColor: member.color,
      action: `${member.name} ${action} ${hex} ${colorName}`,
      timestamp: Date.now()
    });
    if (this.logs.length > MAX_LOGS) {
      this.logs.pop();
    }
    this.notifyLogs();
  }

  private addSimpleLog(action: string): void {
    const member = MEMBERS[Math.floor(Math.random() * MEMBERS.length)];
    this.logs.unshift({
      member: member.name,
      memberColor: member.color,
      action: `${member.name} ${action}`,
      timestamp: Date.now()
    });
    if (this.logs.length > MAX_LOGS) {
      this.logs.pop();
    }
    this.notifyLogs();
  }
}
