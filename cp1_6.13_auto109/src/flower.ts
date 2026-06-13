export interface PetalConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  waveAmplitude: number;
  waveFrequency: number;
  waveOffset: number;
  color: string;
  veinColor: string;
}

export interface SparkleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
}

export class SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
  opacity: number;

  constructor(config: SparkleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.size = config.size;
    this.life = config.life;
    this.maxLife = config.life;
    this.active = true;
    this.opacity = 1;
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.active) return;

    this.x += this.vx * deltaTime * 0.06;
    this.y += this.vy * deltaTime * 0.06;
    this.vy += 0.008 * deltaTime * 0.06;
    this.vx *= 0.995;
    this.life -= deltaTime;
    this.opacity = Math.max(0, this.life / this.maxLife);

    if (this.life <= 0 || 
        this.x < -20 || this.x > canvasWidth + 20 || 
        this.y < -20 || this.y > canvasHeight + 20) {
      this.active = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size
    );
    gradient.addColorStop(0, 'rgba(255, 236, 139, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 215, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = this.opacity * 0.8;
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  reset(config: SparkleConfig): void {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.size = config.size;
    this.life = config.life;
    this.maxLife = config.life;
    this.active = true;
    this.opacity = 1;
  }
}

export class PetalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  waveAmplitude: number;
  waveFrequency: number;
  waveOffset: number;
  startX: number;
  ellipses: Array<{ rx: number; ry: number; angle: number; offsetX: number; offsetY: number }>;
  color: string;
  veinColor: string;
  active: boolean;
  time: number;
  opacity: number;
  isClearing: boolean;
  clearVelocity: { vx: number; vy: number };

  constructor(config: PetalConfig) {
    this.x = config.x;
    this.y = config.y;
    this.startX = config.x;
    this.vx = config.vx;
    this.vy = config.vy;
    this.size = config.size;
    this.rotation = config.rotation;
    this.rotationSpeed = config.rotationSpeed;
    this.waveAmplitude = config.waveAmplitude;
    this.waveFrequency = config.waveFrequency;
    this.waveOffset = config.waveOffset;
    this.color = config.color;
    this.veinColor = config.veinColor;
    this.active = true;
    this.time = 0;
    this.opacity = 1;
    this.isClearing = false;
    this.clearVelocity = { vx: 0, vy: 0 };
    
    this.ellipses = this.generateEllipses();
  }

  private generateEllipses(): Array<{ rx: number; ry: number; angle: number; offsetX: number; offsetY: number }> {
    const count = 3 + Math.floor(Math.random() * 3);
    const ellipses = [];
    for (let i = 0; i < count; i++) {
      ellipses.push({
        rx: this.size * (0.4 + Math.random() * 0.6),
        ry: this.size * (0.25 + Math.random() * 0.35),
        angle: (Math.random() - 0.5) * Math.PI * 0.6,
        offsetX: (Math.random() - 0.5) * this.size * 0.3,
        offsetY: (Math.random() - 0.5) * this.size * 0.2
      });
    }
    return ellipses;
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.active) return;

    this.time += deltaTime;

    if (this.isClearing) {
      this.x += this.clearVelocity.vx * deltaTime * 0.06;
      this.y += this.clearVelocity.vy * deltaTime * 0.06;
      this.opacity -= deltaTime / 300;
    } else {
      this.x += this.vx * deltaTime * 0.06;
      this.y += this.vy * deltaTime * 0.06;
      this.x += Math.sin(this.time * this.waveFrequency * 0.001 + this.waveOffset) * this.waveAmplitude * deltaTime * 0.001;
      this.rotation += this.rotationSpeed * deltaTime * 0.001;
    }

    if (!this.isClearing && (this.y > canvasHeight + 50 || 
        this.x < -50 || this.x > canvasWidth + 50)) {
      this.active = false;
    }

    if (this.opacity <= 0) {
      this.active = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    for (let i = 0; i < this.ellipses.length; i++) {
      const ellipse = this.ellipses[i];
      
      const gradient = ctx.createRadialGradient(
        ellipse.offsetX, ellipse.offsetY, 0,
        ellipse.offsetX, ellipse.offsetY, Math.max(ellipse.rx, ellipse.ry)
      );
      gradient.addColorStop(0, this.color);
      gradient.addColorStop(0.6, this.lightenColor(this.color, 20));
      gradient.addColorStop(1, 'rgba(255, 250, 240, 0.3)');

      ctx.save();
      ctx.translate(ellipse.offsetX, ellipse.offsetY);
      ctx.rotate(ellipse.angle);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, ellipse.rx, ellipse.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = this.veinColor;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = this.opacity * 0.4;
    ctx.beginPath();
    ctx.moveTo(-this.size * 0.4, 0);
    ctx.quadraticCurveTo(0, -this.size * 0.1, this.size * 0.4, 0);
    ctx.stroke();
    
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      ctx.beginPath();
      const startX = i * this.size * 0.12;
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX + Math.sign(i) * this.size * 0.15, -this.size * 0.12);
      ctx.stroke();
    }

    ctx.restore();
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const rotatedX = dx * Math.cos(-this.rotation) - dy * Math.sin(-this.rotation);
    const rotatedY = dx * Math.sin(-this.rotation) + dy * Math.cos(-this.rotation);
    
    return Math.abs(rotatedX) < this.size * 0.8 && 
           Math.abs(rotatedY) < this.size * 0.6;
  }

  startClear(centerX: number, centerY: number): void {
    this.isClearing = true;
    const angle = Math.atan2(this.y - centerY, this.x - centerX);
    const speed = 3 + Math.random() * 4;
    this.clearVelocity.vx = Math.cos(angle) * speed;
    this.clearVelocity.vy = Math.sin(angle) * speed;
  }

  reset(config: PetalConfig): void {
    this.x = config.x;
    this.y = config.y;
    this.startX = config.x;
    this.vx = config.vx;
    this.vy = config.vy;
    this.size = config.size;
    this.rotation = config.rotation;
    this.rotationSpeed = config.rotationSpeed;
    this.waveAmplitude = config.waveAmplitude;
    this.waveFrequency = config.waveFrequency;
    this.waveOffset = config.waveOffset;
    this.color = config.color;
    this.veinColor = config.veinColor;
    this.active = true;
    this.time = 0;
    this.opacity = 1;
    this.isClearing = false;
    this.clearVelocity = { vx: 0, vy: 0 };
    this.ellipses = this.generateEllipses();
  }
}

