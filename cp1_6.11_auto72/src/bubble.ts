export interface BubbleColor {
  h: number;
  s: number;
  l: number;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export class Bubble {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  elasticity: number;
  life: number;
  maxLife: number;
  opacity: number;
  bornAt: number;
  scale: number;
  targetScale: number;
  isDying: boolean;
  dyingProgress: number;

  constructor(
    x: number,
    y: number,
    r: number,
    color?: BubbleColor
  ) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.vx = 0;
    this.vy = 0;
    this.elasticity = 0.8;
    this.life = 0;
    this.maxLife = Infinity;
    this.opacity = 1;
    this.bornAt = performance.now();
    this.scale = 0;
    this.targetScale = 1;
    this.isDying = false;
    this.dyingProgress = 0;

    if (color) {
      this.color = { ...color };
    } else {
      this.color = {
        h: Math.floor(Math.random() * 360),
        s: 80 + Math.random() * 20,
        l: 60 + Math.random() * 20
      };
    }
  }

  static randomColor(): BubbleColor {
    return {
      h: Math.floor(Math.random() * 360),
      s: 80 + Math.random() * 20,
      l: 60 + Math.random() * 20
    };
  }

  static hslToRgb(h: number, s: number, l: number): RGBColor {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4))
    };
  }

  static rgbToHsl(r: number, g: number, b: number): BubbleColor {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
          break;
        case g:
          h = ((b - r) / d + 2) * 60;
          break;
        case b:
          h = ((r - g) / d + 4) * 60;
          break;
      }
    }

    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  area(): number {
    return Math.PI * this.r * this.r;
  }

  update(dt: number, width: number, height: number) {
    if (this.scale < this.targetScale) {
      this.scale = Math.min(this.scale + dt * 0.008, this.targetScale);
    }

    if (this.isDying) {
      this.dyingProgress = Math.min(this.dyingProgress + dt * 0.002, 1);
      this.opacity = 1 - this.dyingProgress;
      this.scale = (1 - this.dyingProgress) * this.targetScale;
      return;
    }

    this.x += this.vx;
    this.y += this.vy;

    const effR = this.r * this.scale;

    if (this.x - effR < 0) {
      this.x = effR;
      this.vx = -this.vx * this.elasticity;
    } else if (this.x + effR > width) {
      this.x = width - effR;
      this.vx = -this.vx * this.elasticity;
    }

    if (this.y - effR < 0) {
      this.y = effR;
      this.vy = -this.vy * this.elasticity;
    } else if (this.y + effR > height) {
      this.y = height - effR;
      this.vy = -this.vy * this.elasticity;
    }

    this.life += dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const effR = this.r * this.scale;
    if (effR <= 0 || this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const rgb = Bubble.hslToRgb(this.color.h, this.color.s, this.color.l);

    const gradient = ctx.createRadialGradient(
      this.x - effR * 0.3,
      this.y - effR * 0.3,
      effR * 0.1,
      this.x,
      this.y,
      effR
    );
    gradient.addColorStop(0, `rgba(${rgb.r + 50}, ${rgb.g + 50}, ${rgb.b + 50}, 0.95)`);
    gradient.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
    gradient.addColorStop(1, `rgba(${Math.max(rgb.r - 60, 0)}, ${Math.max(rgb.g - 60, 0)}, ${Math.max(rgb.b - 60, 0)}, 0.6)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, effR, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, effR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.25)`;
    ctx.lineWidth = Math.max(1, effR * 0.04);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      this.x - effR * 0.3,
      this.y - effR * 0.35,
      effR * 0.35,
      effR * 0.22,
      -Math.PI / 5,
      0,
      Math.PI * 2
    );
    const highlightGrad = ctx.createRadialGradient(
      this.x - effR * 0.3,
      this.y - effR * 0.35,
      0,
      this.x - effR * 0.3,
      this.y - effR * 0.35,
      effR * 0.4
    );
    highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGrad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, effR * 0.92, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(
      this.x + effR * 0.2,
      this.y + effR * 0.5,
      effR * 0.55,
      effR * 0.28,
      Math.PI / 8,
      0,
      Math.PI * 2
    );
    const shadowGrad = ctx.createRadialGradient(
      this.x + effR * 0.2,
      this.y + effR * 0.5,
      0,
      this.x + effR * 0.2,
      this.y + effR * 0.5,
      effR * 0.6
    );
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= (this.r * this.scale) * (this.r * this.scale);
  }

  startFadeOut() {
    this.isDying = true;
    this.dyingProgress = 0;
  }

  isDead(): boolean {
    return this.isDying && this.dyingProgress >= 1;
  }

  split(): Bubble[] {
    const newR = this.r * 0.7;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = angle1 + Math.PI;
    const speed = 2 + Math.random() * 2;

    const childColor1: BubbleColor = {
      h: (this.color.h + (Math.random() * 40 - 20) + 360) % 360,
      s: Math.min(100, Math.max(60, this.color.s + (Math.random() * 20 - 10))),
      l: Math.min(90, Math.max(40, this.color.l + (Math.random() * 20 - 10)))
    };

    const childColor2: BubbleColor = {
      h: (this.color.h + (Math.random() * 40 - 20) + 360) % 360,
      s: Math.min(100, Math.max(60, this.color.s + (Math.random() * 20 - 10))),
      l: Math.min(90, Math.max(40, this.color.l + (Math.random() * 20 - 10)))
    };

    const b1 = new Bubble(this.x, this.y, newR, childColor1);
    b1.vx = Math.cos(angle1) * speed;
    b1.vy = Math.sin(angle1) * speed;
    b1.scale = 1;
    b1.targetScale = 1;

    const b2 = new Bubble(this.x, this.y, newR, childColor2);
    b2.vx = Math.cos(angle2) * speed;
    b2.vy = Math.sin(angle2) * speed;
    b2.scale = 1;
    b2.targetScale = 1;

    return [b1, b2];
  }
}

