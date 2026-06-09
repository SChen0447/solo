import { Aurora } from './aurora';
import { EffectsManager } from './effects';

class AuroraApp {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  aurora: Aurora;
  effects: EffectsManager;
  lastTime: number = 0;
  animationId: number = 0;
  isPanelCollapsed: boolean = false;

  private speedSlider: HTMLInputElement;
  private countSlider: HTMLInputElement;
  private speedValue: HTMLSpanElement;
  private countValue: HTMLSpanElement;
  private controlPanel: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private colorBtns: NodeListOf<HTMLButtonElement>;
  private resetBtn: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('aurora-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;

    this.setupCanvas();

    this.aurora = new Aurora(this.canvas.width, this.canvas.height);
    this.effects = new EffectsManager(this.canvas);

    this.controlPanel = document.getElementById('control-panel') as HTMLDivElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.countSlider = document.getElementById('count-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value') as HTMLSpanElement;
    this.countValue = document.getElementById('count-value') as HTMLSpanElement;
    this.toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.colorBtns = document.querySelectorAll('.color-btn') as NodeListOf<HTMLButtonElement>;

    this.setupControls();
    this.setupEffects();
    this.handleResize();

    window.addEventListener('resize', () => this.handleResize());
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);
  }

  private setupControls(): void {
    this.speedSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      this.aurora.setSpeed(value);
      this.speedValue.textContent = value.toFixed(1);
    });

    this.countSlider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value, 10);
      this.aurora.setBandCount(value);
      this.countValue.textContent = value.toString();
    });

    this.colorBtns.forEach((btn: HTMLButtonElement) => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        if (color) {
          this.aurora.setPrimaryColor(color);
          this.colorBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });

    this.resetBtn.addEventListener('click', () => {
      this.aurora.reset();
      this.speedSlider.value = '1.0';
      this.countSlider.value = '4';
      this.speedValue.textContent = '1.0';
      this.countValue.textContent = '4';
      this.colorBtns.forEach((b, i) => {
        b.classList.toggle('active', i === 0);
      });
    });

    this.toggleBtn.addEventListener('click', () => {
      this.isPanelCollapsed = !this.isPanelCollapsed;
      this.controlPanel.classList.toggle('collapsed', this.isPanelCollapsed);
    });

    this.checkResponsive();
    window.addEventListener('resize', () => this.checkResponsive());
  }

  private checkResponsive(): void {
    if (window.innerWidth < 768) {
      this.controlPanel.classList.add('collapsed');
      this.isPanelCollapsed = true;
    } else {
      this.controlPanel.classList.remove('collapsed');
      this.isPanelCollapsed = false;
    }
  }

  private setupEffects(): void {
    this.effects.bindMouseEvents({
      onMove: (offset: number) => {
        this.aurora.setMouseOffset(offset);
      },
      onClick: (x: number, y: number) => {
        this.effects.addRipple(x, y, this.aurora.primaryColor);
      }
    });
  }

  private handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const oldWidth = this.canvas.width / dpr;
    const oldHeight = this.canvas.height / dpr;

    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    if (oldWidth !== newWidth || oldHeight !== newHeight) {
      this.aurora.resize(newWidth, newHeight);
    }
  }

  private animate(currentTime: number): void {
    const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 1 / 60;
    this.lastTime = currentTime;

    const clampedDelta = Math.min(deltaTime, 0.05);

    this.aurora.update(clampedDelta);
    this.effects.update(clampedDelta, this.aurora.bands);

    this.aurora.render(this.ctx);
    this.effects.render(this.ctx);

    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  start(): void {
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new AuroraApp();
  app.start();
});
