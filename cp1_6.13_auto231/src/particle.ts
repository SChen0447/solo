interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

interface CharParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  alpha: number;
  phase: number;
  speed: number;
}

export class InkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  glowColor: string;
  tail: TrailPoint[];
  tailLength: number;

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 3 + Math.random() * 3;
    this.alpha = 0.6 + Math.random() * 0.4;
    this.maxLife = 1.2;
    this.life = this.maxLife;
    this.glowColor = '#d4a373';
    this.tail = [];
    this.tailLength = 8 + Math.floor(Math.random() * 8);
  }

  update(delta: number): boolean {
    this.tail.unshift({ x: this.x, y: this.y, alpha: this.alpha });
    if (this.tail.length > this.tailLength) {
      this.tail.pop();
    }

    this.x += this.vx * delta;
    this.y += this.vy * delta;

    this.vx *= 0.98;
    this.vy *= 0.98;
    this.vy += 5 * delta;

    this.life -= delta;
    this.alpha = (this.life / this.maxLife) * (0.6 + Math.random() * 0.4);

    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.tail.length - 1; i >= 0; i--) {
      const t = this.tail[i];
      const tailAlpha = (1 - i / this.tail.length) * this.alpha * 0.4;
      const tailRadius = this.radius * (1 - i / this.tail.length) * 0.6;

      ctx.beginPath();
      ctx.arc(t.x, t.y, tailRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(30, 25, 20, ${tailAlpha})`;
      ctx.fill();
    }

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 2.5
    );
    gradient.addColorStop(0, `rgba(212, 163, 115, ${this.alpha * 0.8})`);
    gradient.addColorStop(0.4, `rgba(180, 140, 95, ${this.alpha * 0.4})`);
    gradient.addColorStop(1, 'rgba(212, 163, 115, 0)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(25, 20, 15, ${this.alpha})`;
    ctx.fill();
  }
}

export class BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 50;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 20;
    this.radius = 1 + Math.random() * 2;
    this.alpha = 1;
    this.maxLife = 1.5;
    this.life = this.maxLife;
    this.color = '#f72585';
  }

  update(delta: number): boolean {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.vy += 80 * delta;
    this.vx *= 0.98;
    this.vy *= 0.98;

    this.life -= delta;
    this.alpha = Math.max(0, this.life / this.maxLife);

    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 3
    );
    gradient.addColorStop(0, `rgba(247, 37, 133, ${this.alpha})`);
    gradient.addColorStop(0.5, `rgba(247, 37, 133, ${this.alpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(247, 37, 133, 0)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 200, 220, ${this.alpha})`;
    ctx.fill();
  }
}

const POETIC_CHARS = [
  '墨', '羽', '灵', '犀', '笺', '风', '月', '花', '雪', '云',
  '山', '水', '诗', '书', '画', '琴', '棋', '茶', '禅', '道',
  '心', '梦', '魂', '韵', '雅', '清', '幽', '淡', '远', '深',
  '春', '夏', '秋', '冬', '朝', '暮', '晨', '夜', '明', '暗',
  '光', '影', '星', '河', '天', '地', '人', '情', '意', '念'
];

let charIdCounter = 0;

export class SpiritChar {
  id: string;
  char: string;
  x: number;
  y: number;
  startY: number;
  targetY: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  riseSpeed: number;
  alpha: number;
  particles: CharParticle[];
  trail: TrailPoint[];
  isFloating: boolean;
  isDispersing: boolean;
  dispersionProgress: number;
  disperseAngle: number;
  disperseSpeed: number;
  swayOffset: number;
  swaySpeed: number;

  constructor(x: number, y: number, isMobile: boolean = false) {
    this.id = `char-${charIdCounter++}`;
    this.char = POETIC_CHARS[Math.floor(Math.random() * POETIC_CHARS.length)];
    this.x = x;
    this.y = y;
    this.startY = y;
    this.targetY = y - (100 + Math.random() * 300);
    this.size = 48 + Math.random() * 16;
    this.rotation = (Math.random() - 0.5) * 10;
    this.rotationSpeed = 0.5 * (Math.random() > 0.5 ? 1 : -1);
    this.riseSpeed = isMobile ? 1 : 2;
    this.alpha = 0;
    this.particles = [];
    this.trail = [];
    this.isFloating = false;
    this.isDispersing = false;
    this.dispersionProgress = 0;
    this.disperseAngle = Math.random() * Math.PI * 2;
    this.disperseSpeed = 100 + Math.random() * 150;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.5 + Math.random() * 0.5;

    this.generateCharParticles();
  }