export interface MergeEffect {
  x: number;
  y: number;
  startR: number;
  maxR: number;
  progress: number;
}

export function createMergeEffect(x: number, y: number, r: number): MergeEffect {
  return {
    x,
    y,
    startR: r,
    maxR: r + 30,
    progress: 0
  };
}

export function updateMergeEffect(effect: MergeEffect, dt: number): boolean {
  effect.progress = Math.min(effect.progress + dt * 0.01, 1);
  return effect.progress < 1;
}

export function drawMergeEffect(ctx: CanvasRenderingContext2D, effect: MergeEffect) {
  const r = effect.startR + (effect.maxR - effect.startR) * effect.progress;
  const alpha = 0.6 * (1 - effect.progress);

  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createRadialGradient(
    effect.x, effect.y, 0,
    effect.x, effect.y, r
  );
  gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

export function mergeBubbles(a: Bubble, b: Bubble): Bubble {
  const areaA = a.area();
  const areaB = b.area();
  const totalArea = areaA + areaB;

  const newR = Math.sqrt((a.r * a.r + b.r * b.r));

  const rgbA = Bubble.hslToRgb(a.color.h, a.color.s, a.color.l);
  const rgbB = Bubble.hslToRgb(b.color.h, b.color.s, b.color.l);

  const newRgb: RGBColor = {
    r: Math.round((rgbA.r * areaA + rgbB.r * areaB) / totalArea),
    g: Math.round((rgbA.g * areaA + rgbB.g * areaB) / totalArea),
    b: Math.round((rgbA.b * areaA + rgbB.b * areaB) / totalArea)
  };

  const newColor = Bubble.rgbToHsl(newRgb.r, newRgb.g, newRgb.b);

  const newBubble = new Bubble(
    (a.x + b.x) / 2,
    (a.y + b.y) / 2,
    newR,
    newColor
  );

  newBubble.vx = (a.vx * areaA + b.vx * areaB) / totalArea;
  newBubble.vy = (a.vy * areaA + b.vy * areaB) / totalArea;
  newBubble.scale = 1;
  newBubble.targetScale = 1;

  return newBubble;
}
