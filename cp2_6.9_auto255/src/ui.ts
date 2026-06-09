import { CrowdSimulator, CrowdStats, StrategyType, GuideMode } from './crowd';

export class UIController {
  simulator: CrowdSimulator;
  strategySlider: HTMLInputElement;
  speedSlider: HTMLInputElement;
  exitWidthSlider: HTMLInputElement;
  obstacleSlider: HTMLInputElement;
  playBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  strategyValue: HTMLElement;
  speedValue: HTMLElement;
  exitWidthValue: HTMLElement;
  obstacleValue: HTMLElement;
  totalCountEl: HTMLElement;
  evacuatedCountEl: HTMLElement;
  evacuationRateEl: HTMLElement;
  avgTimeItemEl: HTMLElement;
  avgTimeEl: HTMLElement;
  fpsDisplay: HTMLElement;
  fpsWarning: HTMLElement;
  strategyBtns: HTMLButtonElement[];
  modeBtns: HTMLButtonElement[];
  panelToggle: HTMLButtonElement;
  controlPanel: HTMLElement;
  lastFrameTime = 0;
  frameCount = 0;
  fpsUpdateInterval = 500;
  lastFpsUpdate = 0;
  currentFps = 0;
  isPlaying = false;

  constructor(simulator: CrowdSimulator) {
    this.simulator = simulator;

    this.strategySlider = document.getElementById('strategy-slider') as HTMLInputElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.exitWidthSlider = document.getElementById('exit-width-slider') as HTMLInputElement;
    this.obstacleSlider = document.getElementById('obstacle-slider') as HTMLInputElement;
    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.strategyValue = document.getElementById('strategy-value') as HTMLElement;
    this.speedValue = document.getElementById('speed-value') as HTMLElement;
    this.exitWidthValue = document.getElementById('exit-width-value') as HTMLElement;
    this.obstacleValue = document.getElementById('obstacle-value') as HTMLElement;
    this.totalCountEl = document.getElementById('total-count') as HTMLElement;
    this.evacuatedCountEl = document.getElementById('evacuated-count') as HTMLElement;
    this.evacuationRateEl = document.getElementById('evacuation-rate') as HTMLElement;
    this.avgTimeItemEl = document.getElementById('avg-time-item') as HTMLElement;
    this.avgTimeEl = document.getElementById('avg-time') as HTMLElement;
    this.fpsDisplay = document.getElementById('fps-display') as HTMLElement;
    this.fpsWarning = document.getElementById('fps-warning') as HTMLElement;
    this.panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement;
    this.controlPanel = document.getElementById('control-panel') as HTMLElement;

    this.strategyBtns = Array.from(document.querySelectorAll('.strategy-btn')) as HTMLButtonElement[];
    this.modeBtns = Array.from(document.querySelectorAll('.mode-btn')) as HTMLButtonElement[];

    this.bindEvents();
    this.simulator.onEvacuate((stats) => this.updateStats(stats));
    this.updateStats(this.simulator.getStats());
  }

  bindEvents(): void {
    this.strategySlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) as StrategyType;
      this.setStrategy(value);
    });

    this.strategyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const strategy = parseInt(btn.dataset.strategy || '0') as StrategyType;
        this.setStrategy(strategy);
        this.strategySlider.value = strategy.toString();
      });
    });

    this.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = parseInt(btn.dataset.mode || '0') as GuideMode;
        this.simulator.setGuideMode(mode);
        this.modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    this.speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.simulator.setSpeedMultiplier(value);
      this.speedValue.textContent = value.toFixed(1);
    });

    this.exitWidthSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.simulator.setExitWidth(value);
      this.exitWidthValue.textContent = value.toString();
    });

    this.obstacleSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.simulator.setObstacleDensity(value);
      this.obstacleValue.textContent = value.toString();
    });

    this.playBtn.addEventListener('click', () => {
      this.togglePlay();
    });

    this.resetBtn.addEventListener('click', () => {
      this.reset();
    });

    this.panelToggle.addEventListener('click', () => {
      this.controlPanel.classList.toggle('expanded');
    });
  }

  setStrategy(strategy: StrategyType): void {
    this.simulator.setStrategy(strategy);
    const names = ['自由疏散', '单行排队', '多出口分流', '障碍物引导'];
    this.strategyValue.textContent = names[strategy];
    this.strategyBtns.forEach((btn, i) => {
      btn.classList.toggle('active', i === strategy);
    });
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.simulator.pause();
      this.playBtn.textContent = '▶ 播放';
    } else {
      this.simulator.start();
      this.playBtn.textContent = '⏸ 暂停';
    }
    this.isPlaying = !this.isPlaying;
  }

  reset(): void {
    this.simulator.reset();
    this.isPlaying = false;
    this.playBtn.textContent = '▶ 播放';
    this.updateStats(this.simulator.getStats());
  }

  updateStats(stats: CrowdStats): void {
    this.totalCountEl.textContent = stats.total.toString();
    this.evacuatedCountEl.textContent = stats.evacuated.toString();
    this.evacuationRateEl.textContent = `${stats.rate} 人/秒`;

    if (stats.completed && stats.avgTime !== null) {
      this.avgTimeItemEl.style.display = 'flex';
      this.avgTimeEl.textContent = `${stats.avgTime.toFixed(1)} 秒`;
    } else {
      this.avgTimeItemEl.style.display = 'none';
    }
  }

  updateFPS(now: number): void {
    this.frameCount++;
    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      this.fpsDisplay.textContent = `FPS: ${this.currentFps}`;

      if (this.currentFps < 30) {
        this.fpsWarning.style.display = 'block';
      } else {
        this.fpsWarning.style.display = 'none';
      }
    }
  }
}