  private generateCharParticles(): void {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.ceil(this.size * 1.5);
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#000';
    ctx.font = `bold ${this.size}px "Ma Shan Zheng", "ZCOOL XiaoWei", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.char, size / 2, size / 2);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    const step = Math.max(2, Math.floor(this.size / 20));

    for (let py = 0; py < size; py += step) {
      for (let px = 0; px < size; px += step) {
        const idx = (py * size + px) * 4;
        if (data[idx + 3] > 128) {
          this.particles.push({
            x: px - size / 2,
            y: py - size / 2,
            baseX: px - size / 2,
            baseY: py - size / 2,
            radius: 1.5 + Math.random() * 1.5,
            alpha: 0.8 + Math.random() * 0.2,
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 0.5
          });
        }
      }
    }

    if (this.particles.length < 20) {
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * this.size * 0.3;
        this.particles.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
          baseX: Math.cos(angle) * r,
          baseY: Math.sin(angle) * r,
          radius: 2 + Math.random() * 2,
          alpha: 0.8 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.5
        });
      }
    }
  }

  update(delta: number, time: number): boolean {
    if (this.isDispersing) {
      this.dispersionProgress += delta / 3;
      const disperseFactor = this.dispersionProgress;

      this.x += Math.cos(this.disperseAngle) * this.disperseSpeed * delta;
      this.y += Math.sin(this.disperseAngle) * this.disperseSpeed * delta - 50 * delta;
      this.rotation += this.rotationSpeed * 3 * delta;
      this.alpha = Math.max(0, 1 - disperseFactor);

      for (const p of this.particles) {
        p.x = p.baseX + (Math.random() - 0.5) * 50 * disperseFactor;
        p.y = p.baseY + (Math.random() - 0.5) * 50 * disperseFactor;
      }

      return this.dispersionProgress < 1;
    }

    if (this.alpha < 1) {
      this.alpha = Math.min(1, this.alpha + delta * 2);
    }

    if (!this.isFloating) {
      this.y -= this.riseSpeed * 60 * delta;
      if (this.y <= this.targetY) {
        this.y = this.targetY;
        this.isFloating = true;
      }
    } else {
      this.y = this.targetY + Math.sin(time * this.swaySpeed + this.swayOffset) * 5;
      this.x += Math.sin(time * this.swaySpeed * 0.7 + this.swayOffset) * 0.3;
    }

    this.rotation += this.rotationSpeed * delta;

    this.trail.unshift({ x: this.x, y: this.y + this.size * 0.4, alpha: this.alpha });
    if (this.trail.length > 30) {
      this.trail.pop();
    }

    for (const p of this.particles) {
      p.phase += p.speed * delta;
      p.x = p.baseX + Math.sin(p.phase) * 1.5;
      p.y = p.baseY + Math.cos(p.phase * 0.8) * 1.5;
    }

    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0) return;

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      const tAlpha = (1 - i / this.trail.length) * 0.5 * this.alpha;
      const progress = i / this.trail.length;

      const r = Math.floor(212 * (1 - progress) + 247 * progress);
      const g = Math.floor(163 * (1 - progress) + 37 * progress);
      const b = Math.floor(115 * (1 - progress) + 133 * progress);

      ctx.beginPath();
      ctx.arc(t.x, t.y, 1.5 * (1 - i / this.trail.length), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${tAlpha})`;
      ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    for (const p of this.particles) {
      const pAlpha = p.alpha * this.alpha;

      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.radius * 3
      );
      gradient.addColorStop(0, `rgba(255, 220, 180, ${pAlpha * 0.9})`);
      gradient.addColorStop(0.3, `rgba(212, 163, 115, ${pAlpha * 0.6})`);
      gradient.addColorStop(1, 'rgba(247, 37, 133, 0)');

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 240, 220, ${pAlpha})`;
      ctx.fill();
    }

    ctx.restore();
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size * 0.6;
  }

  startDisperse(): void {
    this.isDispersing = true;
    this.dispersionProgress = 0;
  }
}

export class ParticleSystem {
  inkParticles: InkParticle[];
  spiritChars: SpiritChar[];
  burstParticles: BurstParticle[];
  isMobile: boolean;

  constructor(isMobile: boolean = false) {
    this.inkParticles = [];
    this.spiritChars = [];
    this.burstParticles = [];
    this.isMobile = isMobile;
  }

  addInkParticle(x: number, y: number, vx: number, vy: number): void {
    if (this.inkParticles.length < 500) {
      this.inkParticles.push(new InkParticle(x, y, vx, vy));
    }
  }

  addSpiritChar(x: number, y: number): void {
    if (this.spiritChars.length < 20) {
      this.spiritChars.push(new SpiritChar(x, y, this.isMobile));
    }
  }

  addBurst(x: number, y: number): void {
    const count = 20 + Math.floor(Math.random() * 11);
    for (let i = 0; i < count; i++) {
      this.burstParticles.push(new BurstParticle(x, y));
    }
  }

  update(delta: number, time: number): void {
    this.inkParticles = this.inkParticles.filter(p => p.update(delta));
    this.spiritChars = this.spiritChars.filter(c => c.update(delta, time));
    this.burstParticles = this.burstParticles.filter(p => p.update(delta));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.inkParticles) {
      p.draw(ctx);
    }

    for (const c of this.spiritChars) {
      c.draw(ctx);
    }

    for (const p of this.burstParticles) {
      p.draw(ctx);
    }
  }

  getCharAt(x: number, y: number): SpiritChar | null {
    for (let i = this.spiritChars.length - 1; i >= 0; i--) {
      if (this.spiritChars[i].containsPoint(x, y) && !this.spiritChars[i].isDispersing) {
        return this.spiritChars[i];
      }
    }
    return null;
  }

  removeChar(char: SpiritChar): void {
    char.startDisperse();
    this.addBurst(char.x, char.y);
  }

  disperseAll(): void {
    for (const char of this.spiritChars) {
      if (!char.isDispersing) {
        char.startDisperse();
      }
    }
  }

  clear(): void {
    this.inkParticles = [];
    this.spiritChars = [];
    this.burstParticles = [];
  }
}
