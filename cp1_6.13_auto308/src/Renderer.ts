import { GameEngine, LightWheel, LightFragment, Particle, TrailParticle } from './GameEngine';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private time: number = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public render(engine: GameEngine, deltaTime: number): void {
    this.time += deltaTime;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    this.drawWheels(engine);
    this.drawFragments(engine);
    this.drawGate(engine);
    this.drawTrail(engine);
    this.drawParticles(engine);

    if (engine.gameState !== 'falling') {
      this.drawBall(engine);
    }

    this.drawFallParticles(engine);

    if (engine.gameState === 'transition') {
      this.drawTransition(engine);
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(1, '#302b63');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = ((i * 137.5) % this.width);
      const y = ((i * 73.3 + this.time * 10) % this.height);
      const size = (i % 3) + 0.5;
      const alpha = 0.1 + Math.sin(this.time * 2 + i) * 0.05;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawWheels(engine: GameEngine): void {
    const ctx = this.ctx;

    for (const wheel of engine.wheels) {
      this.drawWheel(wheel);
    }
  }

  private drawWheel(wheel: LightWheel): void {
    const ctx = this.ctx;
    const thickness = 4;
    const segmentAngle = (Math.PI * 2 - wheel.gapAngle) / wheel.segmentCount;

    for (let i = 0; i < wheel.segmentCount; i++) {
      const color = wheel.colors[i % wheel.colors.length];
      const startAngle = wheel.rotation + wheel.gapStart + wheel.gapAngle + i * segmentAngle;
      const endAngle = startAngle + segmentAngle - 0.02;

      ctx.save();
      ctx.shadowBlur = wheel.flashTimer > 0 ? 25 : 12;
      ctx.shadowColor = wheel.flashTimer > 0 ? '#ffffff' : color;
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(wheel.centerX, wheel.centerY, wheel.radius, startAngle, endAngle);
      ctx.stroke();

      ctx.shadowBlur = wheel.flashTimer > 0 ? 15 : 4;
      ctx.strokeStyle = this.lightenColor(color, 50);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(wheel.centerX, wheel.centerY, wheel.radius - 1, startAngle, endAngle);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawFragments(engine: GameEngine): void {
    const ctx = this.ctx;
    const blink = Math.sin(this.time * Math.PI * 2 / 0.5) > 0;

    for (const frag of engine.fragments) {
      if (frag.collected) continue;
      if (!blink) continue;
      this.drawFragment(frag);
    }
  }

  private drawFragment(frag: LightFragment): void {
    const ctx = this.ctx;
    const size = 8;

    ctx.save();
    ctx.translate(frag.x, frag.y);
    ctx.rotate(this.time * 2);

    ctx.shadowBlur = 12;
    ctx.shadowColor = frag.color;
    ctx.fillStyle = frag.color;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.866, size * 0.5);
    ctx.lineTo(-size * 0.866, size * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.433, size * 0.25);
    ctx.lineTo(-size * 0.433, size * 0.25);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawGate(engine: GameEngine): void {
    const ctx = this.ctx;
    const gate = engine.gate;

    if (!gate.active && gate.fadeProgress <= 0) return;

    const alpha = gate.fadeProgress;
    const pulse = 1 + Math.sin(this.time * 4) * 0.1;

    ctx.save();
    ctx.translate(gate.x, gate.y);
    ctx.rotate(gate.angle + Math.PI / 2);
    ctx.globalAlpha = alpha;

    ctx.shadowBlur = 25 * pulse;
    ctx.shadowColor = '#ffeb3b';
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 4;
    ctx.strokeRect(-gate.width / 2, -gate.height / 2, gate.width, gate.height);

    const gradient = ctx.createLinearGradient(-gate.width / 2, 0, gate.width / 2, 0);
    gradient.addColorStop(0, 'rgba(255, 235, 59, 0)');
    gradient.addColorStop(0.5, `rgba(255, 235, 59, ${0.3 * pulse})`);
    gradient.addColorStop(1, 'rgba(255, 235, 59, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-gate.width / 2, -gate.height / 2, gate.width, gate.height);

    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-gate.width / 2 + 3, -gate.height / 2 + 3, gate.width - 6, gate.height - 6);

    ctx.restore();
  }

  private drawTrail(engine: GameEngine): void {
    const ctx = this.ctx;

    for (const p of engine.trailParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.7;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#48dbfb';
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#48dbfb');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawParticles(engine: GameEngine): void {
    const ctx = this.ctx;

    for (const p of engine.particles) {
      this.drawSingleParticle(p);
    }
  }

  private drawFallParticles(engine: GameEngine): void {
    const ctx = this.ctx;
    const progress = Math.min(1, engine.fallTimer / 1.2);
    const scale = 1 + progress * 2;

    if (engine.gameState === 'falling' && progress < 0.5) {
      ctx.save();
      ctx.globalAlpha = 1 - progress * 2;
      ctx.translate(engine.ball.x, engine.ball.y);
      ctx.scale(scale, scale);
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff6b6b';
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, engine.ball.radius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#ff6b6b');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, engine.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const p of engine.fallParticles) {
      this.drawSingleParticle(p);
    }
  }

  private drawSingleParticle(p: Particle): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.shadowBlur = 8;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBall(engine: GameEngine): void {
    const ctx = this.ctx;
    const ball = engine.ball;

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#48dbfb';

    const gradient = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      0,
      ball.x,
      ball.y,
      ball.radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#48dbfb');
    gradient.addColorStop(1, '#1e88e5');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTransition(engine: GameEngine): void {
    const ctx = this.ctx;
    const progress = engine.getTransitionProgress();
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const maxRadius = Math.sqrt(this.width ** 2 + this.height ** 2);

    if (progress < 0.5) {
      const p = progress * 2;
      ctx.fillStyle = `rgba(255, 255, 255, ${p})`;
      ctx.fillRect(0, 0, this.width, this.height);

      for (let i = 0; i < 4; i++) {
        const r = p * maxRadius * (1 + i * 0.1);
        ctx.strokeStyle = `rgba(255, 235, 59, ${(1 - p) * 0.5})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      const p = (progress - 0.5) * 2;
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - p})`;
      ctx.fillRect(0, 0, this.width, this.height);

      for (let i = 0; i < 4; i++) {
        const r = (0.5 + p * 0.5) * maxRadius * (1 + i * 0.1);
        ctx.strokeStyle = `rgba(255, 235, 59, ${(1 - p) * 0.5})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private lightenColor(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
    const b = Math.min(255, (num & 0x0000FF) + amount);
    return `rgb(${r}, ${g}, ${b})`;
  }
}
