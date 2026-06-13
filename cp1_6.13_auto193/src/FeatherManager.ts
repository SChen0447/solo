import gsap from 'gsap';
import { FeatherRenderer, FeatherData, Ripple, Sparkle } from './FeatherRenderer';

const COLOR_PALETTE: [string, string][] = [
  ['#e8a0bf', '#c77d9a'],
  ['#a0d6e8', '#7ab8d1'],
  ['#f0e68c', '#d4c96a'],
  ['#c9a0dc', '#a77cc0'],
  ['#a0e8c9', '#7ad1aa'],
  ['#e8c9a0', '#d1aa7d'],
  ['#dcbeff', '#b894e8'],
  ['#b0e0e6', '#87c0c8'],
  ['#f5deb3', '#dbb98a'],
  ['#dda0dd', '#c07dc0'],
  ['#add8e6', '#87b8d6'],
  ['#ffb6c1', '#e894a0'],
  ['#98fb98', '#7cd67c'],
  ['#e6e6fa', '#c8c8e8'],
  ['#ffe4b5', '#e6c98a'],
  ['#d8bfd8', '#b898b8'],
  ['#87ceeb', '#68b0d0'],
  ['#ffdab9', '#e6b88a'],
  ['#f0fff0', '#c8e6c8'],
  ['#e0ffff', '#b8e6e6'],
  ['#fff0f5', '#e6c8d8'],
  ['#f5f5dc', '#dcdcc0'],
  ['#faebd7', '#e6d0a8'],
  ['#ffefd5', '#e6d0a0'],
];

const FEATHER_COUNT = 120;

