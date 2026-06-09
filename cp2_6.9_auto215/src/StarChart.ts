export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  frequency: number;
  color: string;
  constellationId: number | null;
}

export interface Constellation {
  id: number;
  name: string;
  starIndices: number[];
}

export interface PulseEffect {
  starIndex: number;
  startTime: number;
  duration: number;
}

const CONSTELLATION_NAMES = [
  '霜月之冠', '暗影之蛇', '晨曦之鹿', '星辰之眼',
  '暮光之翼', '深渊之鱼', '风语之鹤', '烈焰之狮',
  '寒冰之狼', '雷霆之鹰', '碧海之鲸', '黄沙之蝎',
  '紫霞之凤', '银辉之狐', '墨夜之鸦', '金辉之龙'
];

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

export class StarChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private constellations: Constellation[] = [];
  private rotation: number = 0;
  private targetRotation: number = 0;
  private lastConstellationGen: number = 0;
  private highlightedConstellationId: number | null = null;
  private pulseEffects: PulseEffect[] = [];
  private starCount: number;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartRotation: number = 0;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement, starCount: number = 150) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.starCount = starCount;
    this.width = canvas.width;
    this.height = canvas.height;
    this.generateStars();
    this.generateConstellations();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartRotation = this.targetRotation;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.dragStartX;
    const rotationDelta = (deltaX / this.width) * 60;
    this.targetRotation = Math.max(-30, Math.min(30, this.dragStartRotation + rotationDelta));
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.dragStartX = e.touches[0].clientX;
      this.dragStartRotation = this.targetRotation;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - this.dragStartX;
    const rotationDelta = (deltaX / this.width) * 60;
    this.targetRotation = Math.max(-30, Math.min(30, this.dragStartRotation + rotationDelta));
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private onDoubleClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    const rotatedPoint = this.rotatePointInverse(x, y);
    const clickedStarIndex = this.findStarAt(rotatedPoint.x, rotatedPoint.y);
    if (clickedStarIndex !== -1) {
      const star = this.stars[clickedStarIndex];
      if (star.constellationId !== null) {
        this.highlightedConstellationId = star.constellationId;
        this.pulseEffects.push({
          starIndex: clickedStarIndex,
          startTime: performance.now(),
          duration: 300
        });
      }
    }
  }

  private rotatePointInverse(x: number, y: number): { x: number; y: number } {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const rad = (-this.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
      x: cx + (x - cx) * cos - (y - cy) * sin,
      y: cy + (x - cx) * sin + (y - cy) * cos
    };
  }

  private findStarAt(x: number, y: number): number {
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const dx = star.x - x;
      const dy = star.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= star.size + 8) {
        return i;
      }
    }
    return -1;
  }

  public generateStars(): void {
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      const colorT = Math.random();
      this.stars.push({
        x: 40 + Math.random() * (this.width - 80),
        y: 40 + Math.random() * (this.height - 80),
        size: 2 + Math.random() * 3,
        baseAlpha: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        frequency: 0.5 + Math.random() * 1.5,
        color: colorT < 0.7 ? lerpColor('#E0E7FF', '#C7D2FE', Math.random()) : lerpColor('#F5E6CA', '#FDE68A', Math.random()),
        constellationId: null
      });
    }
  }

  public generateConstellations(): void {
    this.constellations = [];
    for (const star of this.stars) {
      star.constellationId = null;
    }
    this.highlightedConstellationId = null;

    const availableIndices = this.stars.map((_, i) => i);
    const numConstellations = 3 + Math.floor(Math.random() * 4);

    for (let c = 0; c < numConstellations && availableIndices.length > 3; c++) {
      const groupSize = 3 + Math.floor(Math.random() * 6);
      if (availableIndices.length < groupSize) break;

      const starIndices: number[] = [];
      const startIdx = Math.floor(Math.random() * availableIndices.length);
      const firstStarIdx = availableIndices[startIdx];
      availableIndices.splice(startIdx, 1);
      starIndices.push(firstStarIdx);

      for (let s = 1; s < groupSize && availableIndices.length > 0; s++) {
        let nearestIdx = -1;
        let nearestDist = Infinity;
        let nearestArrIdx = -1;

        for (let a = 0; a < availableIndices.length; a++) {
          const idx = availableIndices[a];
          const star = this.stars[idx];
          let minDistToGroup = Infinity;
          for (const gi of starIndices) {
            const gStar = this.stars[gi];
            const dx = star.x - gStar.x;
            const dy = star.y - gStar.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistToGroup) minDistToGroup = dist;
          }
          if (minDistToGroup < nearestDist && minDistToGroup < 180) {
            nearestDist = minDistToGroup;
            nearestIdx = idx;
            nearestArrIdx = a;
          }
        }

        if (nearestIdx === -1) {
          if (availableIndices.length === 0) break;
          nearestArrIdx = Math.floor(Math.random() * availableIndices.length);
          nearestIdx = availableIndices[nearestArrIdx];
        }

        availableIndices.splice(nearestArrIdx, 1);
        starIndices.push(nearestIdx);
      }

      for (const idx of starIndices) {
        this.stars[idx].constellationId = c;
      }

      const nameIdx = Math.floor(Math.random() * CONSTELLATION_NAMES.length);

      this.constellations.push({
        id: c,
        name: CONSTELLATION_NAMES[nameIdx],
        starIndices: this.sortConstellationStars(starIndices)
      });
    }
  }

  private sortConstellationStars(indices: number[]): number[] {
    if (indices.length <= 1) return indices;
    const result: number[] = [indices[0]];
    const remaining = indices.slice(1);

    while (remaining.length > 0) {
      const lastStar = this.stars[result[result.length - 1]];
      let nearestIdx = -1;
      let nearestArrIdx = -1;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const star = this.stars[remaining[i]];
        const dx = star.x - lastStar.x;
        const dy = star.y - lastStar.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = remaining[i];
          nearestArrIdx = i;
        }
      }

      result.push(nearestIdx);
      remaining.splice(nearestArrIdx, 1);
    }

    return result;
  }

  public setStarCount(count: number): void {
    this.starCount = count;
    this.generateStars();
    this.generateConstellations();
  }

  public getHighlightedConstellationName(): string | null {
    if (this.highlightedConstellationId === null) {
      if (this.constellations.length > 0) {
        return this.constellations[0].name;
      }
      return null;
    }
    const c = this.constellations.find(c => c.id === this.highlightedConstellationId);
    return c ? c.name : null;
  }

  public getConstellationCount(): number {
    return this.constellations.length;
  }

  public update(time: number): void {
    this.rotation += (this.targetRotation - this.rotation) * 0.1;

    if (time - this.lastConstellationGen > 3000) {
      this.generateConstellations();
      this.lastConstellationGen = time;
    }

    this.pulseEffects = this.pulseEffects.filter(p => time - p.startTime < p.duration);
  }

  public render(time: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0B0015');
    gradient.addColorStop(1, '#1B0A3A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);

    for (const c of this.constellations) {
      if (c.starIndices.length < 2) continue;
      const isHighlighted = c.id === this.highlightedConstellationId;
      ctx.strokeStyle = isHighlighted ? '#FCD34D' : 'rgba(167, 139, 250, 0.6)';
      ctx.lineWidth = isHighlighted ? 3 : 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const firstStar = this.stars[c.starIndices[0]];
      ctx.moveTo(firstStar.x, firstStar.y);
      for (let i = 1; i < c.starIndices.length; i++) {
        const star = this.stars[c.starIndices[i]];
        ctx.lineTo(star.x, star.y);
      }
      ctx.stroke();
    }

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      const twinkle = Math.sin(time * 0.001 * star.frequency * Math.PI * 2 + star.phase);
      const alpha = star.baseAlpha * (0.5 + twinkle * 0.5);
      const isHighlighted = star.constellationId === this.highlightedConstellationId;

      if (isHighlighted) {
        ctx.shadowColor = '#FCD34D';
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowColor = star.color;
        ctx.shadowBlur = 4;
      }

      ctx.fillStyle = isHighlighted ? `rgba(252, 211, 77, ${alpha})` : star.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    for (const pulse of this.pulseEffects) {
      const progress = (time - pulse.startTime) / pulse.duration;
      if (progress >= 1) continue;
      const star = this.stars[pulse.starIndex];
      const radius = 25 * progress;
      const alpha = 1 - progress;
      const pulseGradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, radius);
      pulseGradient.addColorStop(0, `rgba(252, 211, 77, ${alpha * 0.8})`);
      pulseGradient.addColorStop(0.5, `rgba(252, 211, 77, ${alpha * 0.3})`);
      pulseGradient.addColorStop(1, 'rgba(252, 211, 77, 0)');
      ctx.fillStyle = pulseGradient;
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public reset(): void {
    this.rotation = 0;
    this.targetRotation = 0;
    this.highlightedConstellationId = null;
    this.pulseEffects = [];
    this.generateStars();
    this.generateConstellations();
  }
}
