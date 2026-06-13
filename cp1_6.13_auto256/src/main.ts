import { ColorEngine, ThemeMode } from './colorEngine';
import { AudioEngine } from './audioEngine';

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface SmoothValue {
  current: number;
  target: number;
  smoothing: number;
}

const smooth = (value: SmoothValue): number => {
  value.current += (value.target - value.current) * value.smoothing;
  return value.current;
};

const TWO_PI = Math.PI * 2;

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private colorEngine: ColorEngine;
  private audioEngine: AudioEngine;

  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private mouseX: SmoothValue = { current: 0.5, target: 0.5, smoothing: 0.08 };
  private mouseY: SmoothValue = { current: 0.5, target: 0.5, smoothing: 0.08 };

  private discRotation: SmoothValue = { current: 0, target: 0, smoothing: 0.04 };
  private discRotationSpeed: number = 0.0015;

  private particles: Particle[] = [];
  private particleCount: number = 100;
  private particleScatterTime: number = 0;

  private gradientSpeed: SmoothValue = { current: 4, target: 4, smoothing: 0.1 };
  private gradientProgress: number = 0;

  private waveformArcCount: number = 3;
  private waveformPhase: number = 0;

  private lastTime: number = 0;
  private rafId: number | null = null;

  private hoveredSector: number = -1;
  private audioInited: boolean = false;

  private colorValueEl: HTMLElement;
  private waveformContainer: HTMLElement;
  private navTitleEl: HTMLElement;
  private menuIconSpans: NodeListOf<HTMLSpanElement>;
  private fullscreenBtn: HTMLElement;
  private fullscreenIcon: SVGElement;
  private themeButtons: NodeListOf<HTMLElement>;

  private isMobile: boolean = false;

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.colorEngine = new ColorEngine();
    this.audioEngine = new AudioEngine();

    this.colorValueEl = document.getElementById('color-value')!;
    this.waveformContainer = document.getElementById('waveform-indicator')!;
    this.navTitleEl = document.getElementById('nav-title')!;
    this.menuIconSpans = document.querySelectorAll('.menu-icon span') as NodeListOf<HTMLSpanElement>;
    this.fullscreenBtn = document.getElementById('fullscreen-btn')!;
    this.fullscreenIcon = this.fullscreenBtn.querySelector('svg')!;
    this.themeButtons = document.querySelectorAll('.theme-btn') as NodeListOf<HTMLElement>;

    this.init();
  }

  private init(): void {
    this.checkMobile();
    this.resize();
    this.initParticles();
    this.bindEvents();
    this.buildWaveformIndicator();
    this.updateDomColors();
    this.lastTime = performance.now();
    this.animate();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.checkMobile();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(initial: boolean = false): Particle {
    return {
      x: initial ? Math.random() * this.width : this.width / 2,
      y: initial ? Math.random() * this.height : this.height / 2,
      targetX: Math.random() * this.width,
      targetY: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      size: 2 + Math.random() * 3,
      alpha: 0.2 + Math.random() * 0.3,
      color: this.colorEngine.getRandomPaletteColor(),
    };
  }

  private scatterParticles(): void {
    this.particleScatterTime = 0.8;
    this.particles.forEach((p) => {
      p.targetX = Math.random() * this.width;
      p.targetY = Math.random() * this.height;
      p.color = this.colorEngine.getRandomPaletteColor();
      const angle = Math.random() * TWO_PI;
      const force = 50 + Math.random() * 100;
      p.x = Math.max(0, Math.min(this.width, p.x + Math.cos(angle) * force));
      p.y = Math.max(0, Math.min(this.height, p.y + Math.sin(angle) * force));
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    this.themeButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const theme = btn.dataset.theme as ThemeMode;
        await this.ensureAudio();
        this.switchTheme(theme);
      });
    });

    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    document.addEventListener('click', async () => {
      await this.ensureAudio();
    }, { once: false });

    window.addEventListener('keydown', async () => {
      await this.ensureAudio();
    }, { once: false });
  }

  private async ensureAudio(): Promise<void> {
    if (this.audioInited) return;
    try {
      await this.audioEngine.init();
      this.audioEngine.setBpm(100);
      this.audioEngine.startAmbientLoop(this.colorEngine.getPalette());
      this.audioInited = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const nx = e.clientX / this.width;
    const ny = e.clientY / this.height;
    this.mouseX.target = nx;
    this.mouseY.target = ny;
    this.colorEngine.setMousePosition(nx, ny);

    const cx = this.width / 2;
    const cy = this.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const angle = Math.atan2(dy, dx);
    this.discRotation.target = angle * 0.15;

    const sector = this.getSectorAtPoint(e.clientX, e.clientY);
    if (sector !== this.hoveredSector) {
      if (sector >= 0) {
        const colors = this.colorEngine.getSectorColors();
        const palette = this.colorEngine.getPalette();
        this.audioEngine.playNote(palette[sector], 0.6);
        this.audioEngine.playSectorHighlight(palette[sector]);
      } else {
        this.audioEngine.releaseSectorNotes();
      }
      this.hoveredSector = sector;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;

    if (delta > 0) {
      if (this.waveformArcCount < 12) {
        this.waveformArcCount = Math.min(12, this.waveformArcCount + 3);
      }
      this.gradientSpeed.target = Math.max(2, this.gradientSpeed.target - 1);
    } else {
      if (this.waveformArcCount > 3) {
        this.waveformArcCount = Math.max(3, this.waveformArcCount - 3);
      }
      this.gradientSpeed.target = Math.min(8, this.gradientSpeed.target + 1);
    }

    this.audioEngine.setBpm(delta > 0 ? 140 : delta < 0 ? 70 : 100);
    this.scatterParticles();
    this.buildWaveformIndicator();
  }

  private getSectorAtPoint(px: number, py: number): number {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const discRadius = this.getDiscRadius();
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > discRadius) return -1;

    let angle = Math.atan2(dy, dx);
    angle = (angle + TWO_PI) % TWO_PI;
    angle = (angle + this.discRotation.current + Math.PI / 2 + TWO_PI) % TWO_PI;

    return Math.floor((angle / TWO_PI) * 12) % 12;
  }

  private getDiscRadius(): number {
    return this.isMobile ? 125 : 200;
  }

  private switchTheme(theme: ThemeMode): void {
    const fromColor = this.colorEngine.getCurrentColor();
    this.colorEngine.switchTheme(theme);
    const toColor = this.colorEngine.getCurrentColor();

    this.audioEngine.playThemeTransition(fromColor, toColor);

    setTimeout(() => {
      this.audioEngine.updateLoopColors(this.colorEngine.getPalette());
    }, 800);

    this.scatterParticles();
    this.updateDomColors();
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  private buildWaveformIndicator(): void {
    this.waveformContainer.innerHTML = '';
    const colors = this.colorEngine.getWaveformColors(this.waveformArcCount);
    colors.forEach((color, i) => {
      const bar = document.createElement('div');
      bar.style.width = '4px';
      bar.style.height = '40px';
      bar.style.borderRadius = '2px';
      bar.style.backgroundColor = color;
      bar.style.boxShadow = `0 0 10px ${color}`;
      bar.style.transition = 'transform 0.25s ease';
      bar.style.transformOrigin = 'center';
      bar.className = 'waveform-bar';
      bar.dataset.phase = String(i / this.waveformArcCount);
      this.waveformContainer.appendChild(bar);
    });
  }

  private updateDomColors(): void {
    const currentColor = this.colorEngine.getCurrentColor();
    this.colorValueEl.textContent = currentColor;
    this.colorValueEl.style.color = currentColor;
    this.navTitleEl.style.color = currentColor;
    this.menuIconSpans.forEach((span) => {
      span.style.backgroundColor = currentColor;
    });
    this.fullscreenIcon.style.stroke = currentColor;
    this.buildWaveformIndicator();
  }

  private drawBackground(dt: number): void {
    smooth(this.gradientSpeed);
    this.gradientProgress += dt / this.gradientSpeed.current;

    const { top, bottom } = this.colorEngine.getGradientColors();
    const mx = smooth(this.mouseX);
    const my = smooth(this.mouseY);

    const cx = mx * this.width;
    const cy = my * this.height;
    const maxDim = Math.max(this.width, this.height);

    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawParticles(dt: number): void {
    if (this.particleScatterTime > 0) {
      this.particleScatterTime -= dt;
    }

    const t = this.particleScatterTime > 0 ? 1 - this.particleScatterTime / 0.8 : 1;

    this.particles.forEach((p) => {
      if (this.particleScatterTime > 0) {
        p.x += (p.targetX - p.x) * 0.04;
        p.y += (p.targetY - p.y) * 0.04;
      } else {
        p.x += p.vx * (0.3 + Math.random() * 1.2);
        p.y += p.vy * (0.3 + Math.random() * 1.2);

        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    });
  }

  private drawDisc(dt: number): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const radius = this.getDiscRadius();

    smooth(this.discRotation);
    this.discRotation.current += this.discRotationSpeed;

    const sectorColors = this.colorEngine.getSectorColors();
    const activeIdx = this.colorEngine.getActiveSectorIndex();

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(this.discRotation.current);

    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius + 15, 0, TWO_PI);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.fill();

    const sectorAngle = TWO_PI / 12;

    for (let i = 0; i < 12; i++) {
      const startAngle = i * sectorAngle - Math.PI / 2;
      const endAngle = startAngle + sectorAngle;
      const isActive = i === activeIdx;
      const r = radius + (isActive ? 6 : 0);

      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, r, startAngle, endAngle);
      this.ctx.closePath();
      this.ctx.fillStyle = isActive ? sectorColors[i].highlight : sectorColors[i].fill;
      this.ctx.fill();

      if (isActive) {
        this.ctx.shadowColor = this.colorEngine.getPalette()[i];
        this.ctx.shadowBlur = 20;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }

    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    this.ctx.shadowBlur = 8;

    for (let i = 0; i < 12; i++) {
      const angle = i * sectorAngle - Math.PI / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      this.ctx.stroke();
    }

    this.ctx.shadowBlur = 0;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, TWO_PI);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(0, 0, 25, 0, TWO_PI);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 18, 0, TWO_PI);
    this.ctx.fillStyle = this.colorEngine.getCurrentColor();
    this.ctx.fill();

    this.ctx.restore();
  }

  private updateWaveform(dt: number): void {
    this.waveformPhase += dt / 0.5;
    const bars = this.waveformContainer.querySelectorAll('.waveform-bar') as NodeListOf<HTMLElement>;
    bars.forEach((bar, i) => {
      const phase = parseFloat(bar.dataset.phase || '0');
      const pulse = Math.sin(this.waveformPhase * TWO_PI + phase * TWO_PI) * 0.5 + 0.5;
      const scale = 0.3 + pulse * 0.7;
      bar.style.transform = `scaleY(${scale})`;
    });
  }

  private animate = (): void => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.colorEngine.updateTransition(dt);

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(dt);
    this.drawParticles(dt);
    this.drawDisc(dt);
    this.updateWaveform(dt);

    this.updateDomColors();

    this.rafId = requestAnimationFrame(this.animate);
  };

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.audioEngine.stopAmbientLoop();
  }
}

const app = new App();
(window as any).__app = app;
