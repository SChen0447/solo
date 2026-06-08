export type BackgroundMode = 'space-gray' | 'deep-blue' | 'pure-black';

export interface ControlState {
  transmissionDelay: number;
  pulseSpeed: number;
  actionPotentialIntensity: number;
  backgroundMode: BackgroundMode;
}

export interface ControlPanelCallbacks {
  onDelayChange?: (delay: number) => void;
  onSpeedChange?: (speed: number) => void;
  onIntensityChange?: (intensity: number) => void;
  onBackgroundChange?: (mode: BackgroundMode) => void;
  onSingleStimulus?: () => void;
  onMultiStimulus?: () => void;
  onCycleStimulus?: () => void;
  onReset?: () => void;
}

const BACKGROUND_COLORS: Record<BackgroundMode, string> = {
  'space-gray': '#1a1a2e',
  'deep-blue': '#0a1628',
  'pure-black': '#000000',
};

export class ControlPanel {
  private state: ControlState = {
    transmissionDelay: 200,
    pulseSpeed: 1.0,
    actionPotentialIntensity: 1.0,
    backgroundMode: 'space-gray',
  };

  private callbacks: ControlPanelCallbacks = {};

  private delaySlider: HTMLInputElement | null = null;
  private delayValue: HTMLElement | null = null;
  private speedSlider: HTMLInputElement | null = null;
  private speedValue: HTMLElement | null = null;
  private intensitySlider: HTMLInputElement | null = null;
  private intensityValue: HTMLElement | null = null;
  private bgButtons: NodeListOf<HTMLElement> | null = null;
  private panelToggle: HTMLElement | null = null;
  private controlPanel: HTMLElement | null = null;

  constructor() {
    this.initializeElements();
    this.bindEvents();
  }

  private initializeElements(): void {
    this.delaySlider = document.getElementById('delay-slider') as HTMLInputElement;
    this.delayValue = document.getElementById('delay-value');
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value');
    this.intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement;
    this.intensityValue = document.getElementById('intensity-value');
    this.bgButtons = document.querySelectorAll('.bg-btn');
    this.panelToggle = document.getElementById('panel-toggle');
    this.controlPanel = document.getElementById('control-panel');
  }

  private bindEvents(): void {
    if (this.delaySlider) {
      this.delaySlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.setTransmissionDelay(value);
        if (this.callbacks.onDelayChange) {
          this.callbacks.onDelayChange(value);
        }
      });
    }

    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.setPulseSpeed(value);
        if (this.callbacks.onSpeedChange) {
          this.callbacks.onSpeedChange(value);
        }
      });
    }

    if (this.intensitySlider) {
      this.intensitySlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.setActionPotentialIntensity(value);
        if (this.callbacks.onIntensityChange) {
          this.callbacks.onIntensityChange(value);
        }
      });
    }

    this.bgButtons?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.bg as BackgroundMode;
        if (mode && mode !== this.state.backgroundMode) {
          this.setBackgroundMode(mode);
          if (this.callbacks.onBackgroundChange) {
            this.callbacks.onBackgroundChange(mode);
          }
        }
      });
    });

    if (this.panelToggle) {
      this.panelToggle.addEventListener('click', () => {
        this.togglePanel();
      });
    }

    const stimSingle = document.getElementById('stim-single');
    const stimMulti = document.getElementById('stim-multi');
    const stimCycle = document.getElementById('stim-cycle');
    const btnReset = document.getElementById('btn-reset');

    stimSingle?.addEventListener('click', () => {
      this.setActiveButton('stim-single');
      if (this.callbacks.onSingleStimulus) {
        this.callbacks.onSingleStimulus();
      }
    });

    stimMulti?.addEventListener('click', () => {
      this.setActiveButton('stim-multi');
      if (this.callbacks.onMultiStimulus) {
        this.callbacks.onMultiStimulus();
      }
    });

    stimCycle?.addEventListener('click', () => {
      this.setActiveButton('stim-cycle');
      if (this.callbacks.onCycleStimulus) {
        this.callbacks.onCycleStimulus();
      }
    });

    btnReset?.addEventListener('click', () => {
      if (this.callbacks.onReset) {
        this.callbacks.onReset();
      }
    });
  }

  private setActiveButton(activeId: string): void {
    const buttons = ['stim-single', 'stim-multi', 'stim-cycle'];
    buttons.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        if (id === activeId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
  }

  clearActiveButtons(): void {
    const buttons = ['stim-single', 'stim-multi', 'stim-cycle'];
    buttons.forEach((id) => {
      const btn = document.getElementById(id);
      btn?.classList.remove('active');
    });
  }

  private togglePanel(): void {
    if (!this.controlPanel) return;

    if (window.innerWidth <= 768) {
      this.controlPanel.classList.toggle('expanded');
    } else {
      this.controlPanel.classList.toggle('collapsed');
    }
  }

  setCallbacks(callbacks: ControlPanelCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  getState(): ControlState {
    return { ...this.state };
  }

  getTransmissionDelay(): number {
    return this.state.transmissionDelay;
  }

  getPulseSpeed(): number {
    return this.state.pulseSpeed;
  }

  getActionPotentialIntensity(): number {
    return this.state.actionPotentialIntensity;
  }

  getBackgroundMode(): BackgroundMode {
    return this.state.backgroundMode;
  }

  getBackgroundColor(): string {
    return BACKGROUND_COLORS[this.state.backgroundMode];
  }

  setTransmissionDelay(delay: number): void {
    this.state.transmissionDelay = delay;
    if (this.delayValue) {
      this.delayValue.textContent = `${delay}ms`;
    }
  }

  setPulseSpeed(speed: number): void {
    this.state.pulseSpeed = speed;
    if (this.speedValue) {
      this.speedValue.textContent = `${speed.toFixed(1)}x`;
    }
  }

  setActionPotentialIntensity(intensity: number): void {
    this.state.actionPotentialIntensity = intensity;
    if (this.intensityValue) {
      this.intensityValue.textContent = intensity.toFixed(1);
    }
  }

  setBackgroundMode(mode: BackgroundMode): void {
    this.state.backgroundMode = mode;

    this.bgButtons?.forEach((btn) => {
      if (btn.dataset.bg === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  updateStats(
    activeNeurons: number,
    totalDistance: number,
    avgDelay: number,
    fps: number
  ): void {
    const statActive = document.getElementById('stat-active');
    const statDistance = document.getElementById('stat-distance');
    const statDelay = document.getElementById('stat-delay');
    const statFps = document.getElementById('stat-fps');

    if (statActive) statActive.textContent = activeNeurons.toString();
    if (statDistance) statDistance.textContent = totalDistance.toFixed(1);
    if (statDelay) statDelay.textContent = `${avgDelay.toFixed(0)}ms`;
    if (statFps) statFps.textContent = fps.toString();
  }

  updateTimeline(progress: number, label?: string): void {
    const timelineContainer = document.getElementById('timeline-container');
    const timelineProgress = document.getElementById('timeline-progress');
    const timelineLabel = document.getElementById('timeline-label');

    if (!timelineContainer || !timelineProgress) return;

    if (progress > 0 && progress < 1) {
      timelineContainer.style.display = 'block';
      timelineProgress.style.width = `${progress * 100}%`;
      if (label && timelineLabel) {
        timelineLabel.textContent = label;
      }
    } else {
      timelineContainer.style.display = 'none';
    }
  }

  static getBackgroundColor(mode: BackgroundMode): string {
    return BACKGROUND_COLORS[mode];
  }
}
