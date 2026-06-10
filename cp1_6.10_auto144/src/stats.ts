export interface RoundRecord {
  round: number;
  duration: number;
  mistakes: number;
  correct: boolean;
}

export class StatsPanel {
  private container: HTMLElement;
  private roundDisplay: HTMLElement;
  private timerDisplay: HTMLElement;
  private mistakesDisplay: HTMLElement;
  private chartCanvas: HTMLCanvasElement;
  private progressCanvas: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D;
  private progressCtx: CanvasRenderingContext2D;
  private history: RoundRecord[] = [];
  private currentRound: number = 0;
  private startTime: number = 0;
  private elapsed: number = 0;
  private animationFrameId: number | null = null;
  private currentMistakes: number = 0;
  private readonly MAX_HISTORY = 10;

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildPanel();

    const chartCanvas = this.container.querySelector<HTMLCanvasElement>('#memory-chart');
    const progressCanvas = this.container.querySelector<HTMLCanvasElement>('#progress-ring');
    if (!chartCanvas || !progressCanvas) throw new Error('Canvas elements not found');
    this.chartCanvas = chartCanvas;
    this.progressCanvas = progressCanvas;

    const chartCtx = chartCanvas.getContext('2d');
    const progressCtx = progressCanvas.getContext('2d');
    if (!chartCtx || !progressCtx) throw new Error('Canvas context not available');
    this.chartCtx = chartCtx;
    this.progressCtx = progressCtx;

    this.roundDisplay = this.container.querySelector('#round-display') as HTMLElement;
    this.timerDisplay = this.container.querySelector('#timer-display') as HTMLElement;
    this.mistakesDisplay = this.container.querySelector('#mistakes-display') as HTMLElement;

