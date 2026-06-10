import { LightCreature } from './creature';
import { ParticleSystem } from './particle';
import { ControlPanel, UIState } from './ui';

const ASPECT_RATIO = 16 / 9;
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;

class Game {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private creature: LightCreature;
  private particles: ParticleSystem;
  private ui: ControlPanel;

  private canvasWidth: number = BASE_WIDTH;
  private canvasHeight: number = BASE_HEIGHT;

  private mouseX: number = BASE_WIDTH / 2;
  private mouseY: number = BASE_HEIGHT / 2;
  private isMouseDown: boolean = false;
  private isMouseInCanvas: boolean = false;

  private lastTime: number = 0;
  private animationId: number = 0;

  private bgBrightness: number = 1.0;
  private frozen: boolean = false;

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    this.creature = new LightCreature(BASE_WIDTH, BASE_HEIGHT);
    this.particles = new ParticleSystem();

    const initialState: UIState = {
      elasticity: 0.92,
      particlesPerFrame: 6,
      particleLife: 2.0,
      backgroundBrightness: 1.0,
      frozen: false,
      coloringMode: 'random'
    };

    this.ui = new ControlPanel(
      initialState,
      (state) => this.handleUIChange(state),
      () => this.particles.clear()
    );

    this.init();
  }

  private init(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindEvents();

    const overlay = document.getElementById('ui-overlay')!;
    this.ui.mount(overlay);

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private resize(): void {
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let targetW = winW;
    let targetH = winW / ASPECT_RATIO;

    if (targetH > winH) {
      targetH = winH;
      targetW = winH * ASPECT_RATIO;
    }

    const scale = targetW / BASE_WIDTH;
    this.canvas.style.width = `${targetW}px`;
    this.canvas.style.height = `${targetH}px`;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = BASE_WIDTH * dpr;
    this.canvas.height = BASE_HEIGHT * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.canvasWidth = BASE_WIDTH;
    this.canvasHeight = BASE_HEIGHT;

    this.creature.resize(this.canvasWidth, this.canvasHeight);
    void scale;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      const pos = this.getCanvasPos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.isMouseDown = true;

      if (this.creature.hitTest(pos.x, pos.y)) {
        this.creature.triggerGlow();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this.getCanvasPos(e);
      this.mouseX = pos.x;
      this.mouseY = pos.y;
    });

    this.canvas.addEventListener('mouseenter', () => {
      this.isMouseInCanvas = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseInCanvas = false;
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const pos = this.getCanvasPos(touch);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
        this.isMouseDown = true;
        this.isMouseInCanvas = true;

        if (this.creature.hitTest(pos.x, pos.y)) {
          this.creature.triggerGlow();
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const pos = this.getCanvasPos(touch);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isMouseDown = false;
      this.isMouseInCanvas = false;
    }, { passive: false });
  }

  private getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvasWidth / rect.width;
    const scaleY = this.canvasHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleUIChange(state: UIState): void {
    this.creature.elasticity = state.elasticity;
    this.particles.particlesPerFrame = state.particlesPerFrame;
    this.particles.particleLife = state.particleLife;
    this.particles.coloringMode = state.coloringMode;
    this.bgBrightness = state.backgroundBrightness;
    this.frozen = state.frozen;

    if (state.frozen) {
      this.creature.friction = 1.0;
    } else {
      this.creature.friction = 0.95;
    }
  }

  private drawBackground(): void {
    const t = this.bgBrightness;
    const lerp = (a: number, b: number) => Math.round(a + (b - a) * (t - 0.3) / 0.7);

    const darkR = lerp(10, 42);
    const darkG = lerp(10, 42);
    const darkB = lerp(18, 62);

    const gradient = this.ctx.createRadialGradient(
      this.canvasWidth / 2, this.canvasHeight / 2, 0,
      this.canvasWidth / 2, this.canvasHeight / 2, Math.max(this.canvasWidth, this.canvasHeight) * 0.7
    );
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private loop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    const shouldFollow = this.isMouseDown && this.isMouseInCanvas && !this.frozen;
    this.creature.isFollowing = shouldFollow;

    if (shouldFollow) {
      this.creature.setTarget(this.mouseX, this.mouseY);
    }

    if (!this.frozen) {
      this.creature.update();

      const speed = Math.sqrt(
        this.creature.vx * this.creature.vx +
        this.creature.vy * this.creature.vy
      );

      if (speed > 0.5) {
        const tail = this.creature.getTailPosition();
        const angle = this.creature.getHeadAngle();
        this.particles.emit(
          tail.x, tail.y, angle,
          this.mouseX, this.mouseY,
          this.canvasWidth, this.canvasHeight
        );
      }
    }

    this.particles.update(deltaTime, this.frozen);

    this.drawBackground();
    this.particles.draw(this.ctx);
    this.creature.draw(this.ctx);

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
