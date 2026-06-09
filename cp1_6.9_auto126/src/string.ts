import p5 from 'p5';

export interface Point {
  x: number;
  y: number;
}

export class Node {
  baseX: number;
  baseY: number;
  offsetX: number = 0;
  offsetY: number = 0;

  constructor(x: number, y: number) {
    this.baseX = x;
    this.baseY = y;
  }

  get x(): number {
    return this.baseX + this.offsetX;
  }

  get y(): number {
    return this.baseY + this.offsetY;
  }
}

export class LightWave {
  progress: number = 0;
  speed: number;
  radius: number = 5;
  maxRadius: number = 25;
  alive: boolean = true;
  color: string;

  constructor(speed: number, color: string) {
    this.speed = speed;
    this.color = color;
  }

  update(): void {
    this.progress += this.speed;
    const t = Math.min(this.progress, 1);
    this.radius = 5 + t * 20;
    if (this.progress >= 1) {
      this.alive = false;
    }
  }

  getPositionOnString(nodes: Node[]): Point | null {
    if (nodes.length < 2) return null;

    let totalLength = 0;
    const segmentLengths: number[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const dx = nodes[i + 1].x - nodes[i].x;
      const dy = nodes[i + 1].y - nodes[i].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      segmentLengths.push(len);
      totalLength += len;
    }

    const targetDist = this.progress * totalLength;
    let accumulated = 0;

    for (let i = 0; i < segmentLengths.length; i++) {
      if (accumulated + segmentLengths[i] >= targetDist) {
        const t = (targetDist - accumulated) / segmentLengths[i];
        return {
          x: nodes[i].x + (nodes[i + 1].x - nodes[i].x) * t,
          y: nodes[i].y + (nodes[i + 1].y - nodes[i].y) * t
        };
      }
      accumulated += segmentLengths[i];
    }

    const last = nodes[nodes.length - 1];
    return { x: last.x, y: last.y };
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number = 1;
  life: number = 0;
  maxLife: number = 30;
  alive: boolean = true;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = 3 + Math.random() * 2;
    this.color = color;
  }

  update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.life++;
    this.alpha = 1 - (this.life / this.maxLife) * 0.7;
    if (this.life >= this.maxLife) {
      this.alive = false;
    }
  }
}

export class Resonance {
  x: number;
  y: number;
  radius: number = 15;
  color: string;
  life: number = 0;
  maxLife: number = 60;
  alive: boolean = true;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
  }

  update(): void {
    this.life++;
    if (this.life >= this.maxLife) {
      this.alive = false;
    }
  }

  get alpha(): number {
    return 1 - this.life / this.maxLife;
  }
}

const COLOR_CYCLE = [
  '#ff4466',
  '#44ff66',
  '#4466ff',
  '#ffcc44',
  '#aa44ff'
];

export class LightString {
  nodes: Node[] = [];
  isDrawing: boolean = true;
  vibrationFrequency: number;
  vibrationAmplitude: number;
  vibrationPhase: number = 0;
  colorIndex: number = 0;
  colorTime: number = 0;
  waves: LightWave[] = [];
  waveTimer: number = 0;
  id: number;

  constructor(id: number, startX: number, startY: number) {
    this.id = id;
    this.nodes.push(new Node(startX, startY));
    this.vibrationFrequency = 0.5 + Math.random() * 1.5;
    this.vibrationAmplitude = 3 + Math.random() * 5;
  }

  get currentColor(): string {
    return COLOR_CYCLE[this.colorIndex];
  }