    this.setupCanvas();
    this.drawEmptyChart();
    this.drawProgressRing();
  }

  private buildPanel(): void {
    this.container.style.width = '25%';
    this.container.style.minWidth = '220px';
    this.container.style.height = '100%';
    this.container.style.backgroundColor = '#25252b';
    this.container.style.borderLeft = '2px solid #3a3a45';
    this.container.style.padding = '24px';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '24px';
    this.container.style.overflowY = 'auto';

    this.container.innerHTML = `
      <div>
        <div style="font-size:14px;color:#888;margin-bottom:8px;">当前回合</div>
        <div id="round-display" style="font-size:48px;font-weight:700;color:#f0f0f0;line-height:1;">0</div>
      </div>
      <div style="display:flex;gap:20px;">
        <div style="flex:1;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">用时</div>
          <div id="timer-display" style="font-size:24px;font-weight:600;color:#4caf50;">0.0s</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:12px;color:#888;margin-bottom:4px;">失误</div>
          <div id="mistakes-display" style="font-size:24px;font-weight:600;color:#f44336;">0</div>
        </div>
      </div>
      <div>
        <div style="font-size:13px;color:#888;margin-bottom:8px;">最近 10 轮用时曲线</div>
        <canvas id="memory-chart" style="width:100%;height:160px;background:#1e1e24;border-radius:8px;display:block;"></canvas>
      </div>
      <div style="display:flex;justify-content:center;align-items:center;flex-direction:column;gap:8px;">
        <canvas id="progress-ring" width="120" height="120"></canvas>
        <div style="font-size:12px;color:#888;">总练习回合</div>
      </div>
    `;
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;

    const chartRect = this.chartCanvas.getBoundingClientRect();
    this.chartCanvas.width = chartRect.width * dpr;
    this.chartCanvas.height = chartRect.height * dpr;
    this.chartCtx.scale(dpr, dpr);

    const progressSize = 120;
    this.progressCanvas.width = progressSize * dpr;
    this.progressCanvas.height = progressSize * dpr;
    this.progressCanvas.style.width = `${progressSize}px`;
    this.progressCanvas.style.height = `${progressSize}px`;
    this.progressCtx.scale(dpr, dpr);
  }

  public startRound(round: number): void {
    this.currentRound = round;
    this.currentMistakes = 0;
    this.startTime = performance.now();
    this.elapsed = 0;
    this.roundDisplay.textContent = String(round);
    this.mistakesDisplay.textContent = '0';
    this.startTimer();
  }

  private startTimer(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    const tick = () => {
      this.elapsed = (performance.now() - this.startTime) / 1000;
      this.timerDisplay.textContent = `${this.elapsed.toFixed(1)}s`;
      this.animationFrameId = requestAnimationFrame(tick);
    };
    tick();
  }

  public stopTimer(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public addMistake(): void {
    this.currentMistakes++;
    this.mistakesDisplay.textContent = String(this.currentMistakes);
  }

  public recordRound(correct: boolean, mistakes: number): RoundRecord {
    this.stopTimer();
    const record: RoundRecord = {
      round: this.currentRound,
      duration: this.elapsed,
      mistakes,
      correct
    };
    this.history.push(record);
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(-this.MAX_HISTORY);
    }
    this.drawChart();
    this.drawProgressRing();
    return record;
  }

  private drawEmptyChart(): void {
    const { width, height } = this.chartCanvas.getBoundingClientRect();
    this.chartCtx.clearRect(0, 0, width, height);

    this.chartCtx.strokeStyle = '#333';
    this.chartCtx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = (height / 4) * i;
      this.chartCtx.beginPath();
      this.chartCtx.moveTo(0, y);
      this.chartCtx.lineTo(width, y);
      this.chartCtx.stroke();
    }
  }

  private drawChart(): void {
    const rect = this.chartCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 16, right: 16, bottom: 24, left: 32 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    this.chartCtx.clearRect(0, 0, width, height);

    this.chartCtx.strokeStyle = '#2a2a33';
    this.chartCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      this.chartCtx.beginPath();
      this.chartCtx.moveTo(padding.left, y);
      this.chartCtx.lineTo(width - padding.right, y);
      this.chartCtx.stroke();
    }

    if (this.history.length === 0) {
      this.drawEmptyChart();
      return;
    }

    const maxDuration = Math.max(...this.history.map(r => r.duration), 5);
    const xStep = this.history.length > 1 ? chartW / (this.history.length - 1) : 0;

    this.chartCtx.font = '10px sans-serif';
    this.chartCtx.fillStyle = '#666';
    this.chartCtx.textAlign = 'center';
    this.history.forEach((r, i) => {
      const x = padding.left + i * xStep;
      this.chartCtx.fillText(String(r.round), x, height - 6);
    });

    this.chartCtx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = (maxDuration / 4) * (4 - i);
      const y = padding.top + (chartH / 4) * i;
      this.chartCtx.fillText(val.toFixed(1), padding.left - 6, y + 3);
    }

    this.chartCtx.strokeStyle = '#7c4dff';
    this.chartCtx.lineWidth = 2.5;
    this.chartCtx.lineJoin = 'round';
    this.chartCtx.lineCap = 'round';
    this.chartCtx.beginPath();
    this.history.forEach((r, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + chartH - (r.duration / maxDuration) * chartH;
      if (i === 0) this.chartCtx.moveTo(x, y);
      else this.chartCtx.lineTo(x, y);
    });
    this.chartCtx.stroke();

    this.history.forEach((r, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + chartH - (r.duration / maxDuration) * chartH;
      this.chartCtx.fillStyle = '#7c4dff';
      this.chartCtx.beginPath();
      this.chartCtx.arc(x, y, 6, 0, Math.PI * 2);
      this.chartCtx.fill();
      this.chartCtx.fillStyle = '#fff';
      this.chartCtx.beginPath();
      this.chartCtx.arc(x, y, 2.5, 0, Math.PI * 2);
      this.chartCtx.fill();
    });
  }

  private drawProgressRing(): void {
    const size = 120;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 40;
    const lineWidth = 8;
    const totalRounds = this.getTotalRounds();

    this.progressCtx.clearRect(0, 0, size, size);

    this.progressCtx.strokeStyle = '#333';
    this.progressCtx.lineWidth = lineWidth;
    this.progressCtx.lineCap = 'round';
    this.progressCtx.beginPath();
    this.progressCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.progressCtx.stroke();

    if (totalRounds > 0) {
      const progress = Math.min(totalRounds / 10, 1);
      const endAngle = -Math.PI / 2 + progress * Math.PI * 2;
      this.progressCtx.strokeStyle = '#00e676';
      this.progressCtx.lineWidth = lineWidth;
      this.progressCtx.beginPath();
      this.progressCtx.arc(cx, cy, radius, -Math.PI / 2, endAngle);
      this.progressCtx.stroke();
    }

    this.progressCtx.fillStyle = '#e0e0e0';
    this.progressCtx.font = 'bold 28px sans-serif';
    this.progressCtx.textAlign = 'center';
    this.progressCtx.textBaseline = 'middle';
    this.progressCtx.fillText(String(totalRounds), cx, cy);
  }

  public getTotalRounds(): number {
    const saved = localStorage.getItem('memoryGrid_totalRounds');
    return saved ? parseInt(saved, 10) : this.currentRound;
  }

  public saveTotalRounds(): void {
    localStorage.setItem('memoryGrid_totalRounds', String(this.currentRound));
  }

  public destroy(): void {
    this.stopTimer();
  }
}
