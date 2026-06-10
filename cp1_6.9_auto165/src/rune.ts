import p5 from 'p5';

export type RuneAttribute = 'fire' | 'frost' | 'thunder' | 'shadow' | 'light';

export interface AttributeColor {
  primary: string;
  glow: string;
  symbol: string;
}

export const ATTRIBUTE_COLORS: Record<RuneAttribute, AttributeColor> = {
  fire: { primary: '#ff4422', glow: '#ff8844', symbol: '火' },
  frost: { primary: '#44aaff', glow: '#88ccff', symbol: '霜' },
  thunder: { primary: '#ffdd22', glow: '#ffee88', symbol: '雷' },
  shadow: { primary: '#aa44cc', glow: '#cc88ff', symbol: '暗' },
  light: { primary: '#ffffff', glow: '#ffffaa', symbol: '光' }
};

export const ATTRIBUTE_MIX: Record<string, string> = {
  'fire+frost': '#cc44aa', 'frost+fire': '#cc44aa',
  'fire+thunder': '#ff8822', 'thunder+fire': '#ff8822',
  'fire+shadow': '#dd2266', 'shadow+fire': '#dd2266',
  'fire+light': '#ffaa66', 'light+fire': '#ffaa66',
  'frost+thunder': '#88ddee', 'thunder+frost': '#88ddee',
  'frost+shadow': '#6666cc', 'shadow+frost': '#6666cc',
  'frost+light': '#aaddff', 'light+frost': '#aaddff',
  'thunder+shadow': '#228833', 'shadow+thunder': '#228833',
  'thunder+light': '#ffee66', 'light+thunder': '#ffee66',
  'shadow+light': '#aa88dd', 'light+shadow': '#aa88dd'
};

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life: number;
  public maxLife: number;
  public color: string;
  public size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.maxLife = 0.5;
    this.life = this.maxLife;
    this.color = color;
    this.size = Math.random() * 3 + 1;
  }

  update(dt: number): void {
    this.life -= dt;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
  }

  draw(p: p5): void {
    if (this.life <= 0) return;
    const alpha = this.life / this.maxLife;
    p.noStroke();
    p.fill(this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
    p.ellipse(this.x, this.y, this.size, this.size);
  }

  isDead(): boolean {
    return this.life <= 0;
  }
}

export class RainParticle {
  public x: number;
  public y: number;
  public vy: number;
  public life: number;
  public color: string;
  public size: number;

  constructor(canvasWidth: number) {
    this.x = Math.random() * canvasWidth;
    this.y = -20;
    this.vy = Math.random() * 8 + 4;
    this.life = 2.0;
    const colors = ['#ff4422', '#44aaff', '#ffdd22', '#aa44cc', '#ffffff', '#88aaff'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.size = Math.random() * 3 + 1;
  }

  update(dt: number, canvasHeight: number): void {
    this.life -= dt;
    this.y += this.vy;
  }

  draw(p: p5): void {
    if (this.life <= 0) return;
    const alpha = Math.min(1, this.life / 2.0);
    p.noStroke();
    p.fill(this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
    p.ellipse(this.x, this.y, this.size, this.size);
  }

  isDead(canvasHeight: number): boolean {
    return this.life <= 0 || this.y > canvasHeight + 20;
  }
}

export class Rune {
  public attribute: RuneAttribute;
  public x: number;
  public y: number;
  public homeX: number;
  public homeY: number;
  public slotIndex: number;
  public isPlaced: boolean;
  public isDragging: boolean;
  public isShaking: boolean;
  public shakeTime: number;
  public pulsePhase: number;
  public flashCount: number;
  public flashTimer: number;
  public isFlashing: boolean;
  public scale: number;
  public connected: number[];
  public particles: Particle[];
  public flowParticles: Array<{ t: number; speed: number }>;

  constructor(attribute: RuneAttribute, x: number, y: number) {
    this.attribute = attribute;
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.slotIndex = -1;
    this.isPlaced = false;
    this.isDragging = false;
    this.isShaking = false;
    this.shakeTime = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.flashCount = 0;
    this.flashTimer = 0;
    this.isFlashing = false;
    this.scale = 1;
    this.connected = [];
    this.particles = [];
    this.flowParticles = [];
    for (let i = 0; i < 5; i++) {
      this.flowParticles.push({
        t: Math.random(),
        speed: 0.3 + Math.random() * 0.4
      });
    }
  }

  static mixColor(a: RuneAttribute, b: RuneAttribute): string {
    const key = `${a}+${b}`;
    return ATTRIBUTE_MIX[key] || '#888888';
  }

  triggerFlash(): void {
    this.isFlashing = true;
    this.flashCount = 0;
    this.flashTimer = 0;
  }

  emitParticles(count?: number): Particle[] {
    const num = count || Math.floor(Math.random() * 31) + 20;
    const color = ATTRIBUTE_COLORS[this.attribute].primary;
    const newParticles: Particle[] = [];
    for (let i = 0; i < num; i++) {
      newParticles.push(new Particle(this.x, this.y, color));
    }
    this.particles = this.particles.concat(newParticles);
    return newParticles;
  }

  update(dt: number, canvasHeight?: number): void {
    this.pulsePhase += dt * Math.PI * 2 * 1.5;

    if (this.isShaking) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) {
        this.isShaking = false;
      }
    }

    if (this.isFlashing) {
      this.flashTimer += dt;
      if (this.flashTimer >= 0.2) {
        this.flashTimer = 0;
        this.flashCount++;
        if (this.flashCount >= 3) {
          this.isFlashing = false;
          this.flashCount = 0;
        }
      }
    }

    for (const fp of this.flowParticles) {
      fp.t += dt * fp.speed;
      if (fp.t > 1) fp.t -= 1;
    }

    this.particles = this.particles.filter(p => {
      p.update(dt);
      return !p.isDead();
    });

    if (this.isDragging) {
      this.scale = 1.2;
    } else if (this.isShaking) {
      this.scale = 1;
    } else {
      this.scale = 1;
    }
  }

