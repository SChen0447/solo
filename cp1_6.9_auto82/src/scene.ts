import p5 from 'p5';
import { AnimationManager } from './animation';
import { GameManager } from './game';

interface StarParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

class Scene {
  private p: p5;
  private anim: AnimationManager;
  private game: GameManager;
  private particles: StarParticle[] = [];
  private readonly PARTICLE_COUNT = 300;

  constructor() {
    const sketch = (p: p5) => {
      this.p = p;
      p.setup = () => this.setup();
      p.draw = () => this.draw();
      p.windowResized = () => this.windowResized();
      p.mousePressed = () => this.mousePressed();
      p.mouseReleased = () => this.mouseReleased();
      p.contextMenu = (e: MouseEvent) => {
        e.preventDefault();
        return false;
      };
    };
    new p5(sketch);
  }

  private setup(): void {
    const canvas = this.p.createCanvas(this.p.windowWidth, this.p.windowHeight);
    canvas.style('display', 'block');
    this.p.pixelDensity(1);
    this.p.frameRate(60);

    this.anim = new AnimationManager(this.p);
    this.game = new GameManager(this.p, this.anim);

    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const x = this.p.random(this.p.width);
      const y = this.p.random(this.p.height);
      this.particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: this.p.random(-0.15, 0.15),
        vy: this.p.random(-0.15, 0.15),
        size: this.p.random(0.8, 2.5),
        alpha: this.p.random(0.3, 0.6),
        twinkleSpeed: this.p.random(0.005, 0.02),
        twinkleOffset: this.p.random(this.p.TWO_PI)
      });
    }
  }

  private windowResized(): void {
    this.p.resizeCanvas(this.p.windowWidth, this.p.windowHeight);
    this.initParticles();
    this.game.resetAll();
  }

  private drawBackground(): void {
    const gradient = this.p.drawingContext.createLinearGradient(0, 0, 0, this.p.height);
    gradient.addColorStop(0, '#0a0a2a');
    gradient.addColorStop(1, '#1a0a2a');
    this.p.drawingContext.fillStyle = gradient;
    this.p.noStroke();
    this.p.rect(0, 0, this.p.width, this.p.height);
  }

  private updateAndDrawParticles(): void {
    const particleColor = this.anim.getCurrentParticleColor();
    const baseR = this.p.lerp(200, particleColor.r, 0.4);
    const baseG = this.p.lerp(220, particleColor.g, 0.4);
    const baseB = this.p.lerp(255, particleColor.b, 0.4);

    this.p.noStroke();
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = this.p.width + 10;
      if (p.x > this.p.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.p.height + 10;
      if (p.y > this.p.height + 10) p.y = -10;

      const twinkle = (Math.sin(this.p.millis() * p.twinkleSpeed + p.twinkleOffset) + 1) * 0.5;
      const alpha = p.alpha * (0.5 + twinkle * 0.5);
      const r = this.p.lerp(baseR, particleColor.r, twinkle * 0.3);
      const g = this.p.lerp(baseG, particleColor.g, twinkle * 0.3);
      const b = this.p.lerp(baseB, particleColor.b, twinkle * 0.3);

      this.p.fill(r, g, b, alpha * 255);
      this.p.circle(p.x, p.y, p.size * 2);

      if (p.size > 1.5) {
        this.p.fill(r, g, b, alpha * 60);
        this.p.circle(p.x, p.y, p.size * 4);
      }
    }
  }

  private draw(): void {
    this.anim.updateTrails();
    this.anim.updateHalos();
    this.anim.updateColorTransition();
    this.game.update();

    this.drawBackground();
    this.updateAndDrawParticles();
    this.anim.drawHalos();
    this.game.draw();
  }

  private mousePressed(): void {
    if (this.p.mouseX < 0 || this.p.mouseX > this.p.width ||
        this.p.mouseY < 0 || this.p.mouseY > this.p.height) {
      return;
    }
    this.game.mousePressed(this.p.mouseX, this.p.mouseY, this.p.mouseButton);
  }

  private mouseReleased(): void {
    this.game.mouseReleased(this.p.mouseX, this.p.mouseY, this.p.mouseButton);
  }
}

new Scene();
