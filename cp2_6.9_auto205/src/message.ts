import type { OceanCurrent } from './storm';

export interface Bottle {
  id: string;
  x: number;
  y: number;
  rotation: number;
  floatPhase: number;
  state: 'floating' | 'salvaging' | 'salvaged';
  content: string;
  senderName: string;
  sentTime: number;
  salvageCount: number;
  salvageAnimation?: { progress: number };
  vx: number;
  vy: number;
}

const WORD_BANK: string[] = [
  '星星', '海浪', '远方', '秘密', '回声', '月光', '晨雾', '潮汐', '微风', '晚霞',
  '灯塔', '珊瑚', '贝壳', '海风', '沙砾', '彩虹', '梦境', '云朵', '岛屿', '船帆',
  '渔火', '琥珀', '珍珠', '海螺', '海豚', '鲸歌', '晨曦', '暮色', '银河', '流星',
  '蒲公英', '向日葵', '萤火虫', '蝴蝶', '薰衣草', '樱花', '枫叶', '雪花', '露珠', '极光',
  '旅人', '诗人', '水手', '渔夫', '画家', '歌者', '梦想家', '守望者', '流浪者', '探险家',
  '思念', '祝福', '希望', '勇气', '自由', '宁静', '温柔', '孤独', '欢喜', '忧伤',
  '时光', '流年', '永恒', '刹那', '重逢', '告别', '约定', '等待', '邂逅', '错过',
  '山巅', '深谷', '森林', '溪流', '瀑布', '湖泊', '草原', '沙漠', '冰川', '火山',
  '书信', '诗篇', '乐章', '画卷', '故事', '回忆', '未来', '当下', '昨天', '明天',
  '蓝色', '金色', '银色', '绯色', '翠绿', '纯白', '漆黑', '湛蓝', '琥珀色', '玫瑰色'
];

const NAME_CHARS: string[] = [
  '海', '风', '浪', '云', '月', '星', '晨', '暮', '潮', '汐',
  '珊', '瑚', '贝', '螺', '珠', '珀', '帆', '灯', '渔', '火',
  '梦', '歌', '诗', '画', '旅', '渡', '远', '安', '宁', '静',
  '蓝', '白', '金', '银', '绯', '翠', '虹', '霞', '露', '雪'
];

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SHORE_WIDTH = 50;
const GRID_CELL_SIZE = 40;
const MAX_BOTTLES = 50;
const SALVAGE_DISTANCE = 40;

export class MessageSystem {
  private bottles: Bottle[] = [];
  private gameTime: number = 0;
  private salvageSuccessCount: number = 0;
  private spatialGrid: Map<string, Bottle[]> = new Map();
  private lastSalvageCallback: ((bottle: Bottle) => void) | null = null;

  constructor() {
  }

  public onSalvage(callback: (bottle: Bottle) => void): void {
    this.lastSalvageCallback = callback;
  }

  public update(deltaTime: number, current: OceanCurrent, getWaveYAt: (x: number) => number): void {
    this.gameTime += deltaTime;
    this.rebuildSpatialGrid();

    for (let i = this.bottles.length - 1; i >= 0; i--) {
      const bottle = this.bottles[i];

      if (bottle.state === 'floating') {
        this.updateFloatingBottle(bottle, deltaTime, current, getWaveYAt);
      } else if (bottle.state === 'salvaging') {
        this.updateSalvagingBottle(bottle, deltaTime);
        if (bottle.salvageAnimation && bottle.salvageAnimation.progress >= 1) {
          bottle.state = 'salvaged';
          if (this.lastSalvageCallback) {
            this.lastSalvageCallback(bottle);
          }
        }
      } else if (bottle.state === 'salvaged') {
        if (!bottle.salvageAnimation || bottle.salvageAnimation.progress >= 3) {
          this.bottles.splice(i, 1);
        } else if (bottle.salvageAnimation) {
          bottle.salvageAnimation.progress += deltaTime;
        }
      }

      if (bottle.x < SHORE_WIDTH - 30 || bottle.x > CANVAS_WIDTH + 30 ||
          bottle.y < 0 || bottle.y > CANVAS_HEIGHT + 50) {
        if (bottle.state === 'floating') {
          this.bottles.splice(i, 1);
        }
      }
    }
  }

