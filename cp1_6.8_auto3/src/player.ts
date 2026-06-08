export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export type PlayerState = 'running' | 'jumping' | 'sliding' | 'falling' | 'dead';

export class Player {
  x: number;
  y: number;
  width: number;
  height: number;
  normalHeight: number;
  slideHeight: number;
  velocityY: number;
  jumpForce: number;
  gravity: number;
  state: PlayerState;
  groundY: number;
  particles: Particle[];
  maxParticles: number;
  isGrounded: boolean;
  slideDuration: number;
  slideTimer: number;
  hue: number;

  constructor(x: number, groundY: number) {
    this.x = x;
    this.groundY = groundY;
    this.normalHeight = 60;
    this.slideHeight = 30;
    this.width = 40;
    this.height = this.normalHeight;
    this.y = groundY - this.height;
    this.velocityY = 0;
    this.jumpForce = -15;
    this.gravity = 0.6;
    this.state = 'running';
    this.particles = [];
    this.maxParticles = 200;
    this.isGrounded = true;
    this.slideDuration = 0.5;
    this.slideTimer = 0;
    this.hue = 0;
  }

  jump(): boolean {
    if (this.state === 'dead') return false;
    if (this.isGrounded && this.state !== 'sliding') {
      this.velocityY = this.jumpForce;
      this.state = 'jumping';
      this.isGrounded = false;
      this.spawnJumpParticles();
      return true;
    }
    if (this.state === 'sliding') {
      this.endSlide();
      this.velocityY = this.jumpForce * 0.7;
      this.state = 'jumping';
      this.isGrounded = false;
      this.spawnJumpParticles();
      return true;
    }
    return false;
  }

  slide(): boolean {
    if (this.state === 'dead') return false;
    if (this.isGrounded && this.state !== 'sliding') {
      this.state = 'sliding';
      this.height = this.slideHeight;
      this.y = this.groundY - this.height;
      this.slideTimer = this.slideDuration;
      this.spawnSlideParticles();
      return true;
    }
    return false;
  }

  endSlide(): void {
    if (this.state === 'sliding') {
      this.state = 'running';
      this.height = this.normalHeight;
      this.y = this.groundY - this.height;
      this.slideTimer = 0;
    }
  }

  update(deltaTime: number, gameSpeed: number): void {
    if (this.state === 'dead') return;

    this.hue = (this.hue + 2) % 360;

    if (this.state === 'sliding') {
      this.slideTimer -= deltaTime;
      if (this.slideTimer <= 0) {
        this.endSlide();
      }
    }

    if (!this.isGrounded) {
      this.velocityY += this.gravity;
      this.y += this.velocityY;

      if (this.y >= this.groundY - this.height) {
        this.y = this.groundY - this.height;
        this.velocityY = 0;
        this.isGrounded = true;
        if (this.state === 'jumping' || this.state === 'falling') {
          this.state = 'running';
          this.spawnLandParticles();
        }
      } else if (this.velocityY > 0 && this.state === 'jumping') {
        this.state = 'falling';
      }
    }

    if (this.isGrounded && this.state === 'running') {
      this.spawnTrailParticle(gameSpeed);
    }

    this.updateParticles(deltaTime);
  }

  private spawnJumpParticles(): void {
    const colors = ['#00ff88', '#ff0088', '#00ccff', '#ffff00'];
    for (let i = 0; i < 15; i++) {
      this.addParticle({
        x: this.x + this.width / 2,
        y: this.y + this.height,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * -4 + 1,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
      });
    }
  }

  private spawnSlideParticles(): void {
    for (let i = 0; i < 10; i++) {
      this.addParticle({
        x: this.x + this.width / 2,
        y: this.y + this.height,
        vx: -3 - Math.random() * 3,
        vy: -Math.random() * 2,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
        color: '#ff0088',
        size: 2 + Math.random() * 3,
      });
    }
  }

  private spawnLandParticles(): void {
    for (let i = 0; i < 8; i++) {
      this.addParticle({
        x: this.x + this.width / 2 + (Math.random() - 0.5) * 20,
        y: this.y + this.height,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        color: '#00ff88',
        size: 2 + Math.random() * 2,
      });
    }
  }

  private spawnTrailParticle(speed: number): void {
    if (Math.random() > 0.3) return;

    const hue = (this.hue + Math.random() * 30) % 360;
    this.addParticle({
      x: this.x + this.width / 2,
      y: this.y + this.height / 2 + (Math.random() - 0.5) * 20,
      vx: -speed * 0.5 - Math.random() * 2,
      vy: (Math.random() - 0.5) * 1,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      color: `hsl(${hue}, 100%, 60%)`,
      size: 2 + Math.random() * 2,
    });
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawParticles(ctx);
    this.drawPlayer(ctx);
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'dead') return;

    ctx.save();

    const gradient = ctx.createLinearGradient(
      this.x, this.y,
      this.x + this.width, this.y + this.height
    );
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(1, '#00cc66');

    ctx.fillStyle = gradient;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;

    const radius = 8;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';

    const eyeY = this.y + this.height * 0.25;
    const eyeSize = this.state === 'sliding' ? 4 : 6;
    ctx.beginPath();
    ctx.arc(this.x + this.width * 0.35, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.arc(this.x + this.width * 0.65, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a0a2e';
    const pupilOffset = this.state === 'sliding' ? 1.5 : 2;
    ctx.beginPath();
    ctx.arc(this.x + this.width * 0.35 + pupilOffset, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.arc(this.x + this.width * 0.65 + pupilOffset, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === 'sliding') {
      ctx.strokeStyle = '#ff0088';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff0088';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(this.x - 5, this.y + this.height / 2);
      ctx.lineTo(this.x - 15, this.y + this.height / 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    const padding = 5;
    return {
      x: this.x + padding,
      y: this.y + padding,
      width: this.width - padding * 2,
      height: this.height - padding * 2,
    };
  }

  die(): void {
    this.state = 'dead';
  }

  reset(groundY: number): void {
    this.groundY = groundY;
    this.height = this.normalHeight;
    this.y = groundY - this.height;
    this.velocityY = 0;
    this.state = 'running';
    this.isGrounded = true;
    this.slideTimer = 0;
    this.particles = [];
  }

  resize(x: number, groundY: number): void {
    this.x = x;
    this.groundY = groundY;
    if (this.isGrounded) {
      this.y = groundY - this.height;
    }
  }
}
