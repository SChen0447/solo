import { TrackType } from './types';
import { GridManager } from './GridManager';

export interface UIEvents {
  onSelectTool: (type: TrackType | null) => void;
  onStart: () => void;
  onReplay: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

export class UIManager {
  private container: HTMLElement;
  private toolbar: HTMLElement | null = null;
  private infoPanel: HTMLElement | null = null;
  private canvas: HTMLCanvasElement;
  private gridManager: GridManager;
  private events: UIEvents;
  public selectedTool: TrackType | null = null;
  private logContainer: HTMLElement | null = null;
  private logList: HTMLElement | null = null;
  private timerEl: HTMLElement | null = null;
  private scoreEl: HTMLElement | null = null;
  private levelEl: HTMLElement | null = null;
  private signalsEl: HTMLElement | null = null;
  private startBtn: HTMLButtonElement | null = null;
  private replayBtn: HTMLElement | null = null;
  private resetBtn: HTMLElement | null = null;
  public onCanvasMouseDown: ((e: MouseEvent) => void) | null = null;
  public onCanvasMouseMove: ((e: MouseEvent) => void) | null = null;
  public onCanvasMouseUp: ((e: MouseEvent) => void) | null = null;
  public onCanvasClick: ((e: MouseEvent) => void) | null = null;
  public onCanvasKeyDown: ((e: KeyboardEvent) => void) | null = null;
  public onCanvasTouchStart: ((e: TouchEvent) => void) | null = null;
  public onCanvasTouchMove: ((e: TouchEvent) => void) | null = null;
  public onCanvasTouchEnd: ((e: TouchEvent) => void) | null = null;

  constructor(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    gridManager: GridManager,
    events: UIEvents
  ) {
    this.container = container;
    this.canvas = canvas;
    this.gridManager = gridManager;
    this.events = events;
    this.buildUI();
    this.bindEvents();
  }

