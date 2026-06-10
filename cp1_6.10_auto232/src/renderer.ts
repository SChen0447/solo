import { Particle, Star, Obstacle, CelebrationParticle, ThemeColors, Vec2 } from './particle';

export interface GameState {
  birdParticles: Particle[];
  trailParticles: Particle[];
  stars: Star[];
  obstacles: Obstacle[];
  celebrationParticles: CelebrationParticle[];
  birdCenter: Vec2;
  birdTarget: Vec2;
  mousePos: Vec2;
  score: number;
  maxScore: number;
  isExploding: boolean;
  isReassembling: boolean;
  goldTrailTimer: number;
  showTrail: boolean;
  currentTheme: ThemeColors;
  survivalTime: number;
  pulsePhase: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number = 0;
  private height: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  private fpsHistory: number[] = [];
  private particleCount: number = 100;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(dpr, dpr);
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  updateFps(dt: number): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > 10) this.fpsHistory.shift();
      const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      if (avgFps < 55 && this.particleCount > 60) {
        this.particleCount = 60;
      } else if (avgFps >= 58 && this.particleCount < 100) {
        this.particleCount = 100;
      }
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0b0e1d');
    gradient.addColorStop(1, '#141a30');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(stars: Star[], time: number): void {
    for (const star of stars) {
      star.draw(this.ctx, time);
    }
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    for (const obs of obstacles) {
      obs.draw(this.ctx);
    }
  }

  private drawBirdParticles(particles: Particle[]): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.draw(this.ctx);
    }
    this.ctx.restore();
  }

  private drawTrailParticles(particles: Particle[]): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.draw(this.ctx);
    }
    this.ctx.restore();
  }

  private drawCelebrationParticles(particles: CelebrationParticle[]): void {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.draw(this.ctx);
    }
    this.ctx.restore();
  }

  private drawScoreBar(score: number, maxScore: number, pulsePhase: number): void {
    const barWidth = 300;
    const barHeight = 20;
    const x = (this.width - barWidth) / 2;
    const y = this.height - 60;
    const progress = score / maxScore;

    const pulseIntensity = 0.5 + (Math.sin(pulsePhase) + 1) / 2 * 0.5;

    this.ctx.save();
    this.ctx.shadowBlur = 15 * pulseIntensity;
    this.ctx.shadowColor = 'rgba(255, 71, 87, 0.5)';

    this.ctx.fillStyle = 'rgba(20, 30, 50, 0.7)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    this.beginRoundedRect(x, y, barWidth, barHeight, 10);
    this.ctx.fill();
    this.ctx.stroke();

    if (progress > 0) {
      const fillWidth = Math.min(barWidth - 4, (barWidth - 4) * progress);
      const gradient = this.ctx.createLinearGradient(x + 2, y, x + 2 + fillWidth, y);
      gradient.addColorStop(0, '#ff4757');
      gradient.addColorStop(1, '#2ed573');
      this.ctx.fillStyle = gradient;
      this.beginRoundedRect(x + 2, y + 2, fillWidth, barHeight - 4, 8);
      this.ctx.fill();
    }

    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#dfe6e9';
    this.ctx.font = '12px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`积分: ${score} / ${maxScore}`, this.width / 2, y - 15);

    this.ctx.restore();
  }

  private drawFpsCounter(): void {
    const x = this.width - 20;
    const y = this.height - 20;
    const fpsColor = this.currentFps >= 55 ? '#2ed573' : this.currentFps >= 40 ? '#feca57' : '#ff6b6b';

    this.ctx.save();
    this.ctx.fillStyle = fpsColor;
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = fpsColor;
    this.ctx.fillText(`FPS: ${this.currentFps}`, x, y);
    if (this.particleCount < 100) {
      this.ctx.font = '11px monospace';
      this.ctx.fillStyle = 'rgba(254, 202, 87, 0.8)';
      this.ctx.fillText(`粒子: ${this.particleCount}`, x, y - 20);
    }
    this.ctx.restore();
  }

  private drawControlPanel(
    showTrail: boolean,
    currentTheme: ThemeColors,
    allThemes: { key: string; theme: ThemeColors }[],
    pulsePhase: number,
    handlers: {
      onToggleTrail: () => void;
      onSelectTheme: (key: string) => void;
      onReset: () => void;
    }
  ): void {
    this.drawControlPanelDOM(showTrail, currentTheme, allThemes, pulsePhase, handlers);
  }

  private panelCreated: boolean = false;

  private drawControlPanelDOM(
    showTrail: boolean,
    currentTheme: ThemeColors,
    allThemes: { key: string; theme: ThemeColors }[],
    pulsePhase: number,
    handlers: {
      onToggleTrail: () => void;
      onSelectTheme: (key: string) => void;
      onReset: () => void;
    }
  ): void {
    if (this.panelCreated) return;
    this.panelCreated = true;

    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.style.cssText = `
      position: fixed;
      left: 20px;
      top: 80px;
      background: rgba(20, 30, 50, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 20px;
      min-width: 200px;
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    `;

    const title = document.createElement('div');
    title.textContent = '灵羽追踪';
    title.style.cssText = `
      color: #dfe6e9;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      text-shadow: 0 0 10px rgba(108, 189, 255, 0.5);
      letter-spacing: 1px;
    `;
    panel.appendChild(title);

    const createButton = (label: string, onClick: () => void, isActive = false) => {
      const btn = document.createElement('button');
      btn.innerHTML = label;
      btn.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        width: 100%;
        padding: 10px 14px;
        margin-bottom: 10px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid ${isActive ? 'rgba(72, 219, 251, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
        border-radius: 8px;
        color: #dfe6e9;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        box-shadow: ${isActive ? '0 0 15px rgba(72, 219, 251, 0.3)' : 'none'};
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
        btn.style.boxShadow = '0 0 20px rgba(72, 219, 251, 0.4)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.background = 'rgba(255, 255, 255, 0.05)';
        btn.style.boxShadow = isActive ? '0 0 15px rgba(72, 219, 251, 0.3)' : 'none';
      });
      btn.addEventListener('click', onClick);
      return btn;
    };

    const eyeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeOffIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    const paletteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"></path></svg>`;
    const resetIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`;

    const trailBtn = createButton(`${showTrail ? eyeIcon : eyeOffIcon} <span>尾迹: ${showTrail ? '开' : '关'}</span>`, () => {
      handlers.onToggleTrail();
      const isOn = document.body.getAttribute('data-trail') !== 'off';
      document.body.setAttribute('data-trail', isOn ? 'off' : 'on');
      trailBtn.innerHTML = `${isOn ? eyeOffIcon : eyeIcon} <span>尾迹: ${isOn ? '关' : '开'}</span>`;
    }, showTrail);
    panel.appendChild(trailBtn);

    const themeLabel = document.createElement('div');
    themeLabel.innerHTML = `${paletteIcon} <span style="margin-left:4px;">颜色主题</span>`;
    themeLabel.style.cssText = `
      color: #dfe6e9;
      font-size: 13px;
      margin: 12px 0 8px;
      display: flex;
      align-items: center;
    `;
    panel.appendChild(themeLabel);

    const themeContainer = document.createElement('div');
    themeContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    `;

    allThemes.forEach(({ key, theme }) => {
      const themeBtn = document.createElement('button');
      themeBtn.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${theme.bird[0]};margin-right:6px;box-shadow:0 0 6px ${theme.bird[0]};"></span>${theme.name}`;
      const isActive = theme.name === currentTheme.name;
      themeBtn.style.cssText = `
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid ${isActive ? 'rgba(72, 219, 251, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
        border-radius: 6px;
        color: #dfe6e9;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        ${isActive ? 'box-shadow: 0 0 12px rgba(72, 219, 251, 0.3);' : ''}
      `;
      themeBtn.addEventListener('mouseenter', () => {
        themeBtn.style.transform = 'scale(1.05)';
        themeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      });
      themeBtn.addEventListener('mouseleave', () => {
        themeBtn.style.transform = 'scale(1)';
        themeBtn.style.background = 'rgba(255, 255, 255, 0.05)';
      });
      themeBtn.addEventListener('click', () => {
        handlers.onSelectTheme(key);
        document.querySelectorAll('[data-theme-btn]').forEach(el => {
          const b = el as HTMLButtonElement;
          b.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          b.style.boxShadow = 'none';
        });
        themeBtn.style.borderColor = 'rgba(72, 219, 251, 0.5)';
        themeBtn.style.boxShadow = '0 0 12px rgba(72, 219, 251, 0.3)';
      });
      themeBtn.setAttribute('data-theme-btn', key);
      themeContainer.appendChild(themeBtn);
    });
    panel.appendChild(themeContainer);

    const resetBtn = createButton(`${resetIcon} <span>重置游戏</span>`, () => {
      handlers.onReset();
    });
    panel.appendChild(resetBtn);

    document.body.appendChild(panel);
  }

  private beginRoundedRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  render(
    state: GameState,
    time: number,
    allThemes: { key: string; theme: ThemeColors }[],
    handlers: {
      onToggleTrail: () => void;
      onSelectTheme: (key: string) => void;
      onReset: () => void;
    }
  ): void {
    this.drawBackground();
    this.drawStars(state.stars, time);
    this.drawObstacles(state.obstacles);
    if (state.showTrail) {
      this.drawTrailParticles(state.trailParticles);
    }
    this.drawBirdParticles(state.birdParticles);
    this.drawCelebrationParticles(state.celebrationParticles);
    this.drawScoreBar(state.score, state.maxScore, state.pulsePhase);
    this.drawFpsCounter();
    this.drawControlPanel(state.showTrail, state.currentTheme, allThemes, state.pulsePhase, handlers);
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }
  getFps(): number { return this.currentFps; }
}
