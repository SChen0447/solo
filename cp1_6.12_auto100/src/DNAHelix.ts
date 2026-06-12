export interface SlotInfo {
  x: number;
  y: number;
  baseType: string;
  filled: boolean;
  pulseTime: number;
}

const BASE_COLORS: Record<string, string> = {
  A: '#FF4757',
  T: '#FFA502',
  C: '#2ED573',
  G: '#1E90FF',
};

const COMPLEMENT: Record<string, string> = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
};

export class DNAHelix {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private centerX: number = 0;
  private centerY: number = 0;
  private amplitude: number = 80;
  private verticalSpacing: number = 40;
  private rotation: number = 0;
  private slots: SlotInfo[] = [];
  private targetSequence: string = '';
  private completedIndices: Set<number> = new Set();
  private highlightSlot: number = -1;
  private highlightPulsePhase: number = 0;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
  }

  setTargetSequence(seq: string): void {
    this.targetSequence = seq;
    this.completedIndices.clear();
    this.slots = [];
    for (let i = 0; i < seq.length; i++) {
      this.slots.push({
        x: 0,
        y: 0,
        baseType: seq[i],
        filled: false,
        pulseTime: 0,
      });
    }
  }

  markCompleted(index: number): void {
    if (index >= 0 && index < this.slots.length) {
      this.completedIndices.add(index);
      this.slots[index].filled = true;
      this.slots[index].pulseTime = performance.now();
    }
  }

  setHighlightSlot(index: number): void {
    this.highlightSlot = index;
  }

  getSlots(): SlotInfo[] {
    return this.slots;
  }

  getSlotPositions(): Array<{ x: number; y: number; index: number; baseType: string; filled: boolean }> {
    return this.slots.map((s, i) => ({
      x: s.x,
      y: s.y,
      index: i,
      baseType: s.baseType,
      filled: s.filled,
    }));
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.centerX = this.canvas.width / 2 - 80;
    this.centerY = this.canvas.height / 2;
  }

  update(timestamp: number): void {
    const dt = this.lastTime ? (timestamp - this.lastTime) / 1000 : 0;
    this.lastTime = timestamp;
    this.rotation += 0.5 * dt * (Math.PI / 180);
    this.highlightPulsePhase += dt;
    this.updateSlotPositions();
  }

  private updateSlotPositions(): void {
    const count = this.slots.length;
    if (count === 0) return;
    const totalHeight = (count - 1) * this.verticalSpacing;
    const startY = this.centerY - totalHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = this.rotation + (i * Math.PI * 2) / 10;
      const x1 = this.centerX + this.amplitude * Math.sin(angle);
      const y = startY + i * this.verticalSpacing;
      this.slots[i].x = x1;
      this.slots[i].y = y;
    }
  }

  draw(): void {
    const ctx = this.ctx;
    const count = this.slots.length;
    if (count === 0) return;

    const totalHeight = (count - 1) * this.verticalSpacing;
    const startY = this.centerY - totalHeight / 2;

    ctx.save();

    this.drawStrand(ctx, startY, count, 0, 'rgba(255,255,255,0.25)');
    this.drawStrand(ctx, startY, count, Math.PI, 'rgba(255,255,255,0.15)');

    for (let i = 0; i < count; i++) {
      const angle = this.rotation + (i * Math.PI * 2) / 10;
      const angle2 = angle + Math.PI;
      const x1 = this.centerX + this.amplitude * Math.sin(angle);
      const x2 = this.centerX + this.amplitude * Math.sin(angle2);
      const y = startY + i * this.verticalSpacing;
      const z1 = Math.cos(angle);
      const z2 = Math.cos(angle2);

      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const slot = this.slots[i];
      const drawOrder = z1 > z2 ? ['back', 'front'] : ['front', 'back'];

      for (const pass of drawOrder) {
        if (pass === 'back') {
          this.drawBaseDot(ctx, z1 < z2 ? x1 : x2, y, slot.baseType, slot.filled, 0.4, i);
          this.drawBaseDot(ctx, z1 < z2 ? x2 : x1, y, COMPLEMENT[slot.baseType] || 'A', true, 0.4, -1);
        } else {
          this.drawBaseDot(ctx, z1 >= z2 ? x1 : x2, y, slot.baseType, slot.filled, 1.0, i);
          this.drawBaseDot(ctx, z1 >= z2 ? x2 : x1, y, COMPLEMENT[slot.baseType] || 'A', true, 1.0, -1);
        }
      }
    }

    this.drawPulseEffects(ctx, startY, count);
    this.drawSnapIndicators(ctx, startY, count);

    ctx.restore();
  }

  private drawStrand(ctx: CanvasRenderingContext2D, startY: number, count: number, offset: number, color: string): void {
    ctx.beginPath();
    const steps = count * 20;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const i = t * (count - 1);
      const angle = this.rotation + (i * Math.PI * 2) / 10 + offset;
      const x = this.centerX + this.amplitude * Math.sin(angle);
      const y = startY + i * this.verticalSpacing;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawBaseDot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    baseType: string,
    filled: boolean,
    alpha: number,
    slotIndex: number,
  ): void {
    const color = BASE_COLORS[baseType] || '#fff';
    const radius = 10;

    if (!filled && slotIndex >= 0) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,0.1)`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,0.3)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = `rgba(255,255,255,0.5)`;
      ctx.font = 'bold 10px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(baseType, x, y);
      return;
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    if (alpha > 0.6) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    ctx.fillStyle = '#fff';
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(baseType, x, y);
    ctx.globalAlpha = 1.0;
  }

  private drawPulseEffects(ctx: CanvasRenderingContext2D, startY: number, count: number): void {
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      const slot = this.slots[i];
      if (slot.pulseTime <= 0) continue;
      const elapsed = (now - slot.pulseTime) / 1000;
      if (elapsed > 1.5) {
        slot.pulseTime = 0;
        continue;
      }
      const angle = this.rotation + (i * Math.PI * 2) / 10;
      const x = this.centerX + this.amplitude * Math.sin(angle);
      const y = startY + i * this.verticalSpacing;
      const progress = elapsed / 1.5;
      const pulseRadius = 10 + progress * 40;
      const pulseAlpha = 1 - progress;
      const color = BASE_COLORS[slot.baseType] || '#fff';

      ctx.beginPath();
      ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = pulseAlpha * 0.6;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      ctx.beginPath();
      ctx.arc(x, y, pulseRadius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = pulseAlpha * 0.3;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }

  private drawSnapIndicators(ctx: CanvasRenderingContext2D, startY: number, count: number): void {
    if (this.highlightSlot < 0 || this.highlightSlot >= count) return;
    const i = this.highlightSlot;
    const slot = this.slots[i];
    if (slot.filled) return;

    const angle = this.rotation + (i * Math.PI * 2) / 10;
    const x = this.centerX + this.amplitude * Math.sin(angle);
    const y = startY + i * this.verticalSpacing;

    const pulseT = (Math.sin(this.highlightPulsePhase * Math.PI * 2 / 1.5) + 1) / 2;
    const ringRadius = 20 + pulseT * 10;
    const ringAlpha = 0.3 + pulseT * 0.3;

    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${ringAlpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${ringAlpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