  private buildUI(): void {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'toolbar';
    this.toolbar.innerHTML = `
      <div class="toolbar-title">工具栏</div>
      <div class="tool-item" data-type="straight">
        <canvas width="48" height="48"></canvas>
        <div class="tool-label">直轨</div>
      </div>
      <div class="tool-item" data-type="curve">
        <canvas width="48" height="48"></canvas>
        <div class="tool-label">弯轨</div>
      </div>
      <div class="tool-item" data-type="switch">
        <canvas width="48" height="48"></canvas>
        <div class="tool-label">道岔</div>
      </div>
    `;
    this.container.appendChild(this.toolbar);

    this.infoPanel = document.createElement('div');
    this.infoPanel.className = 'info-panel';
    this.infoPanel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">信息面板</span>
        <div class="panel-buttons">
          <button class="btn-icon" id="replayBtn" title="回放">▶</button>
          <button class="btn-icon" id="resetBtn" title="重置">↻</button>
        </div>
      </div>
      <div class="info-row">
        <span class="info-label">关卡</span>
        <span class="info-value" id="levelEl">1 / 5</span>
      </div>
      <div class="info-row">
        <span class="info-label">剩余时间</span>
        <span class="timer-value" id="timerEl">120</span>
      </div>
      <div class="info-row">
        <span class="info-label">积分</span>
        <span class="score-value" id="scoreEl">0</span>
      </div>
      <div class="info-row">
        <span class="info-label">信号灯</span>
        <div class="signals-row" id="signalsEl"></div>
      </div>
      <div class="speed-control">
        <span class="info-label" style="font-size:10px">速度: <span id="speedVal">0.3</span>秒/格</span>
        <input type="range" class="speed-slider" id="speedSlider" min="0.1" max="1.0" step="0.1" value="0.3" />
      </div>
      <div class="log-container">
        <div class="log-list" id="logList"></div>
      </div>
      <button class="start-button" id="startBtn">▶ 发 车</button>
    `;
    this.container.appendChild(this.infoPanel);

    this.timerEl = this.infoPanel.querySelector('#timerEl');
    this.scoreEl = this.infoPanel.querySelector('#scoreEl');
    this.levelEl = this.infoPanel.querySelector('#levelEl');
    this.signalsEl = this.infoPanel.querySelector('#signalsEl');
    this.logList = this.infoPanel.querySelector('#logList');
    this.logContainer = this.infoPanel.querySelector('.log-container');
    this.startBtn = this.infoPanel.querySelector('#startBtn') as HTMLButtonElement;
    this.replayBtn = this.infoPanel.querySelector('#replayBtn');
    this.resetBtn = this.infoPanel.querySelector('#resetBtn');

    const toolCanvases = this.toolbar.querySelectorAll('.tool-item canvas');
    const types: TrackType[] = ['straight', 'curve', 'switch'];
    toolCanvases.forEach((c, i) => {
      const ctx = (c as HTMLCanvasElement).getContext('2d')!;
      this.gridManager.drawToolIcon(ctx, types[i], 48);
    });

    this.canvas.tabIndex = 0;
  }

  private bindEvents(): void {
    const toolItems = this.toolbar!.querySelectorAll('.tool-item');
    toolItems.forEach(item => {
      item.addEventListener('click', () => {
        const type = (item as HTMLElement).dataset.type as TrackType;
        if (this.selectedTool === type) {
          this.selectedTool = null;
          item.classList.remove('selected');
        } else {
          this.selectedTool = type;
          toolItems.forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        }
        this.events.onSelectTool(this.selectedTool);
      });
    });

    this.startBtn!.addEventListener('click', () => {
      this.animateButtonClick(this.startBtn!);
      this.events.onStart();
    });

    this.replayBtn!.addEventListener('click', () => {
      this.animateButtonClick(this.replayBtn!);
      this.events.onReplay();
    });

    this.resetBtn!.addEventListener('click', () => {
      this.animateButtonClick(this.resetBtn!);
      this.events.onReset();
    });

    const speedSlider = this.infoPanel!.querySelector('#speedSlider') as HTMLInputElement;
    const speedVal = this.infoPanel!.querySelector('#speedVal')!;
    speedSlider.addEventListener('input', () => {
      const v = parseFloat(speedSlider.value);
      speedVal.textContent = v.toFixed(1);
      this.events.onSpeedChange(v);
    });

    this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown?.(e));
    this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove?.(e));
    this.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp?.(e));
    this.canvas.addEventListener('click', (e) => this.onCanvasClick?.(e));
    window.addEventListener('keydown', (e) => this.onCanvasKeyDown?.(e));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onCanvasTouchStart?.(e);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.onCanvasTouchMove?.(e);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onCanvasTouchEnd?.(e);
    }, { passive: false });
  }

  private animateButtonClick(el: HTMLElement): void {
    el.style.transform = 'scale(1.15)';
    setTimeout(() => {
      el.style.transform = '';
    }, 150);
  }

  public setTimer(seconds: number): void {
    if (this.timerEl) {
      this.timerEl.textContent = Math.max(0, Math.ceil(seconds)).toString();
      this.timerEl.style.color = seconds <= 10 ? '#ff4466' : seconds <= 30 ? '#ffaa00' : '#ff4466';
    }
  }

  public setScore(score: number): void {
    if (this.scoreEl) this.scoreEl.textContent = score.toString();
  }

  public setLevel(level: number, total: number): void {
    if (this.levelEl) this.levelEl.textContent = `${level} / ${total}`;
  }

  public setSignals(states: Array<{ id: string; state: 'green' | 'red' }>): void {
    if (!this.signalsEl) return;
    const existing = this.signalsEl.querySelectorAll('.signal-dot');
    if (existing.length !== states.length) {
      this.signalsEl.innerHTML = '';
      for (let i = 0; i < states.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'signal-dot';
        this.signalsEl.appendChild(dot);
      }
    }
    const dots = this.signalsEl.querySelectorAll('.signal-dot');
    dots.forEach((dot, i) => {
      dot.classList.remove('green', 'red');
      dot.classList.add(states[i]?.state || 'green');
    });
  }

  public addLog(message: string): void {
    if (!this.logList) return;
    const item = document.createElement('div');
    item.className = 'log-item';
    item.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    this.logList.insertBefore(item, this.logList.firstChild);
    while (this.logList.children.length > 20) {
      this.logList.removeChild(this.logList.lastChild!);
    }
  }

  public clearLogs(): void {
    if (this.logList) this.logList.innerHTML = '';
  }

  public setStartButtonEnabled(enabled: boolean, label?: string): void {
    if (this.startBtn) {
      this.startBtn.disabled = !enabled;
      if (label) this.startBtn.textContent = label;
    }
  }

  public showCollisionOverlay(): void {
    const overlay = document.createElement('div');
    overlay.className = 'collision-overlay';
    this.container.appendChild(overlay);
    setTimeout(() => overlay.remove(), 900);
  }

  public showLevelComplete(
    level: number,
    score: number,
    timeBonus: number,
    totalScore: number,
    isLast: boolean,
    leaderboard: number[]
  ): Promise<void> {
    return new Promise((resolve) => {
      const popup = document.createElement('div');
      popup.className = 'level-complete';
      popup.innerHTML = `
        <h2>${isLast ? '🎉 恭喜通关！' : `第 ${level} 关完成！`}</h2>
        <p>基础得分: +${score}</p>
        <p>时间奖励: +${timeBonus}</p>
        <div class="score-big">总分 ${totalScore}</div>
        <div class="leaderboard">
          <h3>🏆 排行榜 TOP5</h3>
          <ol>
            ${leaderboard.slice(0, 5).map(s => `<li>${s} 分</li>`).join('')}
          </ol>
        </div>
        <button class="btn-next" id="nextBtn">${isLast ? '重新开始' : '进入下一关 ▶'}</button>
      `;
      this.container.appendChild(popup);
      popup.querySelector('#nextBtn')!.addEventListener('click', () => {
        popup.remove();
        resolve();
      });
    });
  }

  public handleResize(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 768;

    const toolbarW = isMobile ? 0 : 130;
    const panelW = isMobile ? 0 : 250;
    const maxBoardW = vw - toolbarW - panelW - 40;
    const maxBoardH = vh - (isMobile ? 200 : 60);
    const cellSize = Math.floor(Math.min(maxBoardW, maxBoardH) / this.gridManager.gridSize);
    const finalSize = Math.max(30, Math.min(70, cellSize));

    this.gridManager.setCellSize(finalSize);
  }
}
