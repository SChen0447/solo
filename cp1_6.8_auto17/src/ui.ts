export interface UIParams {
  gravity: number;
  windStrength: number;
  lifetime: number;
  trailDecay: number;
}

export interface UICallbacks {
  onGravityChange?: (value: number) => void;
  onWindChange?: (value: number) => void;
  onLifetimeChange?: (value: number) => void;
  onTrailDecayChange?: (value: number) => void;
  onPause?: () => void;
  onReset?: () => void;
}

export class UI {
  private params: UIParams;
  private callbacks: UICallbacks;
  
  private gravitySlider: HTMLInputElement;
  private gravityValue: HTMLElement;
  private windSlider: HTMLInputElement;
  private windValue: HTMLElement;
  private lifetimeSlider: HTMLInputElement;
  private lifetimeValue: HTMLElement;
  private trailSlider: HTMLInputElement;
  private trailValue: HTMLElement;
  private pauseBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private fpsDisplay: HTMLElement;
  private particleCountDisplay: HTMLElement;
  private controlPanel: HTMLElement;
  private panelTitle: HTMLElement;
  private toggleBtn: HTMLButtonElement;
  
  private isPaused: boolean = false;
  private isPanelOpen: boolean = false;

  constructor(callbacks: UICallbacks = {}) {
    this.callbacks = callbacks;
    
    this.params = {
      gravity: -9.8,
      windStrength: 1.5,
      lifetime: 5.0,
      trailDecay: 0.98
    };
    
    this.gravitySlider = document.getElementById('gravity-slider') as HTMLInputElement;
    this.gravityValue = document.getElementById('gravity-value') as HTMLElement;
    this.windSlider = document.getElementById('wind-slider') as HTMLInputElement;
    this.windValue = document.getElementById('wind-value') as HTMLElement;
    this.lifetimeSlider = document.getElementById('lifetime-slider') as HTMLInputElement;
    this.lifetimeValue = document.getElementById('lifetime-value') as HTMLElement;
    this.trailSlider = document.getElementById('trail-slider') as HTMLInputElement;
    this.trailValue = document.getElementById('trail-value') as HTMLElement;
    this.pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.fpsDisplay = document.getElementById('fps-display') as HTMLElement;
    this.particleCountDisplay = document.getElementById('particle-count') as HTMLElement;
    this.controlPanel = document.getElementById('control-panel') as HTMLElement;
    this.panelTitle = document.getElementById('panel-title') as HTMLElement;
    this.toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
    
    this.bindEvents();
    this.updateDisplay();
    this.handleResize();
  }

  private bindEvents(): void {
    this.gravitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.gravity = value;
      this.gravityValue.textContent = value.toFixed(1);
      if (this.callbacks.onGravityChange) {
        this.callbacks.onGravityChange(value);
      }
    });
    
    this.windSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.windStrength = value;
      this.windValue.textContent = value.toFixed(1);
      if (this.callbacks.onWindChange) {
        this.callbacks.onWindChange(value);
      }
    });
    
    this.lifetimeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.lifetime = value;
      this.lifetimeValue.textContent = value.toFixed(1);
      if (this.callbacks.onLifetimeChange) {
        this.callbacks.onLifetimeChange(value);
      }
    });
    
    this.trailSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.trailDecay = value;
      this.trailValue.textContent = value.toFixed(3);
      if (this.callbacks.onTrailDecayChange) {
        this.callbacks.onTrailDecayChange(value);
      }
    });
    
    this.pauseBtn.addEventListener('click', () => {
      this.togglePause();
    });
    
    this.resetBtn.addEventListener('click', () => {
      if (this.callbacks.onReset) {
        this.callbacks.onReset();
      }
    });
    
    this.panelTitle.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        this.togglePanel();
      }
    });
    
    this.toggleBtn.addEventListener('click', () => {
      this.togglePanel();
    });
    
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    if (window.innerWidth > 768) {
      this.controlPanel.classList.remove('collapsed');
      this.isPanelOpen = true;
    } else {
      if (!this.isPanelOpen) {
        this.controlPanel.classList.add('collapsed');
      }
    }
  };

  private togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    if (this.isPanelOpen) {
      this.controlPanel.classList.remove('collapsed');
      this.toggleBtn.textContent = '收起面板';
    } else {
      this.controlPanel.classList.add('collapsed');
      this.toggleBtn.textContent = '控制面板';
    }
  }

  togglePause(): boolean {
    this.isPaused = !this.isPaused;
    this.pauseBtn.textContent = this.isPaused ? '继续 (Space)' : '暂停 (Space)';
    
    if (this.callbacks.onPause) {
      this.callbacks.onPause();
    }
    
    return this.isPaused;
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.pauseBtn.textContent = this.isPaused ? '继续 (Space)' : '暂停 (Space)';
  }

  updateFPS(fps: number): void {
    this.fpsDisplay.textContent = Math.round(fps).toString();
  }

  updateParticleCount(count: number): void {
    this.particleCountDisplay.textContent = count.toString();
  }

  getParams(): UIParams {
    return { ...this.params };
  }

  setParams(params: Partial<UIParams>): void {
    if (params.gravity !== undefined) {
      this.params.gravity = params.gravity;
      this.gravitySlider.value = params.gravity.toString();
      this.gravityValue.textContent = params.gravity.toFixed(1);
    }
    if (params.windStrength !== undefined) {
      this.params.windStrength = params.windStrength;
      this.windSlider.value = params.windStrength.toString();
      this.windValue.textContent = params.windStrength.toFixed(1);
    }
    if (params.lifetime !== undefined) {
      this.params.lifetime = params.lifetime;
      this.lifetimeSlider.value = params.lifetime.toString();
      this.lifetimeValue.textContent = params.lifetime.toFixed(1);
    }
    if (params.trailDecay !== undefined) {
      this.params.trailDecay = params.trailDecay;
      this.trailSlider.value = params.trailDecay.toString();
      this.trailValue.textContent = params.trailDecay.toFixed(3);
    }
  }

  private updateDisplay(): void {
    this.gravityValue.textContent = this.params.gravity.toFixed(1);
    this.windValue.textContent = this.params.windStrength.toFixed(1);
    this.lifetimeValue.textContent = this.params.lifetime.toFixed(1);
    this.trailValue.textContent = this.params.trailDecay.toFixed(3);
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
  }
}
