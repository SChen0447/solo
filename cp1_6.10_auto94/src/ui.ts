export interface PhysicsStats {
  ballCount: number;
  kineticEnergy: number;
  momentumX: number;
  momentumY: number;
  lastCollisionTime: number;
}

export interface UIHandlers {
  onReset: () => void;
  onPauseToggle: () => void;
  onStep: () => void;
}

export class UIManager {
  private container: HTMLElement;
  private panel: HTMLElement;
  private ballCountEl: HTMLElement;
  private kineticEnergyEl: HTMLElement;
  private momentumXEl: HTMLElement;
  private momentumYEl: HTMLElement;
  private lastCollisionEl: HTMLElement;
  private resetBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private stepBtn: HTMLButtonElement;
  private isPaused: boolean = false;
  private isCollapsed: boolean = false;
  private panelHeader?: HTMLElement;
  private handlers: UIHandlers;

  constructor(handlers: UIHandlers) {
    this.handlers = handlers;
    this.container = document.getElementById('app')!;

    this.panel = document.createElement('div');
    this.panel.className = 'physics-panel';

    this.ballCountEl = document.createElement('div');
    this.kineticEnergyEl = document.createElement('div');
    this.momentumXEl = document.createElement('div');
    this.momentumYEl = document.createElement('div');
    this.lastCollisionEl = document.createElement('div');
    this.resetBtn = document.createElement('button');
    this.pauseBtn = document.createElement('button');
    this.stepBtn = document.createElement('button');

    this.buildPanel();
    this.attachStyles();
    this.bindEvents();
    this.checkResponsive();

    window.addEventListener('resize', () => this.checkResponsive());
  }

  private buildPanel(): void {
    this.panelHeader = document.createElement('div');
    this.panelHeader.className = 'panel-header';
    this.panelHeader.innerHTML = '<span>⚙️ 物理参数</span><span class="toggle-icon">▼</span>';

    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';

    const createStat = (label: string, valueEl: HTMLElement) => {
      const stat = document.createElement('div');
      stat.className = 'stat-item';
      const labelEl = document.createElement('div');
      labelEl.className = 'stat-label';
      labelEl.textContent = label;
      valueEl.className = 'stat-value';
      stat.appendChild(labelEl);
      stat.appendChild(valueEl);
      return stat;
    };

    statsContainer.appendChild(createStat('小球总数', this.ballCountEl));
    statsContainer.appendChild(createStat('总动能 (J)', this.kineticEnergyEl));
    statsContainer.appendChild(createStat('动量 X (kg·m/s)', this.momentumXEl));
    statsContainer.appendChild(createStat('动量 Y (kg·m/s)', this.momentumYEl));
    statsContainer.appendChild(createStat('最近碰撞', this.lastCollisionEl));

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'buttons-container';

    this.resetBtn.textContent = '🔄 重置';
    this.resetBtn.className = 'control-btn reset-btn';

    this.pauseBtn.textContent = '⏸ 暂停';
    this.pauseBtn.className = 'control-btn pause-btn';

    this.stepBtn.textContent = '⏭ 步进';
    this.stepBtn.className = 'control-btn step-btn';

    buttonsContainer.appendChild(this.resetBtn);
    buttonsContainer.appendChild(this.pauseBtn);
    buttonsContainer.appendChild(this.stepBtn);

    this.panel.appendChild(this.panelHeader);
    this.panel.appendChild(statsContainer);
    this.panel.appendChild(buttonsContainer);
    this.container.appendChild(this.panel);
  }

  private attachStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .physics-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 240px;
        background: rgba(26, 31, 46, 0.7);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 16px;
        z-index: 100;
        transition: all 0.3s ease;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
      }

      .physics-panel.collapsed {
        height: auto !important;
        overflow: hidden;
      }

      .physics-panel.collapsed .stats-container,
      .physics-panel.collapsed .buttons-container {
        display: none;
      }

      .physics-panel.collapsed .toggle-icon {
        transform: rotate(180deg);
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 15px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 14px;
        cursor: pointer;
        user-select: none;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .toggle-icon {
        font-size: 10px;
        transition: transform 0.3s ease;
        opacity: 0.7;
      }

      .stats-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 16px;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .stat-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        letter-spacing: 0.5px;
      }

      .stat-value {
        font-size: 16px;
        font-weight: 600;
        color: #42a5f5;
        font-family: 'SF Mono', 'Consolas', monospace;
      }

      .buttons-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .control-btn {
        padding: 10px 14px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .control-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .control-btn:active {
        transform: translateY(0px);
      }

      .reset-btn {
        background: #e53935;
      }

      .reset-btn:hover {
        background: #c62828;
      }

      .reset-btn:active {
        transform: scale(0.97);
      }

      .pause-btn {
        background: #43a047;
      }

      .pause-btn:hover {
        background: #2e7d32;
      }

      .pause-btn.paused {
        background: #fdd835;
        color: #1a1f2e;
      }

      .pause-btn.paused:hover {
        background: #fbc02d;
      }

      .step-btn {
        background: #1e88e5;
      }

      .step-btn:hover {
        background: #1565c0;
      }

      .step-btn:active {
        transform: scale(0.95);
      }

      .step-btn:disabled {
        background: #37474f;
        cursor: not-allowed;
        transform: none;
        opacity: 0.6;
      }

      @media (max-width: 1024px) {
        .physics-panel {
          top: 0;
          right: 0;
          left: 0;
          width: 100%;
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-top: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    this.resetBtn.addEventListener('click', () => {
      this.handlers.onReset();
    });

    this.pauseBtn.addEventListener('click', () => {
      this.handlers.onPauseToggle();
    });

    this.stepBtn.addEventListener('click', () => {
      this.handlers.onStep();
    });

    if (this.panelHeader) {
      this.panelHeader.addEventListener('click', () => {
        this.toggleCollapse();
      });
    }
  }

  private checkResponsive(): void {
    if (window.innerWidth < 1024) {
      this.panel.classList.add('collapsed');
      this.isCollapsed = true;
    } else {
      this.panel.classList.remove('collapsed');
      this.isCollapsed = false;
    }
  }

  private toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    this.panel.classList.toggle('collapsed', this.isCollapsed);
  }

  updateStats(stats: PhysicsStats): void {
    this.ballCountEl.textContent = stats.ballCount.toString();
    this.kineticEnergyEl.textContent = stats.kineticEnergy.toFixed(2);
    this.momentumXEl.textContent = stats.momentumX.toFixed(2);
    this.momentumYEl.textContent = stats.momentumY.toFixed(2);
    this.lastCollisionEl.textContent = this.formatTime(stats.lastCollisionTime);
  }

  private formatTime(timestamp: number): string {
    if (timestamp === 0) return '--:--.--';
    const date = new Date(timestamp);
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    const ms = Math.floor(date.getMilliseconds() / 10).toString().padStart(2, '0');
    return `${mm}:${ss}.${ms}`;
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.pauseBtn.classList.add('paused');
      this.pauseBtn.textContent = '▶ 继续';
      this.stepBtn.disabled = false;
    } else {
      this.pauseBtn.classList.remove('paused');
      this.pauseBtn.textContent = '⏸ 暂停';
      this.stepBtn.disabled = true;
    }
  }
}
