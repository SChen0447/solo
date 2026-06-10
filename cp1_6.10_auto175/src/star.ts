export type Sentiment = 'warm' | 'calm' | 'default';

const WARM_WORDS = ['快乐', '爱', '成功', '幸福', '开心', '美好', '顺利', '幸运'];
const CALM_WORDS = ['平安', '平静', '健康', '安心', '安宁', '宁静'];

export function detectSentiment(text: string): Sentiment {
  for (const w of WARM_WORDS) {
    if (text.includes(w)) return 'warm';
  }
  for (const w of CALM_WORDS) {
    if (text.includes(w)) return 'calm';
  }
  return 'default';
}

export function colorForSentiment(s: Sentiment): string {
  if (s === 'warm') return '#ffd700';
  if (s === 'calm') return '#e0f7fa';
  return '#fff8dc';
}

export function randomStarColor(): string {
  const palette = ['#fff8dc', '#ffd700', '#ffffe0', '#f0e68c', '#ffefd5'];
  return palette[Math.floor(Math.random() * palette.length)];
}

const DEFAULT_WISHES = [
  '愿每一天都充满阳光',
  '希望家人平安健康',
  '愿梦想成真',
  '希望考试顺利通过',
  '愿世界和平美好',
  '祝你快乐每一天',
  '愿工作顺心如意',
  '希望遇见更好的自己',
  '愿友谊天长地久',
  '希望生活多姿多彩',
  '愿努力终有回报',
  '愿被世界温柔以待',
  '希望学业进步',
  '愿心想事成',
  '希望每天都有好心情',
  '愿爱与你同在',
  '希望身体健康',
  '愿一切顺利',
  '祝你幸福美满',
  '希望未来可期',
];

export function randomWish(): string {
  return DEFAULT_WISHES[Math.floor(Math.random() * DEFAULT_WISHES.length)];
}

export interface StarOptions {
  baseX: number;
  baseY: number;
  size?: number;
  color?: string;
  opacity?: number;
  phase?: number;
  orbitAngle?: number;
  wishText?: string;
  isCollected?: boolean;
}

export class Star {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  color: string;
  opacity: number;
  phase: number;
  breathSpeed: number;
  orbitAngle: number;
  wishText: string;
  isCollected: boolean;
  sentiment: Sentiment;
  clickAnim: { active: boolean; progress: number };
  flyAnim: {
    active: boolean;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    progress: number;
  };
  halo: { active: boolean; radius: number; opacity: number };

  constructor(opts: StarOptions) {
    this.baseX = opts.baseX;
    this.baseY = opts.baseY;
    this.x = opts.baseX;
    this.y = opts.baseY;
    this.size = opts.size ?? 3 + Math.random() * 5;
    this.color = opts.color ?? randomStarColor();
    this.opacity = opts.opacity ?? 0.6 + Math.random() * 0.4;
    this.phase = opts.phase ?? Math.random() * Math.PI * 2;
    this.breathSpeed = (Math.PI * 2) / (1 + Math.random() * 2);
    this.orbitAngle = opts.orbitAngle ?? Math.random() * Math.PI * 2;
    this.wishText = opts.wishText ?? randomWish();
    this.isCollected = opts.isCollected ?? false;
    this.sentiment = detectSentiment(this.wishText);
    if (this.color === '#ffd700') this.sentiment = 'warm';
    else if (this.color === '#e0f7fa') this.sentiment = 'calm';
    this.clickAnim = { active: false, progress: 0 };
    this.flyAnim = {
      active: false,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      progress: 0,
    };
    this.halo = { active: false, radius: 0, opacity: 0 };
  }

  startFly(fromX: number, fromY: number, toX: number, toY: number): void {
    this.flyAnim.active = true;
    this.flyAnim.startX = fromX;
    this.flyAnim.startY = fromY;
    this.flyAnim.endX = toX;
    this.flyAnim.endY = toY;
    this.flyAnim.progress = 0;
    this.baseX = toX;
    this.baseY = toY;
  }

  handleClick(): void {
    this.clickAnim.active = true;
    this.clickAnim.progress = 0;
    this.halo.active = true;
    this.halo.radius = 0;
    this.halo.opacity = 1;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  update(
    deltaTime: number,
    centerX: number,
    centerY: number,
    orbitSpeed: number,
  ): void {
    this.phase += this.breathSpeed * deltaTime;

    if (this.flyAnim.active) {
      this.flyAnim.progress += deltaTime / 1.2;
      if (this.flyAnim.progress >= 1) {
        this.flyAnim.progress = 1;
        this.flyAnim.active = false;
      }
      const t = this.easeOutCubic(this.flyAnim.progress);
      this.x =
        this.flyAnim.startX + (this.flyAnim.endX - this.flyAnim.startX) * t;
      this.y =
        this.flyAnim.startY + (this.flyAnim.endY - this.flyAnim.startY) * t;
    } else {
      this.orbitAngle += orbitSpeed * deltaTime;
      const dx = this.baseX - centerX;
      const dy = this.baseY - centerY;
      const cos = Math.cos(orbitSpeed * deltaTime);
      const sin = Math.sin(orbitSpeed * deltaTime);
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      this.baseX = centerX + rx;
      this.baseY = centerY + ry;
      this.x = this.baseX;
      this.y = this.baseY;
    }

    if (this.clickAnim.active) {
      this.clickAnim.progress += deltaTime / 0.3;
      if (this.clickAnim.progress >= 1) {
        this.clickAnim.progress = 1;
        this.clickAnim.active = false;
      }
    }

    if (this.halo.active) {
      const t = deltaTime / 1.2;
      this.halo.radius += 60 * t;
      this.halo.opacity = Math.max(0, this.halo.opacity - t);
      if (this.halo.opacity <= 0 || this.halo.radius >= 60) {
        this.halo.active = false;
      }
    }
  }

  private drawStarShape(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    color: string,
    alpha: number,
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.4, this.hexToRgba(color, 0.6));
    gradient.addColorStop(1, this.hexToRgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const breathScale = 1 + 0.5 * Math.sin(this.phase);
    let scale = breathScale;

    if (this.clickAnim.active) {
      const t = this.clickAnim.progress;
      const clickScale = t < 0.5 ? 1 + 0.8 * (t * 2) : 1.8 - 0.8 * ((t - 0.5) * 2);
      scale = Math.max(scale, clickScale);
    }

    const finalSize = this.size * scale;
    const finalColor = this.isCollected ? '#ffd700' : this.color;
    const finalOpacity = this.isCollected
      ? Math.max(this.opacity, 0.9)
      : this.opacity;

    if (this.halo.active) {
      ctx.save();
      ctx.globalAlpha = this.halo.opacity * 0.7;
      const g = ctx.createRadialGradient(
        this.x,
        this.y,
        0,
        this.x,
        this.y,
        this.halo.radius,
      );
      g.addColorStop(0, this.hexToRgba(finalColor, 0.5));
      g.addColorStop(1, this.hexToRgba(finalColor, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.halo.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this.drawStarShape(ctx, this.x, this.y, finalSize, finalColor, finalOpacity);

    if (this.isCollected) {
      ctx.save();
      ctx.fillStyle = '#ff5252';
      ctx.beginPath();
      ctx.arc(this.x + finalSize + 2, this.y - finalSize - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  containsPoint(px: number, py: number): boolean {
    const hitRadius = Math.max(this.size * 2.5, 10);
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= hitRadius * hitRadius;
  }
}
