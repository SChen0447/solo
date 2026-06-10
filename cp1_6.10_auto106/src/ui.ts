import type { CardSize, Difficulty, GameStats } from './cardGrid';

export interface Settings {
  cardSize: CardSize;
  musicOn: boolean;
  volume: number;
  difficulty: Difficulty;
}

export type UISettingsChangeHandler = (settings: Settings) => void;
export type UIActionHandler = () => void;

export class UIManager {
  private settingsBtn: HTMLElement;
  private settingsPanel: HTMLElement;
  private statsPanel: HTMLElement;
  private overlay: HTMLElement;
  private settingsClose: HTMLElement;
  private statsClose: HTMLElement;
  private sizeBtns: NodeListOf<HTMLElement>;
  private diffBtns: NodeListOf<HTMLElement>;
  private musicSwitch: HTMLElement;
  private volumeSlider: HTMLInputElement;
  private restartBtn: HTMLElement;
  private nextRoundBtn: HTMLElement;
  private chartCanvas: HTMLCanvasElement;

  public settings: Settings = {
    cardSize: 'medium',
    musicOn: false,
    volume: 50,
    difficulty: 'easy'
  };

  public onSettingsChange?: UISettingsChangeHandler;
  public onRestart?: UIActionHandler;
  public onNextRound?: UIActionHandler;
  public onDifficultyChange?: (diff: Difficulty) => void;
  public onSizeChange?: (size: CardSize) => void;
  public onMusicToggle?: (on: boolean) => void;
  public onVolumeChange?: (vol: number) => void;

  constructor() {
    this.settingsBtn = document.getElementById('settingsBtn')!;
    this.settingsPanel = document.getElementById('settingsPanel')!;
    this.statsPanel = document.getElementById('statsPanel')!;
    this.overlay = document.getElementById('overlay')!;
    this.settingsClose = document.getElementById('settingsClose')!;
    this.statsClose = document.getElementById('statsClose')!;
    this.sizeBtns = document.querySelectorAll('.size-btn');
    this.diffBtns = document.querySelectorAll('.diff-btn');
    this.musicSwitch = document.getElementById('musicSwitch')!;
    this.volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
    this.restartBtn = document.getElementById('restartBtn')!;
    this.nextRoundBtn = document.getElementById('nextRoundBtn')!;
    this.chartCanvas = document.getElementById('chartCanvas') as HTMLCanvasElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.settingsClose.addEventListener('click', () => this.closeSettings());
    this.statsClose.addEventListener('click', () => this.closeStats());
    this.overlay.addEventListener('click', () => {
      this.closeSettings();
      this.closeStats();
    });

    this.sizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const size = btn.dataset.size as CardSize;
        this.setCardSize(size);
      });
    });

    this.diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const diff = btn.dataset.diff as Difficulty;
        this.setDifficulty(diff);
      });
    });

    this.musicSwitch.addEventListener('click', () => {
      this.settings.musicOn = !this.settings.musicOn;
      this.musicSwitch.classList.toggle('on', this.settings.musicOn);
      this.onMusicToggle?.(this.settings.musicOn);
      this.emitSettings();
    });

    this.volumeSlider.addEventListener('input', () => {
      this.settings.volume = parseInt(this.volumeSlider.value, 10);
      this.onVolumeChange?.(this.settings.volume);
      this.emitSettings();
    });

    this.restartBtn.addEventListener('click', () => {
      this.closeStats();
      this.onRestart?.();
    });

    this.nextRoundBtn.addEventListener('click', () => {
      this.closeStats();
      this.onNextRound?.();
    });
  }

  private emitSettings(): void {
    this.onSettingsChange?.({ ...this.settings });
  }

  private setCardSize(size: CardSize): void {
    this.settings.cardSize = size;
    this.sizeBtns.forEach(b => b.classList.toggle('active', b.dataset.size === size));
    this.onSizeChange?.(size);
    this.emitSettings();
  }

  private setDifficulty(diff: Difficulty): void {
    this.settings.difficulty = diff;
    this.diffBtns.forEach(b => b.classList.toggle('active', b.dataset.diff === diff));
    this.onDifficultyChange?.(diff);
    this.emitSettings();
  }

  openSettings(): void {
    this.overlay.classList.remove('hidden');
    this.settingsPanel.classList.remove('hidden');
  }

  closeSettings(): void {
    this.settingsPanel.classList.add('hidden');
    if (this.statsPanel.classList.contains('hidden')) {
      this.overlay.classList.add('hidden');
    }
  }

  showStats(stats: GameStats, score: number): void {
    const elapsed = (performance.now() - stats.startTime) / 1000;
    const totalAttempts = stats.matchCount + stats.errorCount;
    const accuracy = totalAttempts > 0 ? (stats.matchCount / totalAttempts) * 100 : 0;
    const avgReaction = stats.matchTimes.length > 0
      ? stats.matchTimes.reduce((a, b) => a + b, 0) / stats.matchTimes.length
      : 0;

    (document.getElementById('finalScore') as HTMLElement).textContent = String(score);
    (document.getElementById('totalTime') as HTMLElement).textContent = `${elapsed.toFixed(1)}s`;
    (document.getElementById('accuracy') as HTMLElement).textContent = `${accuracy.toFixed(0)}%`;
    (document.getElementById('avgReaction') as HTMLElement).textContent = `${avgReaction.toFixed(0)}ms`;
    (document.getElementById('errorCount') as HTMLElement).textContent = String(stats.errorCount);

    this.drawChart(stats.matchTimes);

    this.overlay.classList.remove('hidden');
    this.statsPanel.classList.remove('hidden');
  }

  closeStats(): void {
    this.statsPanel.classList.add('hidden');
    if (this.settingsPanel.classList.contains('hidden')) {
      this.overlay.classList.add('hidden');
    }
  }

  private drawChart(data: number[]): void {
    const canvas = this.chartCanvas;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    if (data.length < 2) {
      ctx.fillStyle = 'rgba(138, 148, 166, 0.6)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('完成更多配对以查看曲线', w / 2, h / 2);
      return;
    }

    const padding = { left: 36, right: 12, top: 12, bottom: 24 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const maxVal = Math.max(...data) * 1.1;
    const minVal = Math.min(...data) * 0.9;
    const range = maxVal - minVal || 1;

    ctx.strokeStyle = 'rgba(85, 221, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    const points = data.map((v, i) => ({
      x: padding.left + (data.length === 1 ? chartW / 2 : (chartW * i) / (data.length - 1)),
      y: padding.top + chartH - ((v - minVal) / range) * chartH
    }));

    ctx.beginPath();
    ctx.strokeStyle = '#55ddff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    points.forEach(p => {
      ctx.beginPath();
      ctx.fillStyle = '#55ddff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#55ddff';
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.fillStyle = 'rgba(138, 148, 166, 0.7)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH * i) / 4;
      const val = maxVal - (range * i) / 4;
      ctx.fillText(`${val.toFixed(0)}ms`, padding.left - 6, y + 3);
    }

    ctx.textAlign = 'center';
    const labelCount = Math.min(5, data.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((data.length - 1) * i / (labelCount - 1));
      const x = padding.left + (chartW * idx) / Math.max(1, data.length - 1);
      ctx.fillText(`#${idx + 1}`, x, h - 6);
    }
  }
}