export class FeatherManager {
  private renderer: FeatherRenderer;
  private canvas: HTMLCanvasElement;
  private feathers: FeatherData[] = [];
  private ripples: Ripple[] = [];
  private sparkles: Sparkle[] = [];
  private animationId: number | null = null;
  private lastTime: number = 0;
  private hoveredFeatherId: number | null = null;
  private onFeatherCountChange?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new FeatherRenderer(canvas);
    this.generateFeathers();
    this.bindEvents();
    this.start();
  }

  private getRandomColorPair(): [string, string] {
    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  }

  getFeatherCount(): number {
    return this.feathers.length;
  }

  setOnFeatherCountChange(callback: () => void): void {
    this.onFeatherCountChange = callback;
  }

  private generateFeathers(): void {
    const { width, height } = this.renderer.getViewportSize();
    this.feathers = [];
    for (let i = 0; i < FEATHER_COUNT; i++) {
      const length = 30 + Math.random() * 30;
      const w = 8 + Math.random() * 7;
      const [c1, c2] = this.getRandomColorPair();
      const baseAngle = Math.random() * 360;
      this.feathers.push({
        id: i,
        x: 20 + Math.random() * (width - 40),
        y: 20 + Math.random() * (height - 40),
        length,
        width: w,
        angle: baseAngle,
        baseAngle,
        color1: c1,
        color2: c2,
        baseColor1: c1,
        baseColor2: c2,
        hovered: false,
        clicked: false,
        scale: 1,
        bendAngle: 0,
        alpha: 1,
        unfoldProgress: 0,
        highlightGold: false,
      });
    }
    this.onFeatherCountChange?.();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.renderer.resize();
    const { width, height } = this.renderer.getViewportSize();
    for (const f of this.feathers) {
      f.x = Math.min(Math.max(f.x, 20), width - 20);
      f.y = Math.min(Math.max(f.y, 20), height - 20);
    }
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private isPointInFeather(px: number, py: number, f: FeatherData): boolean {
    const dx = px - f.x;
    const dy = py - f.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < f.length * 0.6 * f.scale + f.width * f.scale;
  }

  private findFeatherAt(x: number, y: number): FeatherData | null {
    for (let i = this.feathers.length - 1; i >= 0; i--) {
      if (this.isPointInFeather(x, y, this.feathers[i])) {
        return this.feathers[i];
      }
    }
    return null;
  }

  private handleMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    const feather = this.findFeatherAt(x, y);

    if (feather) {
      if (this.hoveredFeatherId !== feather.id) {
        if (this.hoveredFeatherId !== null) {
          const prev = this.feathers.find(f => f.id === this.hoveredFeatherId);
          if (prev) this.applyHoverState(prev, false);
        }
        this.hoveredFeatherId = feather.id;
        this.applyHoverState(feather, true);
        this.spawnSparkles(feather);
      }
      this.canvas.style.cursor = 'pointer';
    } else {
      if (this.hoveredFeatherId !== null) {
        const prev = this.feathers.find(f => f.id === this.hoveredFeatherId);
        if (prev) this.applyHoverState(prev, false);
        this.hoveredFeatherId = null;
      }
      this.canvas.style.cursor = 'default';
    }
  }

  private handleMouseLeave(): void {
    if (this.hoveredFeatherId !== null) {
      const prev = this.feathers.find(f => f.id === this.hoveredFeatherId);
      if (prev) this.applyHoverState(prev, false);
      this.hoveredFeatherId = null;
    }
  }

  private applyHoverState(feather: FeatherData, hovered: boolean): void {
    feather.hovered = hovered;
    gsap.to(feather, {
      bendAngle: hovered ? 5 : 0,
      scale: hovered ? 1.15 : 1,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  private spawnSparkles(feather: FeatherData): void {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI;
      const speed = 0.5 + Math.random() * 1.5;
      this.sparkles.push({
        x: feather.x + (Math.random() - 0.5) * feather.width,
        y: feather.y - Math.random() * feather.length * 0.5,
        vx: Math.cos(angle - Math.PI / 2) * speed * 0.5,
        vy: -Math.abs(Math.sin(angle - Math.PI / 2) * speed) - 0.5,
        size: 2 + Math.random() * 2,
        color: feather.color1,
        alpha: 0.8,
        life: 0,
        maxLife: 1.5,
      });
    }
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    const feather = this.findFeatherAt(x, y);
    if (feather) {
      this.triggerChainReaction(feather);
    }
  }

  private findNearestFeathers(target: FeatherData, count: number): FeatherData[] {
    const others = this.feathers.filter(f => f.id !== target.id);
    others.sort((a, b) => {
      const da = (a.x - target.x) ** 2 + (a.y - target.y) ** 2;
      const db = (b.x - target.x) ** 2 + (b.y - target.y) ** 2;
      return da - db;
    });
    return others.slice(0, count);
  }

  private triggerChainReaction(target: FeatherData): void {
    target.highlightGold = true;
    gsap.to(target, {
      scale: 1.3,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
    });

    this.ripples.push({
      x: target.x,
      y: target.y,
      radius: 0,
      maxRadius: 80,
      alpha: 0.9,
      color: '#ffd700',
    });

    const nearest = this.findNearestFeathers(target, 8);
    nearest.forEach((f, idx) => {
      const delay = 0.4 + (idx / nearest.length) * 0.8;
      setTimeout(() => this.unfoldFeather(f), delay * 1000);
    });

    setTimeout(() => {
      target.highlightGold = false;
      nearest.forEach((f, idx) => {
        setTimeout(() => this.restoreFeather(f), idx * 80);
      });
    }, 2000);
  }

  private unfoldFeather(feather: FeatherData): void {
    const [newC1, newC2] = this.getRandomColorPair();
    gsap.to(feather, {
      scale: 0.7,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        feather.color1 = newC1;
        feather.color2 = newC2;
        gsap.to(feather, {
          scale: 1,
          angle: feather.baseAngle + (Math.random() - 0.5) * 30,
          duration: 0.4,
          ease: 'elastic.out(1, 0.5)',
        });
      },
    });
    feather.unfoldProgress = 1;
  }

  private restoreFeather(feather: FeatherData): void {
    gsap.to(feather, {
      color1: feather.baseColor1,
      color2: feather.baseColor2,
      angle: feather.baseAngle,
      unfoldProgress: 0,
      duration: 2,
      ease: 'power2.out',
    });
  }

  reset(): Promise<void> {
    return new Promise(resolve => {
      const indices = this.feathers.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      indices.forEach((idx, i) => {
        const f = this.feathers[idx];
        setTimeout(() => {
          f.highlightGold = false;
          gsap.to(f, {
            color1: f.baseColor1,
            color2: f.baseColor2,
            angle: f.baseAngle,
            scale: 1,
            bendAngle: 0,
            hovered: false,
            unfoldProgress: 0,
            duration: 1,
            ease: 'power2.out',
          });
        }, i * 5);
      });
      setTimeout(resolve, 1000 + indices.length * 5);
    });
  }

  saveImage(): void {
    const dataUrl = this.renderer.toDataURL();
    const link = document.createElement('a');
    link.download = `翎羽卷轴_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  randomizeColors(): Promise<void> {
    return new Promise(resolve => {
      const sorted = [...this.feathers].sort((a, b) => a.x - b.x);
      sorted.forEach((f, i) => {
        setTimeout(() => {
          const [c1, c2] = this.getRandomColorPair();
          f.baseColor1 = c1;
          f.baseColor2 = c2;
          gsap.to(f, {
            color1: c1,
            color2: c2,
            duration: 0.8,
            ease: 'power2.out',
          });
        }, i * 8);
      });
      setTimeout(resolve, sorted.length * 8 + 800);
    });
  }

  private tick(time: number): void {
    const delta = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.ripples = this.ripples.filter(r => {
      r.radius += (r.maxRadius - r.radius) * delta * 3;
      r.alpha -= delta * 1.2;
      return r.alpha > 0 && r.radius < r.maxRadius + 5;
    });

    this.sparkles = this.sparkles.filter(s => {
      s.life += delta;
      s.x += s.vx;
      s.y += s.vy;
      s.vy -= delta * 0.3;
      const progress = s.life / s.maxLife;
      s.alpha = Math.max(0, 0.8 * (1 - progress));
      return s.life < s.maxLife;
    });

    this.renderer.render(this.feathers, this.ripples, this.sparkles);
    this.animationId = requestAnimationFrame(this.tick.bind(this));
  }

  start(): void {
    if (this.animationId === null) {
      this.lastTime = performance.now();
      this.animationId = requestAnimationFrame(this.tick.bind(this));
    }
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy(): void {
    this.stop();
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
