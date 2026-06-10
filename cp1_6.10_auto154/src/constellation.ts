export interface ConstellationTarget {
  x: number;
  y: number;
  occupied: boolean;
}

export interface ConstellationData {
  id: string;
  name: string;
  icon: string;
  legend: string;
  pattern: { x: number; y: number }[];
  connections: [number, number][];
  isUnlocked: boolean;
}

export const CONSTELLATION_DATA: ConstellationData[] = [
  {
    id: 'orion',
    name: '猎户座',
    icon: '🏹',
    legend: '猎户座是冬夜最辉煌的星座，象征着伟大的猎人俄里翁。传说中他因追求女神阿耳忒弥斯而被月神派遣的蝎子杀死，宙斯将他升上天空成为星座，永远与天蝎座遥遥相对。',
    pattern: [
      { x: 0.35, y: 0.30 },
      { x: 0.55, y: 0.30 },
      { x: 0.30, y: 0.45 },
      { x: 0.45, y: 0.48 },
      { x: 0.50, y: 0.48 },
      { x: 0.60, y: 0.45 },
      { x: 0.35, y: 0.70 },
      { x: 0.55, y: 0.70 },
    ],
    connections: [
      [0, 2], [1, 5], [2, 3], [3, 4], [4, 5], [2, 6], [5, 7]
    ],
    isUnlocked: true,
  },
  {
    id: 'bigDipper',
    name: '北斗七星',
    icon: '🐻',
    legend: '北斗七星属于大熊座的一部分，是北半球最易辨认的星群。古希腊神话中，美丽的少女卡利斯托被宙斯爱上，赫拉因嫉妒将她变成熊。后来宙斯将她升上天空成为大熊座，她的儿子成为小熊座，母子永远相伴。',
    pattern: [
      { x: 0.25, y: 0.35 },
      { x: 0.35, y: 0.30 },
      { x: 0.48, y: 0.32 },
      { x: 0.58, y: 0.40 },
      { x: 0.65, y: 0.50 },
      { x: 0.72, y: 0.62 },
      { x: 0.60, y: 0.68 },
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]
    ],
    isUnlocked: false,
  },
  {
    id: 'cassiopeia',
    name: '仙后座',
    icon: '👑',
    legend: '仙后座呈W形，象征着埃塞俄比亚的王后卡西奥佩娅。她因夸耀自己的美貌而激怒海神波塞冬，被迫将女儿安德洛墨达献给海怪。最终珀耳修斯救下公主，宙斯将王后升上天空，让她永远倒挂着以示惩罚。',
    pattern: [
      { x: 0.28, y: 0.40 },
      { x: 0.40, y: 0.55 },
      { x: 0.52, y: 0.35 },
      { x: 0.64, y: 0.55 },
      { x: 0.76, y: 0.40 },
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4]
    ],
    isUnlocked: false,
  },
];

export class Constellation {
  data: ConstellationData;
  targets: ConstellationTarget[];
  canvasWidth: number;
  canvasHeight: number;
  private snapThreshold: number = 25;

  constructor(data: ConstellationData, canvasWidth: number, canvasHeight: number) {
    this.data = data;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.targets = data.pattern.map((p) => ({
      x: p.x * canvasWidth,
      y: p.y * canvasHeight,
      occupied: false,
    }));
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.targets = this.data.pattern.map((p, i) => ({
      x: p.x * canvasWidth,
      y: p.y * canvasHeight,
      occupied: this.targets[i]?.occupied ?? false,
    }));
  }

  checkSnap(starX: number, starY: number): { snapped: boolean; index: number; x: number; y: number } {
    for (let i = 0; i < this.targets.length; i++) {
      if (this.targets[i].occupied) continue;
      const dx = starX - this.targets[i].x;
      const dy = starY - this.targets[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < this.snapThreshold) {
        return {
          snapped: true,
          index: i,
          x: this.targets[i].x,
          y: this.targets[i].y,
        };
      }
    }
    return { snapped: false, index: -1, x: 0, y: 0 };
  }

  placeStar(index: number): void {
    if (index >= 0 && index < this.targets.length) {
      this.targets[index].occupied = true;
    }
  }

  unplaceStar(index: number): void {
    if (index >= 0 && index < this.targets.length) {
      this.targets[index].occupied = false;
    }
  }

  getProgress(): number {
    const placed = this.targets.filter((t) => t.occupied).length;
    return placed / this.targets.length;
  }

  getPlacedCount(): number {
    return this.targets.filter((t) => t.occupied).length;
  }

  getTotalCount(): number {
    return this.targets.length;
  }

  isComplete(): boolean {
    return this.targets.every((t) => t.occupied);
  }

  getCenter(): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;
    for (const target of this.targets) {
      sumX += target.x;
      sumY += target.y;
    }
    return {
      x: sumX / this.targets.length,
      y: sumY / this.targets.length,
    };
  }

  drawGuides(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    for (const target of this.targets) {
      if (!target.occupied) {
        const gradient = ctx.createRadialGradient(
          target.x, target.y, 0,
          target.x, target.y, 20
        );
        gradient.addColorStop(0, 'rgba(106, 156, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(106, 156, 255, 0)');

        ctx.beginPath();
        ctx.arc(target.x, target.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(106, 156, 255, 0.5)';
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(106, 156, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);

    for (const [fromIdx, toIdx] of this.data.connections) {
      const from = this.targets[fromIdx];
      const to = this.targets[toIdx];
      if (from.occupied && to.occupied) {
        ctx.strokeStyle = 'rgba(240, 230, 140, 0.6)';
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = 'rgba(106, 156, 255, 0.15)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1.5;
      }
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawCompletedLines(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.isComplete()) return;

    ctx.save();

    const glowIntensity = 0.5 + Math.sin(time * 2) * 0.3;

    for (const [fromIdx, toIdx] of this.data.connections) {
      const from = this.targets[fromIdx];
      const to = this.targets[toIdx];

      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, `rgba(240, 230, 140, ${glowIntensity})`);
      gradient.addColorStop(0.5, `rgba(192, 132, 252, ${glowIntensity})`);
      gradient.addColorStop(1, `rgba(240, 230, 140, ${glowIntensity})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#f0e68c';
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  reset(): void {
    for (const target of this.targets) {
      target.occupied = false;
    }
  }
}

export class ChallengeTracker {
  private placeTimestamps: number[] = [];
  private readonly windowMs: number = 10000;
  private readonly requiredCount: number = 5;
  private triggered: boolean = false;

  recordPlacement(): boolean {
    if (this.triggered) return false;

    const now = performance.now();
    this.placeTimestamps.push(now);

    while (this.placeTimestamps.length > 0 && now - this.placeTimestamps[0] > this.windowMs) {
      this.placeTimestamps.shift();
    }

    if (this.placeTimestamps.length >= this.requiredCount) {
      this.triggered = true;
      return true;
    }
    return false;
  }

  reset(): void {
    this.placeTimestamps = [];
    this.triggered = false;
  }

  getProgress(): number {
    return this.placeTimestamps.length / this.requiredCount;
  }
}