  getDrawPosition(): { x: number; y: number } {
    let dx = 0, dy = 0;
    if (this.isShaking) {
      dx = (Math.random() - 0.5) * 2;
      dy = (Math.random() - 0.5) * 2;
    }
    return { x: this.x + dx, y: this.y + dy };
  }

  draw(p: p5): void {
    const pos = this.getDrawPosition();
    const colors = ATTRIBUTE_COLORS[this.attribute];
    const size = 18 * this.scale;

    p.push();
    p.translate(pos.x, pos.y);

    const glowIntensity = this.isFlashing ? (this.flashCount % 2 === 0 ? 2.5 : 0.8) : 1;
    const pulseSize = 1 + Math.sin(this.pulsePhase) * 0.08;

    p.drawingContext.shadowBlur = 20 * glowIntensity;
    p.drawingContext.shadowColor = colors.glow;

    p.noStroke();
    p.fill(colors.primary + '66');
    this.drawHexagon(p, 0, 0, size * pulseSize);

    p.fill(colors.primary + 'aa');
    this.drawHexagon(p, 0, 0, size * 0.75 * pulseSize);

    p.drawingContext.shadowBlur = 10 * glowIntensity;
    p.fill(colors.glow);
    this.drawHexagon(p, 0, 0, size * 0.4 * pulseSize);

    for (const fp of this.flowParticles) {
      const angle = fp.t * Math.PI * 2;
      const r = size * 0.6;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      p.noStroke();
      p.fill(colors.glow + 'cc');
      p.ellipse(px, py, 3, 3);
    }

    p.drawingContext.shadowBlur = 0;
    p.fill('#ffffff');
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(size * 0.7);
    p.textStyle(p.BOLD);
    p.text(colors.symbol, 0, 2);

    p.pop();

    for (const particle of this.particles) {
      particle.draw(p);
    }
  }

  drawHexagon(p: p5, cx: number, cy: number, r: number): void {
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);
  }

  contains(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < 22;
  }

  startShake(): void {
    this.isShaking = true;
    this.shakeTime = 0.3;
  }
}

export class EnergyPulse {
  public fromRune: number;
  public toRune: number;
  public progress: number;
  public speed: number;
  public active: boolean;
  public lineBrightnessTimer: number;

  constructor(from: number, to: number) {
    this.fromRune = from;
    this.toRune = to;
    this.progress = 0;
    this.speed = 2.5;
    this.active = true;
    this.lineBrightnessTimer = 0.4;
  }

  update(dt: number): void {
    this.progress += this.speed * dt;
    this.lineBrightnessTimer -= dt;
    if (this.progress >= 1) {
      this.active = false;
    }
  }

  isLineHighlighted(): boolean {
    return this.lineBrightnessTimer > 0;
  }
}
