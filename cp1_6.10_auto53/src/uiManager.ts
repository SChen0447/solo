import type { EcosystemParams, EcosystemState } from './ecosystem';

export interface UIState {
  isPaused: boolean;
  zoom: number;
}

export type UIEventHandler = {
  onParamsChange: (params: Partial<EcosystemParams>) => void;
  onPauseToggle: () => void;
  onReset: () => void;
  onZoom: (delta: number) => void;
  onKeyToggle: () => void;
};

export class UIManager {
  private handlers: UIEventHandler;
  private lastStatsUpdate = 0;
  private prevState: Partial<EcosystemState> = {};

  private elPopA: HTMLElement;
  private elPopB: HTMLElement;
  private elPlantCount: HTMLElement;
  private elGeneration: HTMLElement;
  private elEnergyBar: HTMLElement;
  private elZoomIndicator: HTMLElement;

  private elGrowthRate: HTMLInputElement;
  private elMoveSpeed: HTMLInputElement;
  private elReproThreshold: HTMLInputElement;
  private elFightLoss: HTMLInputElement;

  private elGrowthRateValue: HTMLElement;
  private elMoveSpeedValue: HTMLElement;
  private elReproThresholdValue: HTMLElement;
  private elFightLossValue: HTMLElement;

  private elPauseBtn: HTMLButtonElement;
  private elResetBtn: HTMLButtonElement;

  constructor(handlers: UIEventHandler) {
    this.handlers = handlers;

    this.elPopA = document.getElementById('popA')!;
    this.elPopB = document.getElementById('popB')!;
    this.elPlantCount = document.getElementById('plantCount')!;
    this.elGeneration = document.getElementById('generation')!;
    this.elEnergyBar = document.getElementById('energyBar')!;
    this.elZoomIndicator = document.getElementById('zoomIndicator')!;

    this.elGrowthRate = document.getElementById('growthRate') as HTMLInputElement;
    this.elMoveSpeed = document.getElementById('moveSpeed') as HTMLInputElement;
    this.elReproThreshold = document.getElementById('reproThreshold') as HTMLInputElement;
    this.elFightLoss = document.getElementById('fightLoss') as HTMLInputElement;

    this.elGrowthRateValue = document.getElementById('growthRateValue')!;
    this.elMoveSpeedValue = document.getElementById('moveSpeedValue')!;
    this.elReproThresholdValue = document.getElementById('reproThresholdValue')!;
    this.elFightLossValue = document.getElementById('fightLossValue')!;

    this.elPauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
    this.elResetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

    this.setupEventListeners();
    this.setupMobileTabs();
  }