export class FlowerSystem {
  private petals: PetalParticle[] = [];
  private sparkles: SparkleParticle[] = [];
  private maxPetals = 50;
  private maxSparkles = 40;
  private canvasWidth: number;
  private canvasHeight: number;
  private petalColors = ['#ffb6c1', '#ffc0cb', '#ff69b4', '#ffb7c5', '#ffd1dc', '#fff0f5'];
  private veinColors = ['#db7093', '#c71585', '#ff1493'];

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  spawnPetalsFromCorners(countPerCorner: number = 10): void {
    const corners = [
      { x: -30, y: -30, vxBase: 0.8, vyBase: 0.5 },
      { x: this.canvasWidth + 30, y: -30, vxBase: -0.8, vyBase: 0.5 },
      { x: -30, y: this.canvasHeight + 30, vxBase: 0.8, vyBase: -0.5 },
      { x: this.canvasWidth + 30, y: this.canvasHeight + 30, vxBase: -0.8, vyBase: -0.5 }
    ];

    for (const corner of corners) {
      for (let i = 0; i < countPerCorner; i++) {
        setTimeout(() => {
          this.spawnSinglePetal(corner);
        }, i * 100 + Math.random() * 200);
      }
    }
  }

  private spawnSinglePetal(corner: { x: number; y: number; vxBase: number; vyBase: number }): void {
    const activeCount = this.petals.filter(p => p.active).length;
    if (activeCount >= this.maxPetals) return;

    const config: PetalConfig = {
      x: corner.x + (Math.random() - 0.5) * 100,
      y: corner.y + (Math.random() - 0.5) * 100,
      vx: corner.vxBase * (0.5 + Math.random() * 0.5),
      vy: 0.3 + Math.random() * 0.7,
      size: 12 + Math.random() * 15,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 2,
      waveAmplitude: 10 + Math.random() * 10,
      waveFrequency: 0.3 + Math.random() * 0.2,
      waveOffset: Math.random() * Math.PI * 2,
      color: this.petalColors[Math.floor(Math.random() * this.petalColors.length)],
      veinColor: this.veinColors[Math.floor(Math.random() * this.veinColors.length)]
    };

    const inactive = this.petals.find(p => !p.active);
    if (inactive) {
      inactive.reset(config);
    } else if (this.petals.length < this.maxPetals) {
      this.petals.push(new PetalParticle(config));
    }
  }

  createSparkles(x: number, y: number, count: number = 8): void {
    const activeCount = this.sparkles.filter(s => s.active).length;
    const availableSlots = this.maxSparkles - activeCount;
    const actualCount = Math.min(count, availableSlots);

    for (let i = 0; i < actualCount; i++) {
      const angle = (i / actualCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      const config: SparkleConfig = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 3,
        life: 500 + Math.random() * 200
      };

      const inactive = this.sparkles.find(s => !s.active);
      if (inactive) {
        inactive.reset(config);
      } else if (this.sparkles.length < this.maxSparkles) {
        this.sparkles.push(new SparkleParticle(config));
      }
    }
  }

  handleClick(x: number, y: number): boolean {
    for (let i = this.petals.length - 1; i >= 0; i--) {
      const petal = this.petals[i];
      if (petal.active && !petal.isClearing && petal.containsPoint(x, y)) {
        this.createSparkles(petal.x, petal.y, 8);
        petal.active = false;
        return true;
      }
    }
    return false;
  }

  update(deltaTime: number): void {
    for (const petal of this.petals) {
      if (petal.active) {
        petal.update(deltaTime, this.canvasWidth, this.canvasHeight);
      }
    }

    for (const sparkle of this.sparkles) {
      if (sparkle.active) {
        sparkle.update(deltaTime, this.canvasWidth, this.canvasHeight);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const petal of this.petals) {
      if (petal.active) {
        petal.render(ctx);
      }
    }

    for (const sparkle of this.sparkles) {
      if (sparkle.active) {
        sparkle.render(ctx);
      }
    }
  }

  clear(centerX: number, centerY: number): void {
    for (const petal of this.petals) {
      if (petal.active && !petal.isClearing) {
        petal.startClear(centerX, centerY);
      }
    }
    for (const sparkle of this.sparkles) {
      if (sparkle.active) {
        sparkle.active = false;
      }
    }
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  getActiveParticleCount(): { petals: number; sparkles: number } {
    return {
      petals: this.petals.filter(p => p.active).length,
      sparkles: this.sparkles.filter(s => s.active).length
    };
  }

  getPetalCountPerCorner(): number {
    if (this.canvasWidth >= 1280) return 10 + Math.floor(Math.random() * 3);
    if (this.canvasWidth >= 768) return 7 + Math.floor(Math.random() * 4);
    return 5 + Math.floor(Math.random() * 4);
  }
}