  addNode(x: number, y: number): void {
    if (!this.isDrawing) return;
    const last = this.nodes[this.nodes.length - 1];
    const dx = x - last.baseX;
    const dy = y - last.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= 20 && dist <= 40) {
      this.nodes.push(new Node(x, y));
    } else if (dist > 40) {
      const steps = Math.ceil(dist / 30);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        this.nodes.push(new Node(
          last.baseX + dx * t,
          last.baseY + dy * t
        ));
      }
    }
  }

  finish(): void {
    this.isDrawing = false;
    if (this.nodes.length >= 2) {
      this.emitWave();
    }
  }

  emitWave(): void {
    this.waves.push(new LightWave(0.008, this.currentColor));
  }

  update(): void {
    this.colorTime++;
    if (this.colorTime >= 120) {
      this.colorTime = 0;
      this.colorIndex = (this.colorIndex + 1) % COLOR_CYCLE.length;
    }

    if (!this.isDrawing && this.nodes.length >= 2) {
      this.vibrationPhase += this.vibrationFrequency * 0.05;
      for (let i = 0; i < this.nodes.length; i++) {
        const t = i / Math.max(this.nodes.length - 1, 1);
        const angle = this.vibrationPhase + t * Math.PI * 2;
        const envelope = Math.sin(t * Math.PI);
        this.nodes[i].offsetX = Math.cos(angle) * this.vibrationAmplitude * envelope;
        this.nodes[i].offsetY = Math.sin(angle) * this.vibrationAmplitude * envelope;
      }
    }

    this.waveTimer++;
    if (!this.isDrawing && this.waveTimer >= 180) {
      this.waveTimer = 0;
      this.emitWave();
    }

    for (const wave of this.waves) {
      wave.update();
    }
    this.waves = this.waves.filter(w => w.alive);
  }

  getSegments(): Array<{ a: Point; b: Point }> {
    const segments: Array<{ a: Point; b: Point }> = [];
    for (let i = 0; i < this.nodes.length - 1; i++) {
      segments.push({
        a: { x: this.nodes[i].x, y: this.nodes[i].y },
        b: { x: this.nodes[i + 1].x, y: this.nodes[i + 1].y }
      });
    }
    return segments;
  }

  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  static mixColors(c1: string, c2: string): string {
    const rgb1 = LightString.hexToRgb(c1);
    const rgb2 = LightString.hexToRgb(c2);
    const r = Math.round((rgb1.r + rgb2.r) / 2);
    const g = Math.round((rgb1.g + rgb2.g) / 2);
    const b = Math.round((rgb1.b + rgb2.b) / 2);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  draw(p: p5): void {
    const color = this.currentColor;
    const rgb = LightString.hexToRgb(color);

    if (this.nodes.length >= 2) {
      p.push();
      const ctx = p.drawingContext as CanvasRenderingContext2D;
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      p.strokeWeight(3);
      p.stroke(rgb.r, rgb.g, rgb.b, 220);
      p.noFill();
      p.beginShape();
      for (const node of this.nodes) {
        p.vertex(node.x, node.y);
      }
      p.endShape();
      p.pop();
    }

    for (const node of this.nodes) {
      p.push();
      p.noStroke();
      p.fill(255, 255, 255, 150);
      p.circle(node.x, node.y, 8);
      p.pop();
    }

    for (const wave of this.waves) {
      const pos = wave.getPositionOnString(this.nodes);
      if (pos) {
        p.push();
        const ctx = p.drawingContext as CanvasRenderingContext2D;
        ctx.shadowBlur = 12;
        ctx.shadowColor = wave.color;
        p.noStroke();
        const waveRgb = LightString.hexToRgb(wave.color);
        const alpha = Math.floor((1 - wave.progress) * 200);
        p.fill(waveRgb.r, waveRgb.g, waveRgb.b, alpha);
        p.circle(pos.x, pos.y, wave.radius * 2);
        p.pop();
      }
    }
  }
}

export function segmentsIntersect(
  a1: Point, a2: Point, b1: Point, b2: Point
): Point | null {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 0.0001) return null;

  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom;
  const s = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / denom;

  if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {
    return {
      x: a1.x + t * d1x,
      y: a1.y + t * d1y
    };
  }
  return null;
}