  private setupEventListeners(): void {
    this.elGrowthRate.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.elGrowthRateValue.textContent = val.toFixed(1);
      this.handlers.onParamsChange({ growthRate: val });
      this.triggerPulse(e.target as HTMLInputElement);
    });

    this.elMoveSpeed.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.elMoveSpeedValue.textContent = val.toFixed(1);
      this.handlers.onParamsChange({ moveSpeed: val });
      this.triggerPulse(e.target as HTMLInputElement);
    });

    this.elReproThreshold.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.elReproThresholdValue.textContent = val.toString();
      this.handlers.onParamsChange({ reproductionThreshold: val });
      this.triggerPulse(e.target as HTMLInputElement);
    });

    this.elFightLoss.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.elFightLossValue.textContent = val.toString();
      this.handlers.onParamsChange({ fightEnergyLoss: val });
      this.triggerPulse(e.target as HTMLInputElement);
    });

    this.elPauseBtn.addEventListener('click', () => {
      this.handlers.onPauseToggle();
    });

    this.elResetBtn.addEventListener('click', () => {
      this.handlers.onReset();
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.handlers.onKeyToggle();
      }
    });

    document.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
      this.handlers.onZoom(-e.deltaY * 0.001);
    }, { passive: false });
  }

  private triggerPulse(slider: HTMLInputElement): void {
    const rect = slider.getBoundingClientRect();
    const thumbPercent = (parseFloat(slider.value) - parseFloat(slider.min)) / 
                          (parseFloat(slider.max) - parseFloat(slider.min));
    const thumbX = rect.left + rect.width * thumbPercent;
    const thumbY = rect.top + rect.height / 2;

    const pulse = document.createElement('div');
    pulse.className = 'slider-pulse';
    pulse.style.left = `${thumbX}px`;
    pulse.style.top = `${thumbY}px`;
    pulse.style.position = 'fixed';
    pulse.style.zIndex = '1000';
    document.body.appendChild(pulse);

    setTimeout(() => pulse.remove(), 400);
  }

  private setupMobileTabs(): void {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabStats = document.getElementById('tab-stats')!;
    const tabControls = document.getElementById('tab-controls')!;

    const statsPanel = document.getElementById('statsPanel')!;
    const controlPanel = document.getElementById('controlPanel')!;

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = (btn as HTMLElement).dataset.tab;

        if (tab === 'stats') {
          tabStats.classList.add('active');
          tabControls.classList.remove('active');
          if (tabStats.children.length === 0) {
            tabStats.innerHTML = statsPanel.innerHTML;
          }
        } else if (tab === 'controls') {
          tabControls.classList.add('active');
          tabStats.classList.remove('active');
          if (tabControls.children.length === 0) {
            const clone = controlPanel.cloneNode(true) as HTMLElement;
            clone.style.display = 'block';
            clone.style.position = 'static';
            clone.style.bottom = 'auto';
            clone.style.right = 'auto';
            clone.style.width = '100%';
            tabControls.appendChild(clone);

            const growthRate = tabControls.querySelector('#growthRate') as HTMLInputElement;
            const moveSpeed = tabControls.querySelector('#moveSpeed') as HTMLInputElement;
            const reproThreshold = tabControls.querySelector('#reproThreshold') as HTMLInputElement;
            const fightLoss = tabControls.querySelector('#fightLoss') as HTMLInputElement;
            const pauseBtn = tabControls.querySelector('#pauseBtn') as HTMLButtonElement;
            const resetBtn = tabControls.querySelector('#resetBtn') as HTMLButtonElement;

            growthRate?.addEventListener('input', (e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              (tabControls.querySelector('#growthRateValue') as HTMLElement).textContent = val.toFixed(1);
              this.handlers.onParamsChange({ growthRate: val });
              this.elGrowthRate.value = val.toString();
              this.elGrowthRateValue.textContent = val.toFixed(1);
            });

            moveSpeed?.addEventListener('input', (e) => {
              const val = parseFloat((e.target as HTMLInputElement).value);
              (tabControls.querySelector('#moveSpeedValue') as HTMLElement).textContent = val.toFixed(1);
              this.handlers.onParamsChange({ moveSpeed: val });
              this.elMoveSpeed.value = val.toString();
              this.elMoveSpeedValue.textContent = val.toFixed(1);
            });

            reproThreshold?.addEventListener('input', (e) => {
              const val = parseInt((e.target as HTMLInputElement).value);
              (tabControls.querySelector('#reproThresholdValue') as HTMLElement).textContent = val.toString();
              this.handlers.onParamsChange({ reproductionThreshold: val });
              this.elReproThreshold.value = val.toString();
              this.elReproThresholdValue.textContent = val.toString();
            });

            fightLoss?.addEventListener('input', (e) => {
              const val = parseInt((e.target as HTMLInputElement).value);
              (tabControls.querySelector('#fightLossValue') as HTMLElement).textContent = val.toString();
              this.handlers.onParamsChange({ fightEnergyLoss: val });
              this.elFightLoss.value = val.toString();
              this.elFightLossValue.textContent = val.toString();
            });

            pauseBtn?.addEventListener('click', () => this.handlers.onPauseToggle());
            resetBtn?.addEventListener('click', () => this.handlers.onReset());
          }
        }
      });
    });
  }

  update(state: EcosystemState, uiState: UIState): void {
    const now = Date.now();
    if (now - this.lastStatsUpdate < 1000) return;
    this.lastStatsUpdate = now;

    this.animateValue(this.elPopA, state.populationA, this.prevState.populationA);
    this.animateValue(this.elPopB, state.populationB, this.prevState.populationB);
    this.animateValue(this.elPlantCount, state.plantCount, this.prevState.plantCount);
    this.animateValue(this.elGeneration, state.generation, this.prevState.generation);

    const energyPercent = Math.max(0, Math.min(100, state.avgEnergy));
    this.elEnergyBar.style.width = `${energyPercent}%`;
    const r = Math.round(255 * (1 - energyPercent / 100));
    const g = Math.round(105 + 150 * (energyPercent / 100));
    this.elEnergyBar.style.background = `rgb(${r}, ${g}, 82)`;

    this.elZoomIndicator.textContent = `缩放: ${uiState.zoom.toFixed(1)}x`;

    this.prevState = {
      populationA: state.populationA,
      populationB: state.populationB,
      plantCount: state.plantCount,
      generation: state.generation,
    };
  }

  private animateValue(el: HTMLElement, newValue: number, oldValue?: number): void {
    if (oldValue !== newValue) {
      el.classList.remove('bounce');
      void el.offsetWidth;
      el.classList.add('bounce');
    }
    el.textContent = newValue.toString();
  }

  setPaused(paused: boolean): void {
    this.elPauseBtn.textContent = paused ? '继续' : '暂停';
  }

  setParams(params: EcosystemParams): void {
    this.elGrowthRate.value = params.growthRate.toString();
    this.elGrowthRateValue.textContent = params.growthRate.toFixed(1);
    this.elMoveSpeed.value = params.moveSpeed.toString();
    this.elMoveSpeedValue.textContent = params.moveSpeed.toFixed(1);
    this.elReproThreshold.value = params.reproductionThreshold.toString();
    this.elReproThresholdValue.textContent = params.reproductionThreshold.toString();
    this.elFightLoss.value = params.fightEnergyLoss.toString();
    this.elFightLossValue.textContent = params.fightEnergyLoss.toString();
  }
}
