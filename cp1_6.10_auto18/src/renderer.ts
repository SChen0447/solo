import type { AudioManager } from './audio';
import type { Player } from './player';
import type { LevelManager, LevelTheme } from './level';

export interface UIState {
  score: number;
  lives: number;
  isPaused: boolean;
  isGameOver: boolean;
  isLevelComplete: boolean;
  isVictory: boolean;
  sensitivity: 'low' | 'medium' | 'high';
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioManager: AudioManager;
  private player: Player;
  private levelManager: LevelManager;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;
  private time: number = 0;
  private uiFadeIn: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    audioManager: AudioManager,
    player: Player,
    levelManager: LevelManager
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.audioManager = audioManager;
    this.player = player;
    this.levelManager = levelManager;
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  getWidth(): number {
    return window.innerWidth;
  }

  getHeight(): number {
    return window.innerHeight;
  }

  render(deltaTime: number, uiState: UIState): void {
    this.time += deltaTime;
    this.uiFadeIn = Math.min(1, this.uiFadeIn + deltaTime * 2);

    const w = this.getWidth();
    const h = this.getHeight();
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    this.renderSky(uiState);
    this.renderMountains();
    this.renderClouds();
    this.renderObstacles();
    this.renderEnergyOrbs();
    this.player.render(ctx);
    this.renderTransition();
    this.renderUI(uiState);
    this.renderBreathWaveform();

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  private renderSky(uiState: UIState): void {
    const w = this.getWidth();
    const h = this.getHeight();
    const ctx = this.ctx;
    const theme = this.levelManager.getTheme();

    let { skyTop, skyBottom } = theme;

    if (this.levelManager.isTransitionActive()) {
      const progress = this.levelManager.getTransitionProgress();
      const nextTheme = this.getNextTheme();
      skyTop = this.interpolateColor(skyTop, nextTheme.skyTop, progress);
      skyBottom = this.interpolateColor(skyBottom, nextTheme.skyBottom, progress);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, skyTop);
    gradient.addColorStop(1, skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    if (this.levelManager.getCurrentLevel() === 2) {
      this.renderStars();
    }

    if (this.audioManager.isInPanic() && !uiState.isGameOver && !uiState.isPaused) {
      ctx.fillStyle = `rgba(255, 0, 0, ${0.08 + Math.sin(this.time * 15) * 0.05})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private getNextTheme(): LevelTheme {
    const next = Math.min(this.levelManager.getCurrentLevel() + 1, 2);
    return (this.levelManager as unknown as { getThemeAt: (i: number) => LevelTheme }).getThemeAt?.(next) 
      || (globalThis as unknown as { LEVEL_THEMES: LevelTheme[] }).LEVEL_THEMES?.[next]
      || this.levelManager.getTheme();
  }

  private renderStars(): void {
    const ctx = this.ctx;
    const w = this.getWidth();
    const h = this.getHeight();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (let i = 0; i < 60; i++) {
      const x = (i * 137 + this.time * 5) % w;
      const y = (i * 89) % (h * 0.5);
      const twinkle = 0.5 + Math.sin(this.time * 2 + i) * 0.5;
      ctx.globalAlpha = twinkle * 0.9;
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderMountains(): void {
    const ctx = this.ctx;
    const w = this.getWidth();
    const h = this.getHeight();
    const theme = this.levelManager.getTheme();
    const offsets = this.levelManager.getMountainOffsets();

    const mountainConfigs = [
      { color: theme.mountainColorDark, baseY: h * 0.65, amplitude: 50, freq: 0.008, offset: offsets[4] },
      { color: theme.mountainColorDark, baseY: h * 0.7, amplitude: 65, freq: 0.006, offset: offsets[3] },
      { color: this.adjustColor(theme.mountainColor, 10), baseY: h * 0.75, amplitude: 80, freq: 0.005, offset: offsets[2] },
      { color: theme.mountainColor, baseY: h * 0.82, amplitude: 95, freq: 0.004, offset: offsets[1] },
      { color: this.adjustColor(theme.mountainColor, -15), baseY: h * 0.92, amplitude: 70, freq: 0.006, offset: offsets[0] }
    ];

    for (let layer = 0; layer < mountainConfigs.length; layer++) {
      const config = mountainConfigs[layer];
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let x = 0; x <= w + 50; x += 10) {
        const y = config.baseY
          + Math.sin((x + config.offset) * config.freq) * config.amplitude
          + Math.sin((x + config.offset) * config.freq * 2.3 + layer) * config.amplitude * 0.3;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }
  }

  private renderClouds(): void {
    const ctx = this.ctx;
    const theme = this.levelManager.getTheme();
    const layers = this.levelManager.getCloudLayers();

    for (const layer of layers) {
      ctx.globalAlpha = layer.opacity;
      for (const cloud of layer.clouds) {
        const floatY = cloud.y + Math.sin(this.time * 0.5 + cloud.offset) * 6;
        this.drawCloud(ctx, cloud.x, floatY, cloud.width, cloud.height, theme.cloudColor);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    const bumps = 5;
    ctx.beginPath();
    for (let i = 0; i <= bumps; i++) {
      const bx = x + (w * i) / bumps;
      const by = y + (i % 2 === 0 ? -h * 0.3 : -h * 0.1);
      const br = h * (0.5 + (i % 3) * 0.15);
      ctx.arc(bx, by, br, 0, Math.PI * 2);
    }
    ctx.fill();
    
    ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.4)');
    if (!color.includes('rgba')) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    }
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.2, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderObstacles(): void {
    const ctx = this.ctx;
    const obstacles = this.levelManager.getObstacles();
    const scrollX = this.levelManager.getScrollX();
    const w = this.getWidth();

    for (const obs of obstacles) {
      if (!obs.active) continue;
      const screenX = obs.x - scrollX;
      if (screenX > w + 200 || screenX < -200) continue;

      switch (obs.type) {
        case 'spike':
          this.renderSpike(ctx, screenX, obs.y, obs.width, obs.height, obs.phase);
          break;
        case 'crow':
          this.renderCrow(ctx, screenX, obs.y, obs.width, obs.height, obs.phase);
          break;
        case 'thunder':
          this.renderThunder(ctx, screenX, obs.y, obs.width, obs.height, obs.phase);
          break;
      }
    }
  }

  private renderSpike(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    _phase: number
  ): void {
    const theme = this.levelManager.getTheme();
    const fromTop = y < 50;
    
    const gradient = ctx.createLinearGradient(x, fromTop ? y : y + h, x, fromTop ? y + h : y);
    gradient.addColorStop(0, '#6B5B4F');
    gradient.addColorStop(0.5, theme.mountainColorDark);
    gradient.addColorStop(1, theme.mountainColor);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    if (fromTop) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * 0.5, y + h);
      ctx.lineTo(x + w, y);
    } else {
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w * 0.5, y);
      ctx.lineTo(x + w, y + h);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private renderCrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    phase: number
  ): void {
    const wingFlap = Math.sin(phase * 8) * 0.6;

    ctx.fillStyle = '#2D2D2D';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w * 0.35, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.75, y + h * 0.35, w * 0.18, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.92, y + h * 0.4);
    ctx.lineTo(x + w * 1.05, y + h * 0.45);
    ctx.lineTo(x + w * 0.92, y + h * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1A1A1A';
    ctx.save();
    ctx.translate(x + w * 0.3, y + h * 0.4);
    ctx.rotate(-0.3 + wingFlap);
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.35, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x + w * 0.7, y + h * 0.4);
    ctx.rotate(0.3 - wingFlap);
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.35, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderThunder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    phase: number
  ): void {
    const cloudGradient = ctx.createRadialGradient(
      x + w / 2, y + h * 0.3, 10,
      x + w / 2, y + h * 0.3, w * 0.6
    );
    cloudGradient.addColorStop(0, 'rgba(100, 50, 150, 0.9)');
    cloudGradient.addColorStop(0.6, 'rgba(60, 30, 100, 0.8)');
    cloudGradient.addColorStop(1, 'rgba(40, 20, 70, 0)');

    ctx.fillStyle = cloudGradient;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h * 0.35, w * 0.55, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    this.drawCloud(ctx, x, y + h * 0.15, w, h * 0.4, 'rgba(80, 40, 130, 0.9)');

    const flashIntensity = Math.sin(phase * 6) > 0.7 ? 1 : 0.3 + Math.random() * 0.2;
    ctx.strokeStyle = `rgba(180, 120, 255, ${flashIntensity})`;
    ctx.lineWidth = 3 + flashIntensity * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    let lx = x + w * 0.45;
    let ly = y + h * 0.4;
    ctx.moveTo(lx, ly);
    for (let i = 0; i < 5; i++) {
      lx += (Math.random() - 0.5) * 25;
      ly += h * 0.12;
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${flashIntensity * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private renderEnergyOrbs(): void {
    const ctx = this.ctx;
    const orbs = this.levelManager.getEnergyOrbs();
    const scrollX = this.levelManager.getScrollX();
    const w = this.getWidth();
    const theme = this.levelManager.getTheme();

    for (const orb of orbs) {
      if (orb.collected) continue;
      const screenX = orb.x - scrollX;
      if (screenX > w + 100 || screenX < -100) continue;

      const floatY = orb.y + Math.sin(orb.phase) * 8;
      const pulseScale = 1 + Math.sin(orb.phase * 2) * 0.1;
      const r = orb.radius * pulseScale;

      const glowGradient = ctx.createRadialGradient(screenX, floatY, 0, screenX, floatY, r * 3);
      glowGradient.addColorStop(0, theme.accentColor + 'AA');
      glowGradient.addColorStop(0.5, theme.accentColor + '44');
      glowGradient.addColorStop(1, theme.accentColor + '00');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(screenX, floatY, r * 3, 0, Math.PI * 2);
      ctx.fill();

      const coreGradient = ctx.createRadialGradient(screenX - r * 0.3, floatY - r * 0.3, 0, screenX, floatY, r);
      coreGradient.addColorStop(0, '#FFFFFF');
      coreGradient.addColorStop(0.3, theme.accentColor);
      coreGradient.addColorStop(1, this.adjustColor(theme.accentColor, -30));
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(screenX, floatY, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(screenX - r * 0.3, floatY - r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderTransition(): void {
    if (!this.levelManager.isTransitionActive()) return;

    const ctx = this.ctx;
    const w = this.getWidth();
    const h = this.getHeight();
    const progress = this.levelManager.getTransitionProgress();

    const ringRadius = Math.min(w, h) * 1.5 * Math.max(0, progress * 1.5 - 0.2);
    const ringWidth = 80;

    ctx.save();
    ctx.translate(w / 2, h / 2);

    const gradient = ctx.createRadialGradient(0, 0, ringRadius - ringWidth, 0, 0, ringRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.arc(0, 0, Math.max(0, ringRadius - ringWidth), 0, Math.PI * 2, true);
    ctx.fill();

    if (progress > 0.3 && progress < 0.9) {
      const theme = this.getNextTheme();
      ctx.globalAlpha = Math.sin((progress - 0.3) / 0.6 * Math.PI);
      ctx.fillStyle = theme.accentColor;
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('冲破云层！', 0, 0);
    }

    ctx.restore();
  }

  private renderUI(uiState: UIState): void {
    const ctx = this.ctx;
    const w = this.getWidth();
    const h = this.getHeight();
    const theme = this.levelManager.getTheme();

    ctx.save();
    ctx.globalAlpha = this.uiFadeIn;

    this.renderProgressBar(ctx, w, h, theme);
    this.renderPauseButton(ctx, uiState, theme);
    this.renderLevelLabel(ctx, theme);
    this.renderScore(ctx, uiState, theme);
    this.renderLives(ctx, uiState);

    if (uiState.isPaused && !uiState.isGameOver && !uiState.isVictory) {
      this.renderPauseMenu(ctx, w, h, theme, uiState);
    }

    if (uiState.isGameOver) {
      this.renderGameOver(ctx, w, h, uiState);
    }

    if (uiState.isVictory) {
      this.renderVictory(ctx, w, h, uiState);
    } else if (uiState.isLevelComplete && !this.levelManager.isTransitionActive()) {
      this.renderLevelComplete(ctx, w, h, theme, uiState);
    }

    ctx.restore();
  }

  private renderProgressBar(
    ctx: CanvasRenderingContext2D,
    w: number,
    _h: number,
    theme: LevelTheme
  ): void {
    const barW = w * 0.5;
    const barH = 10;
    const x = (w - barW) / 2;
    const y = 18;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.roundRect(ctx, x, y, barW, barH, 5);
    ctx.fill();

    const progress = this.levelManager.getProgress();
    const gradient = ctx.createLinearGradient(x, y, x + barW, y);
    gradient.addColorStop(0, theme.accentColor);
    gradient.addColorStop(1, this.adjustColor(theme.accentColor, 30));
    ctx.fillStyle = gradient;
    this.roundRect(ctx, x, y, barW * progress, barH, 5);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, x, y, barW, barH, 5);
    ctx.stroke();
  }

  private renderPauseButton(
    ctx: CanvasRenderingContext2D,
    uiState: UIState,
    _theme: LevelTheme
  ): void {
    const x = 20;
    const y = 45;
    const size = 44;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.roundRect(ctx, x, y, size, size, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    if (uiState.isPaused) {
      ctx.beginPath();
      ctx.moveTo(x + 15, y + 12);
      ctx.lineTo(x + 33, y + 22);
      ctx.lineTo(x + 15, y + 32);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(x + 14, y + 12, 6, 20);
      ctx.fillRect(x + 24, y + 12, 6, 20);
    }
  }

  private renderLevelLabel(
    ctx: CanvasRenderingContext2D,
    _theme: LevelTheme
  ): void {
    const label = this.levelManager.getTheme().levelName;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'left';
    ctx.fillText(label, 76, 73);
  }

  private renderScore(
    ctx: CanvasRenderingContext2D,
    uiState: UIState,
    theme: LevelTheme
  ): void {
    const w = this.getWidth();
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = theme.accentColor;
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.fillText(uiState.score.toString(), w - 20, 62);
    ctx.shadowBlur = 0;

    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('得分', w - 20, 82);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`✦ ${this.levelManager.getTotalCollectedOrbs() + this.levelManager.getCollectedOrbs()}`, w - 20, 105);
  }

  private renderLives(
    ctx: CanvasRenderingContext2D,
    uiState: UIState
  ): void {
    const w = this.getWidth();
    for (let i = 0; i < 3; i++) {
      const x = w - 20 - (2 - i) * 30;
      const y = 130;
      this.drawHeart(ctx, x, y, 11, i < uiState.lives);
    }
  }

  private drawHeart(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    filled: boolean
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(-size, -size * 0.6, -size * 1.2, size * 0.3, 0, size);
    ctx.bezierCurveTo(size * 1.2, size * 0.3, size, -size * 0.6, 0, size * 0.3);
    ctx.closePath();

    if (filled) {
      const gradient = ctx.createRadialGradient(0, size * 0.2, 1, 0, 0, size);
      gradient.addColorStop(0, '#FF8A9B');
      gradient.addColorStop(1, '#E63946');
      ctx.fillStyle = gradient;
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderPauseMenu(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    theme: LevelTheme,
    uiState: UIState
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, w, h);

    const panelW = 360;
    const panelH = 380;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.backdropFilter = 'blur(20px)';
    this.roundRect(ctx, px, py, panelW, panelH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('游戏暂停', w / 2, py + 55);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('呼吸灵敏度', w / 2, py + 110);

    const sensLabels: Array<{ key: 'low' | 'medium' | 'high'; label: string }> = [
      { key: 'low', label: '低' },
      { key: 'medium', label: '中' },
      { key: 'high', label: '高' }
    ];
    const btnW = 90;
    const btnH = 40;
    const btnGap = 15;
    const totalW = btnW * 3 + btnGap * 2;
    const startX = (w - totalW) / 2;

    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (btnW + btnGap);
      const by = py + 130;
      const selected = uiState.sensitivity === sensLabels[i].key;

      ctx.fillStyle = selected ? theme.accentColor : 'rgba(255, 255, 255, 0.15)';
      this.roundRect(ctx, bx, by, btnW, btnH, 10);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = selected ? '#000000' : 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sensLabels[i].label, bx + btnW / 2, by + btnH / 2 + 2);
    }
    ctx.textBaseline = 'alphabetic';

    ctx.font = '15px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('操作说明', w / 2, py + 210);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText('🎙 吸气 → 气球上升', w / 2, py + 235);
    ctx.fillText('🎙 呼气 → 气球下降', w / 2, py + 255);
    ctx.fillText('🎙 平稳呼吸 → 保持高度', w / 2, py + 275);

    this.renderButton(ctx, w / 2 - 80, py + 310, 160, 48, '继续游戏', theme.accentColor);
  }

  private renderLevelComplete(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    theme: LevelTheme,
    _uiState: UIState
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    const panelW = 380;
    const panelH = 300;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    this.roundRect(ctx, px, py, panelW, panelH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = theme.accentColor;
    ctx.textAlign = 'center';
    ctx.fillText('关卡完成！', w / 2, py + 65);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`收集能量球: ${this.levelManager.getCollectedOrbs()} / 20`, w / 2, py + 120);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`当前总分: ${this.levelManager.getTotalCollectedOrbs() * 100}`, w / 2, py + 155);

    if (this.levelManager.hasNextLevel()) {
      this.renderButton(ctx, w / 2 - 90, py + 215, 180, 50, '进入下一关', theme.accentColor);
    } else {
      this.renderButton(ctx, w / 2 - 90, py + 215, 180, 50, '查看结果', theme.accentColor);
    }
  }

  private renderGameOver(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    uiState: UIState
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, w, h);

    const panelW = 380;
    const panelH = 320;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    ctx.fillStyle = 'rgba(50, 20, 30, 0.8)';
    this.roundRect(ctx, px, py, panelW, panelH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#FF6B6B';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', w / 2, py + 65);

    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`最终得分: ${uiState.score}`, w / 2, py + 120);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(`收集能量球: ${this.levelManager.getTotalCollectedOrbs() + this.levelManager.getCollectedOrbs()}`, w / 2, py + 155);
    ctx.fillText(`到达: ${this.levelManager.getTheme().levelName}`, w / 2, py + 185);

    this.renderButton(ctx, w / 2 - 90, py + 235, 180, 50, '重新开始', '#FF6B6B');
  }

  private renderVictory(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    uiState: UIState
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, w, h);

    const panelW = 400;
    const panelH = 340;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    ctx.fillStyle = 'rgba(50, 40, 80, 0.85)';
    this.roundRect(ctx, px, py, panelW, panelH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 150, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 通关成功！', w / 2, py + 70);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`最终得分: ${uiState.score}`, w / 2, py + 130);

    ctx.font = '19px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(`总能量球: ${this.levelManager.getTotalCollectedOrbs()}`, w / 2, py + 170);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('你是真正的气球冒险家！', w / 2, py + 210);

    this.renderButton(ctx, w / 2 - 90, py + 255, 180, 50, '再玩一次', '#FFD700');
  }

  private renderButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color: string
  ): void {
    ctx.fillStyle = color;
    this.roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = this.isLightColor(color) ? '#1A1A1A' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }

  private renderBreathWaveform(): void {
    const ctx = this.ctx;
    const w = this.getWidth();
    const h = this.getHeight();
    const waveform = this.audioManager.getWaveformData();
    const isPanicking = this.audioManager.isInPanic();

    const waveW = Math.min(380, w * 0.55);
    const waveH = 50;
    const x = (w - waveW) / 2;
    const y = h - 70;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.roundRect(ctx, x - 12, y - 8, waveW + 24, waveH + 16, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, x, y, waveW, waveH, 8);
    ctx.clip();

    ctx.beginPath();
    ctx.moveTo(x, y + waveH / 2);
    for (let i = 0; i < waveform.length; i++) {
      const px = x + (i / (waveform.length - 1)) * waveW;
      const py = y + waveH / 2 - waveform[i] * waveH * 0.45;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.lineTo(x + waveW, y + waveH / 2);

    const gradient = ctx.createLinearGradient(x, y, x + waveW, y);
    if (isPanicking) {
      gradient.addColorStop(0, '#FF4444');
      gradient.addColorStop(0.5, '#FF8866');
      gradient.addColorStop(1, '#FF4444');
    } else {
      gradient.addColorStop(0, '#4ADE80');
      gradient.addColorStop(0.5, '#86EFAC');
      gradient.addColorStop(1, '#4ADE80');
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.lineTo(x + waveW, y + waveH);
    ctx.lineTo(x, y + waveH);
    ctx.closePath();
    const fillGradient = ctx.createLinearGradient(x, y, x, y + waveH);
    fillGradient.addColorStop(0, isPanicking ? 'rgba(255, 100, 100, 0.4)' : 'rgba(74, 222, 128, 0.4)');
    fillGradient.addColorStop(1, isPanicking ? 'rgba(255, 100, 100, 0.05)' : 'rgba(74, 222, 128, 0.05)');
    ctx.fillStyle = fillGradient;
    ctx.fill();

    ctx.restore();

    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(isPanicking ? '⚠ 呼吸太急促！' : '呼吸波形', w / 2, y - 14);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = parseInt(color1.replace('#', ''), 16);
    const c2 = parseInt(color2.replace('#', ''), 16);
    const r = Math.round(((c1 >> 16) & 0xFF) * (1 - t) + ((c2 >> 16) & 0xFF) * t);
    const g = Math.round(((c1 >> 8) & 0xFF) * (1 - t) + ((c2 >> 8) & 0xFF) * t);
    const b = Math.round((c1 & 0xFF) * (1 - t) + (c2 & 0xFF) * t);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  private isLightColor(hex: string): boolean {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = (num >> 16) & 0xFF;
    const g = (num >> 8) & 0xFF;
    const b = num & 0xFF;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 160;
  }

  getFPS(): number {
    return this.fps;
  }

  hitTest(x: number, y: number): string | null {
    const w = this.getWidth();
    const h = this.getHeight();

    if (x >= 20 && x <= 64 && y >= 45 && y <= 89) {
      return 'pause';
    }

    return this.hitTestMenuButtons(x, y, w, h);
  }

  private hitTestMenuButtons(x: number, y: number, w: number, h: number): string | null {
    const btnTest = (bx: number, by: number, bw: number, bh: number) =>
      x >= bx && x <= bx + bw && y >= by && y <= by + bh;

    if (btnTest(w / 2 - 80, h / 2 + 40, 160, 48)) return 'resume';
    if (btnTest(w / 2 - 80, h / 2 - 170, 90, 40)) return 'sens-low';
    if (btnTest(w / 2 - 10, h / 2 - 170, 90, 40)) return 'sens-medium';
    if (btnTest(w / 2 + 60, h / 2 - 170, 90, 40)) return 'sens-high';

    if (btnTest(w / 2 - 90, h / 2 + 65, 180, 50)) {
      return this.levelManager.hasNextLevel() ? 'next-level' : 'show-result';
    }
    if (btnTest(w / 2 - 90, h / 2 + 75, 180, 50)) return 'restart';

    return null;
  }
}