  private updateFloatingBottle(
    bottle: Bottle,
    deltaTime: number,
    current: OceanCurrent,
    getWaveYAt: (x: number) => number
  ): void {
    const dt = deltaTime * 60;
    const speedFactor = current.strength * 0.12;

    bottle.vx += (current.dx * speedFactor - bottle.vx) * 0.05 * dt;
    bottle.vy += (current.dy * speedFactor * 0.5 - bottle.vy) * 0.05 * dt;

    bottle.x += bottle.vx * dt;
    bottle.y += bottle.vy * dt;

    bottle.floatPhase += deltaTime * 2;
    const waveY = getWaveYAt(bottle.x);
    const targetY = waveY + Math.sin(bottle.floatPhase) * 3;
    bottle.y += (targetY - bottle.y) * 0.1;

    const targetRotation = Math.sin(bottle.floatPhase * 0.7) * 0.15 + (bottle.vx * 0.02);
    bottle.rotation += (targetRotation - bottle.rotation) * 0.1;
  }

  private updateSalvagingBottle(bottle: Bottle, deltaTime: number): void {
    if (!bottle.salvageAnimation) {
      bottle.salvageAnimation = { progress: 0 };
    }
    bottle.salvageAnimation.progress += deltaTime * 1.5;
    const p = Math.min(bottle.salvageAnimation.progress, 1);
    bottle.rotation += deltaTime * 8 * (1 - p);
    bottle.y -= deltaTime * 80 * (1 - p * 0.5);
  }

  private rebuildSpatialGrid(): void {
    this.spatialGrid.clear();
    for (const bottle of this.bottles) {
      if (bottle.state !== 'floating') continue;
      const key = this.getGridKey(bottle.x, bottle.y);
      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, []);
      }
      this.spatialGrid.get(key)!.push(bottle);
    }
  }

  private getGridKey(x: number, y: number): string {
    const gx = Math.floor(x / GRID_CELL_SIZE);
    const gy = Math.floor(y / GRID_CELL_SIZE);
    return `${gx},${gy}`;
  }

  public throwBottle(): Bottle | null {
    if (this.bottles.length >= MAX_BOTTLES) {
      return null;
    }

    const bottle: Bottle = {
      id: this.generateId(),
      x: SHORE_WIDTH + 15 + Math.random() * 20,
      y: 350 + Math.random() * 100,
      rotation: 0,
      floatPhase: Math.random() * Math.PI * 2,
      state: 'floating',
      content: this.generatePoem(),
      senderName: this.generateName(),
      sentTime: Math.floor(this.gameTime),
      salvageCount: 0,
      vx: 0.5 + Math.random() * 0.5,
      vy: 0
    };

    this.bottles.push(bottle);
    return bottle;
  }

  public trySalvage(clickX: number, clickY: number): Bottle | null {
    const gx = Math.floor(clickX / GRID_CELL_SIZE);
    const gy = Math.floor(clickY / GRID_CELL_SIZE);
    const candidates: Bottle[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gx + dx},${gy + dy}`;
        const cell = this.spatialGrid.get(key);
        if (cell) {
          candidates.push(...cell);
        }
      }
    }

    let closest: Bottle | null = null;
    let closestDist = SALVAGE_DISTANCE;

    for (const bottle of candidates) {
      if (bottle.state !== 'floating') continue;
      const dist = Math.hypot(bottle.x - clickX, bottle.y - clickY);
      if (dist < closestDist) {
        closestDist = dist;
        closest = bottle;
      }
    }

    if (closest) {
      closest.state = 'salvaging';
      closest.salvageAnimation = { progress: 0 };
      closest.salvageCount++;
      this.salvageSuccessCount++;
      return closest;
    }

    return null;
  }

  private generatePoem(): string {
    const wordCount = 3 + Math.floor(Math.random() * 3);
    const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, wordCount);

    const patterns = [
      (w: string[]) => `${w[0]}托起${w.slice(1).join('的')}`,
      (w: string[]) => `${w[0]}藏在${w.slice(1).join('与')}之间`,
      (w: string[]) => `${w.slice(0, -1).join('，')}，${w[w.length - 1]}如歌`,
      (w: string[]) => `${w[0]}是${w.slice(1).join('的')}的低语`,
      (w: string[]) => `${w.slice(0, Math.ceil(w.length / 2)).join('与')}穿越${w.slice(Math.ceil(w.length / 2)).join('和')}`,
      (w: string[]) => `${w[0]}漫过${w.slice(1).join('、')}的足迹`,
      (w: string[]) => `愿${w.slice(0, -1).join('与')}，化作${w[w.length - 1]}`,
      (w: string[]) => `${w.join(' · ')}`
    ];

    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    return pattern(selected);
  }

  private generateName(): string {
    const len = 2 + Math.floor(Math.random() * 2);
    const shuffled = [...NAME_CHARS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, len).join('');
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  public getBottles(): Bottle[] {
    return this.bottles;
  }

  public getFloatingCount(): number {
    return this.bottles.filter(b => b.state === 'floating').length;
  }

  public getSalvageCount(): number {
    return this.salvageSuccessCount;
  }

  public getGameTime(): number {
    return Math.floor(this.gameTime);
  }
}
