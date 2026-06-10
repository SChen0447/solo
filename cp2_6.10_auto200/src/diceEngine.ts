export interface Dice3D {
  id: string;
  sides: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  finalValue: number;
  settled: boolean;
  color: string;
  size: number;
}

export interface DiceEngineOptions {
  width: number;
  height: number;
  animationDuration: number;
}

export class DiceEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dice: Dice3D[] = [];
  private animationId: number | null = null;
  private startTime: number = 0;
  private options: DiceEngineOptions;
  private onCompleteCallback: ((results: { id: string; sides: number; value: number }[]) => void) | null = null;
  private isAnimating: boolean = false;

  private static readonly DICE_COLORS: Record<number, string> = {
    6: '#f4a261',
    8: '#e76f51',
    10: '#2a9d8f',
    20: '#9b5de5'
  };

  constructor(canvas: HTMLCanvasElement, options: DiceEngineOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.options = options;
  }

  public roll(diceConfigs: { id: string; sides: number }[]): Promise<{ id: string; sides: number; value: number }[]> {
    if (this.isAnimating) {
      return Promise.reject(new Error('骰子正在滚动中'));
    }

    this.isAnimating = true;
    this.dice = this.initializeDice(diceConfigs);
    this.startTime = performance.now();

    return new Promise((resolve) => {
      this.onCompleteCallback = resolve;
      this.animate();
    });
  }

  private initializeDice(configs: { id: string; sides: number }[]): Dice3D[] {
    const count = configs.length;
    return configs.map((config, index) => {
      const angle = (index / Math.max(count, 1)) * Math.PI * 2;
      const radius = count > 1 ? 80 : 0;
      const baseX = this.options.width / 2 + Math.cos(angle) * radius;
      const baseY = this.options.height / 2 + Math.sin(angle) * radius;

      return {
        id: config.id,
        sides: config.sides,
        x: baseX + (Math.random() - 0.5) * 40,
        y: baseY + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 400,
        vy: (Math.random() - 0.5) * 400,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 30,
        finalValue: Math.floor(Math.random() * config.sides) + 1,
        settled: false,
        color: DiceEngine.DICE_COLORS[config.sides] || '#666666',
        size: 50
      };
    });
  }

  private animate(): void {
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.options.animationDuration, 1);

    this.updatePhysics(progress);
    this.render(progress);

    if (progress < 1) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.finishAnimation();
    }
  }

  private updatePhysics(progress: number): void {
    const damping = Math.pow(1 - progress, 2) * 0.98 + 0.02;
    const gravity = 200 * (1 - progress);

    for (const die of this.dice) {
      if (progress > 0.85) {
        die.settled = true;
        die.vx = 0;
        die.vy = 0;
        die.rotationSpeed = 0;
        continue;
      }

      die.vy += gravity * 0.016;
      die.vx *= damping;
      die.vy *= damping;
      die.rotationSpeed *= damping;

      die.x += die.vx * 0.016;
      die.y += die.vy * 0.016;
      die.rotation += die.rotationSpeed * 0.016;

      const halfSize = die.size / 2;
      const margin = 20;

      if (die.x - halfSize < margin) {
        die.x = margin + halfSize;
        die.vx = Math.abs(die.vx) * 0.7;
      } else if (die.x + halfSize > this.options.width - margin) {
        die.x = this.options.width - margin - halfSize;
        die.vx = -Math.abs(die.vx) * 0.7;
      }

      if (die.y - halfSize < margin) {
        die.y = margin + halfSize;
        die.vy = Math.abs(die.vy) * 0.7;
      } else if (die.y + halfSize > this.options.height - margin) {
        die.y = this.options.height - margin - halfSize;
        die.vy = -Math.abs(die.vy) * 0.7;
      }
    }

    this.handleCollisions();
  }

  private handleCollisions(): void {
    for (let i = 0; i < this.dice.length; i++) {
      for (let j = i + 1; j < this.dice.length; j++) {
        const a = this.dice[i];
        const b = this.dice[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (a.size + b.size) / 2;

        if (dist < minDist && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minDist - dist) / 2;

          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          const dvx = b.vx - a.vx;
          const dvy = b.vy - a.vy;
          const dvn = dvx * nx + dvy * ny;

          if (dvn < 0) {
            const impulse = dvn * 0.8;
            a.vx += impulse * nx;
            a.vy += impulse * ny;
            b.vx -= impulse * nx;
            b.vy -= impulse * ny;
          }
        }
      }
    }
  }

  private render(progress: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.options.width, this.options.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.options.width, this.options.height);

    for (const die of this.dice) {
      this.drawDice(die, progress);
    }
  }

  private drawDice(die: Dice3D, progress: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(die.x, die.y);

    if (!die.settled) {
      ctx.rotate(die.rotation);
    }

    const size = die.size;
    const halfSize = size / 2;
    const displayValue = die.settled ? die.finalValue : Math.floor(Math.random() * die.sides) + 1;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    const cornerRadius = 8;
    ctx.beginPath();
    ctx.moveTo(-halfSize + cornerRadius, -halfSize);
    ctx.lineTo(halfSize - cornerRadius, -halfSize);
    ctx.quadraticCurveTo(halfSize, -halfSize, halfSize, -halfSize + cornerRadius);
    ctx.lineTo(halfSize, halfSize - cornerRadius);
    ctx.quadraticCurveTo(halfSize, halfSize, halfSize - cornerRadius, halfSize);
    ctx.lineTo(-halfSize + cornerRadius, halfSize);
    ctx.quadraticCurveTo(-halfSize, halfSize, -halfSize, halfSize - cornerRadius);
    ctx.lineTo(-halfSize, -halfSize + cornerRadius);
    ctx.quadraticCurveTo(-halfSize, -halfSize, -halfSize + cornerRadius, -halfSize);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
    gradient.addColorStop(0, this.lightenColor(die.color, 20));
    gradient.addColorStop(1, die.color);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (!die.settled) {
      ctx.rotate(-die.rotation);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.5}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 2;
    ctx.fillText(displayValue.toString(), 0, 2);

    ctx.restore();
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private finishAnimation(): void {
    const pauseStart = performance.now();
    const pauseDuration = 1000;

    const waitAndFinish = () => {
      if (performance.now() - pauseStart < pauseDuration) {
        this.render(1);
        requestAnimationFrame(waitAndFinish);
      } else {
        this.isAnimating = false;
        const results = this.dice.map((d) => ({
          id: d.id,
          sides: d.sides,
          value: d.finalValue
        }));
        if (this.onCompleteCallback) {
          this.onCompleteCallback(results);
          this.onCompleteCallback = null;
        }
      }
    };

    waitAndFinish();
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
