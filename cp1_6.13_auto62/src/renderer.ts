export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export interface Note {
  id: number;
  x: number;
  y: number;
  vx: number;
  size: number;
  color: string;
  colorHsl: { h: number; s: number; l: number };
  rotation: number;
  rotationSpeed: number;
  fromLeft: boolean;
  alive: boolean;
  hit: boolean;
  beatStrength: number;
}

export interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
  rotation: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface SaberState {
  tipX: number;
  tipY: number;
  handleX: number;
  handleY: number;
  colorHsl: { h: number; s: number; l: number };
  brightness: number;
  length: number;
  trail: TrailPoint[];
  trailLength: number;
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  isPlaying: boolean;
  isGameOver: boolean;
  width: number;
  height: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private readonly STAR_COUNT = 200;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.resize();
    this.initStars();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.initStars();
  }

  private initStars(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.stars = [];
    for (let i = 0; i < this.STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        brightness: Math.random() * 0.5 + 0.5,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  clear(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const gradient = this.ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a1a5a');
    gradient.addColorStop(0.4, '#2a1a6a');
    gradient.addColorStop(0.7, '#1a0a3a');
    gradient.addColorStop(1, '#0a0515');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);
  }

  drawStars(_time: number): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (const star of this.stars) {
      star.y += star.speed;
      star.twinklePhase += star.twinkleSpeed;
      if (star.y > height + 5) {
        star.y = -5;
        star.x = Math.random() * width;
      }
      const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
      const alpha = star.brightness * twinkle;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
      this.ctx.fill();
      if (star.size > 1.2) {
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.2})`;
        this.ctx.fill();
      }
    }
  }

  drawSaber(saber: SaberState): void {
    const { tipX, tipY, handleX, handleY, colorHsl, brightness, trail, length } = saber;
    
    // Draw trail
    this.drawTrail(trail, colorHsl, brightness);

    // Draw saber glow
    const saberColor = `hsl(${colorHsl.h}, ${colorHsl.s}%, ${colorHsl.l * brightness}%)`;
    const saberGlowIntensity = 30 * brightness;

    this.ctx.save();
    this.ctx.shadowColor = saberColor;
    this.ctx.shadowBlur = saberGlowIntensity;

    // Outer glow
    this.ctx.beginPath();
    this.ctx.moveTo(handleX, handleY);
    this.ctx.lineTo(tipX, tipY);
    this.ctx.strokeStyle = `hsla(${colorHsl.h}, ${colorHsl.s}%, ${colorHsl.l * brightness}%, 0.3)`;
    this.ctx.lineWidth = 20;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    // Middle glow
    this.ctx.beginPath();
    this.ctx.moveTo(handleX, handleY);
    this.ctx.lineTo(tipX, tipY);
    this.ctx.strokeStyle = `hsla(${colorHsl.h}, ${colorHsl.s}%, ${colorHsl.l * brightness}%, 0.6)`;
    this.ctx.lineWidth = 10;
    this.ctx.stroke();

    // Core blade
    this.ctx.beginPath();
    this.ctx.moveTo(handleX, handleY);
    this.ctx.lineTo(tipX, tipY);
    this.ctx.strokeStyle = `hsl(${colorHsl.h}, 100%, ${Math.min(90, colorHsl.l * brightness + 20)}%)`;
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    this.ctx.restore();

    // Draw handle
    this.drawHandle(handleX, handleY, tipX, tipY, length);
  }

  private drawTrail(trail: TrailPoint[], colorHsl: { h: number; s: number; l: number }, brightness: number): void {
    if (trail.length < 2) return;

    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1];
      const curr = trail[i];
      const alpha = curr.alpha * 0.6;

      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(curr.x, curr.y);
      this.ctx.strokeStyle = `hsla(${colorHsl.h}, ${colorHsl.s}%, ${colorHsl.l * brightness}%, ${alpha})`;
      this.ctx.lineWidth = 6 * alpha;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }
  }

  private drawHandle(hx: number, hy: number, tx: number, ty: number, bladeLength: number): void {
    const angle = Math.atan2(ty - hy, tx - hx);
    const handleLength = bladeLength * 0.18;
    const handleWidth = 8;

    this.ctx.save();
    this.ctx.translate(hx, hy);
    this.ctx.rotate(angle);

    // Handle body - metallic brushed look
    const gradient = this.ctx.createLinearGradient(-handleLength, -handleWidth, -handleLength, handleWidth);
    gradient.addColorStop(0, '#555');
    gradient.addColorStop(0.3, '#333');
    gradient.addColorStop(0.5, '#4a4a4a');
    gradient.addColorStop(0.7, '#2a2a2a');
    gradient.addColorStop(1, '#444');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.roundRect(-handleLength, -handleWidth, handleLength * 0.8, handleWidth * 2, 3);
    this.ctx.fill();

    // Metal highlight lines
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const yOff = -handleWidth + 2 + i * 3;
      this.ctx.beginPath();
      this.ctx.moveTo(-handleLength + 2, yOff);
      this.ctx.lineTo(-handleLength * 0.25, yOff);
      this.ctx.stroke();
    }

    // Blue breathing light
    const glowIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
    this.ctx.shadowColor = '#00aaff';
    this.ctx.shadowBlur = 8 * glowIntensity;
    this.ctx.fillStyle = `rgba(0, 170, 255, ${0.6 + glowIntensity * 0.4})`;
    this.ctx.beginPath();
    this.ctx.arc(-handleLength * 0.55, 0, 2.5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Blade emitter at tip of handle
    const emitterGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
    emitterGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    emitterGradient.addColorStop(0.5, 'rgba(150, 200, 255, 0.5)');
    emitterGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
    this.ctx.fillStyle = emitterGradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawNote(note: Note): void {
    if (!note.alive || note.hit) return;

    const { x, y, size, colorHsl, rotation } = note;
    const color = `hsl(${colorHsl.h}, ${colorHsl.s}%, ${colorHsl.l}%)`;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);

    // Outer glow
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;

    // Hexagon shape
    const hexPoints: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      hexPoints.push([
        Math.cos(angle) * size,
        Math.sin(angle) * size,
      ]);
    }

    // Fill with gradient
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, `hsla(${colorHsl.h}, ${colorHsl.s}%, ${colorHsl.l + 20}%, 0.9)`);
    gradient.addColorStop(0.6, `hsla(${colorHsl.h}, ${colorHsl.s}%, ${colorHsl.l}%, 0.7)`);
    gradient.addColorStop(1, `hsla(${colorHsl.h}, ${colorHsl.s}%, ${colorHsl.l - 10}%, 0.5)`);

    this.ctx.beginPath();
    this.ctx.moveTo(hexPoints[0][0], hexPoints[0][1]);
    for (let i = 1; i < 6; i++) {
      this.ctx.lineTo(hexPoints[i][0], hexPoints[i][1]);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Border
    this.ctx.strokeStyle = `hsla(${colorHsl.h}, ${colorHsl.s}%, ${colorHsl.l + 30}%, 0.9)`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Inner highlight
    this.ctx.beginPath();
    this.ctx.arc(-size * 0.2, -size * 0.2, size * 0.3, 0, Math.PI * 2);
    this.ctx.fillStyle = `hsla(${colorHsl.h}, 100%, 95%, 0.3)`;
    this.ctx.fill();

    this.ctx.restore();
  }

  drawShard(shard: Shard): void {
    if (shard.alpha <= 0) return;

    this.ctx.save();
    this.ctx.translate(shard.x, shard.y);
    this.ctx.rotate(shard.rotation);
    this.ctx.globalAlpha = shard.alpha;

    // Triangle shard
    this.ctx.beginPath();
    this.ctx.moveTo(0, -shard.size);
    this.ctx.lineTo(shard.size * 0.6, shard.size * 0.5);
    this.ctx.lineTo(-shard.size * 0.6, shard.size * 0.5);
    this.ctx.closePath();
    this.ctx.fillStyle = shard.color;
    this.ctx.shadowColor = shard.color;
    this.ctx.shadowBlur = 5;
    this.ctx.fill();

    this.ctx.restore();
  }

  drawRipple(ripple: Ripple): void {
    if (ripple.alpha <= 0 || ripple.radius >= ripple.maxRadius) return;

    const progress = ripple.radius / ripple.maxRadius;
    const alpha = ripple.alpha * (1 - progress);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = ripple.color.replace('1)', `${alpha})`);
    this.ctx.lineWidth = 3 * (1 - progress * 0.5);
    this.ctx.shadowColor = ripple.color;
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();

    // Inner ring
    this.ctx.beginPath();
    this.ctx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2);
    this.ctx.strokeStyle = ripple.color.replace('1)', `${alpha * 0.5})`);
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawCenterZone(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const centerX = w / 2;

    // Subtle center line
    const gradient = this.ctx.createLinearGradient(centerX - 100, 0, centerX + 100, 0);
    gradient.addColorStop(0, 'rgba(255, 0, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(centerX - 100, 0, 200, h);
  }

  get width(): number {
    return window.innerWidth;
  }

  get height(): number {
    return window.innerHeight;
  }
}
