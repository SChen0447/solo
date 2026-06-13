export interface PanelConfig {
  onGrowthSpeedChange: (value: number) => void;
  onFragmentForceChange: (value: number) => void;
  onColorCycleChange: (value: number) => void;
  onReset: () => void;
  initialValues: {
    growthSpeed: number;
    fragmentForce: number;
    colorCycleSpeed: number;
  };
}

export class ControlPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private toggleButton: HTMLElement | null = null;
  
  private isMobile: boolean;
  private isExpanded: boolean = false;
  
  private onGrowthSpeedChange: (value: number) => void;
  private onFragmentForceChange: (value: number) => void;
  private onColorCycleChange: (value: number) => void;
  private onReset: () => void;
  
  private growthSpeedSlider: HTMLInputElement | null = null;
  private fragmentForceSlider: HTMLInputElement | null = null;
  private colorCycleSlider: HTMLInputElement | null = null;
  
  private growthSpeedValue: HTMLElement | null = null;
  private fragmentForceValue: HTMLElement | null = null;
  private colorCycleValue: HTMLElement | null = null;

  private boundOnResize: () => void;
  private boundOnToggleClick: () => void;

  private mobileBreakpoint: number = 768;

  constructor(config: PanelConfig) {
    this.onGrowthSpeedChange = config.onGrowthSpeedChange;
    this.onFragmentForceChange = config.onFragmentForceChange;
    this.onColorCycleChange = config.onColorCycleChange;
    this.onReset = config.onReset;
    
    this.isMobile = window.innerWidth < this.mobileBreakpoint;
    this.boundOnResize = this.handleResize.bind(this);
    this.boundOnToggleClick = this.togglePanel.bind(this);
    
    this.container = document.createElement('div');
    this.panel = document.createElement('div');
    
    this.createPanel(config.initialValues);
    this.attachToDom();
    this.setupEventListeners();
  }

  private createPanel(initialValues: PanelConfig['initialValues']): void {
    const style = document.createElement('style');
    style.textContent = `
      .crystal-panel-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        font-family: 'Consolas', 'Monaco', monospace;
      }
      
      .crystal-panel {
        width: 200px;
        background: rgba(20, 10, 40, 0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(136, 85, 255, 0.3);
        border-radius: 6px;
        padding: 16px;
        color: #e0d0ff;
        transition: all 0.3s ease-out;
      }
      
      .crystal-panel-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #aa88ff;
        margin-bottom: 16px;
        text-align: center;
        font-weight: 600;
      }
      
      .crystal-panel-control {
        margin-bottom: 16px;
      }
      
      .crystal-panel-label {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        margin-bottom: 6px;
        color: #b0a0d0;
      }
      
      .crystal-panel-value {
        color: #88ffcc;
        font-variant-numeric: tabular-nums;
      }
      
      .crystal-panel-slider {
        width: 100%;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(136, 85, 255, 0.3);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }
      
      .crystal-panel-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        background: #88ffcc;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(136, 255, 204, 0.5);
        transition: all 0.2s ease;
      }
      
      .crystal-panel-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(136, 255, 204, 0.8);
      }
      
      .crystal-panel-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        background: #88ffcc;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(136, 255, 204, 0.5);
      }
      
      .crystal-panel-button {
        width: 100%;
        padding: 10px;
        background: linear-gradient(135deg, rgba(136, 85, 255, 0.4), rgba(0, 204, 255, 0.4));
        border: 1px solid rgba(136, 85, 255, 0.5);
        border-radius: 4px;
        color: #ffffff;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-top: 8px;
      }
      
      .crystal-panel-button:hover {
        background: linear-gradient(135deg, rgba(136, 85, 255, 0.6), rgba(0, 204, 255, 0.6));
        box-shadow: 0 0 15px rgba(136, 85, 255, 0.4);
        transform: translateY(-1px);
      }
      
      .crystal-panel-button:active {
        transform: translateY(0);
      }
      
      .crystal-panel-toggle {
        width: 48px;
        height: 48px;
        background: rgba(20, 10, 40, 0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(136, 85, 255, 0.3);
        border-radius: 50%;
        color: #88ffcc;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .crystal-panel-toggle:hover {
        background: rgba(40, 20, 60, 0.8);
        box-shadow: 0 0 20px rgba(136, 255, 204, 0.3);
      }
      
      .crystal-panel-mobile {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(10, 5, 20, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 999;
      }
      
      .crystal-panel-mobile.expanded {
        opacity: 1;
        pointer-events: auto;
      }
      
      .crystal-panel-mobile .crystal-panel {
        width: 280px;
        max-width: 90%;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }
      
      .crystal-panel-mobile.expanded .crystal-panel {
        transform: scale(1);
      }
      
      .crystal-panel-close {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background: none;
        border: 1px solid rgba(136, 85, 255, 0.3);
        border-radius: 50%;
        color: #88ffcc;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .crystal-panel-close:hover {
        background: rgba(136, 85, 255, 0.2);
      }
      
      @media (max-width: 767px) {
        .crystal-panel-container {
          top: 15px;
          right: 15px;
        }
      }
    `;
    document.head.appendChild(style);

    this.container.className = 'crystal-panel-container';
    
    if (this.isMobile) {
      this.createMobilePanel(initialValues);
    } else {
      this.createDesktopPanel(initialValues);
    }
  }

  private createDesktopPanel(initialValues: PanelConfig['initialValues']): void {
    this.panel.className = 'crystal-panel';
    this.panel.innerHTML = this.getPanelContent(initialValues);
    this.container.appendChild(this.panel);
    this.bindPanelEvents();
  }

  private createMobilePanel(initialValues: PanelConfig['initialValues']): void {
    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'crystal-panel-toggle';
    this.toggleButton.innerHTML = '⚙';
    this.toggleButton.addEventListener('click', this.boundOnToggleClick);
    this.container.appendChild(this.toggleButton);

    const mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'crystal-panel-mobile';
    mobileOverlay.id = 'crystal-panel-mobile-overlay';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'crystal-panel-close';
    closeButton.innerHTML = '✕';
    closeButton.addEventListener('click', this.boundOnToggleClick);
    mobileOverlay.appendChild(closeButton);
    
    this.panel.className = 'crystal-panel';
    this.panel.innerHTML = this.getPanelContent(initialValues);
    mobileOverlay.appendChild(this.panel);
    
    document.body.appendChild(mobileOverlay);
    this.bindPanelEvents();
  }

  private getPanelContent(initialValues: PanelConfig['initialValues']): string {
    return `
      <div class="crystal-panel-title">晶格·生长纪元</div>
      
      <div class="crystal-panel-control">
        <div class="crystal-panel-label">
          <span>生长速度</span>
          <span class="crystal-panel-value" id="growth-speed-value">${initialValues.growthSpeed.toFixed(1)}x</span>
        </div>
        <input 
          type="range" 
          class="crystal-panel-slider" 
          id="growth-speed-slider"
          min="0.1" 
          max="2.0" 
          step="0.1" 
          value="${initialValues.growthSpeed}"
        />
      </div>
      
      <div class="crystal-panel-control">
        <div class="crystal-panel-label">
          <span>碎片力度</span>
          <span class="crystal-panel-value" id="fragment-force-value">${initialValues.fragmentForce.toFixed(1)}</span>
        </div>
        <input 
          type="range" 
          class="crystal-panel-slider" 
          id="fragment-force-slider"
          min="0.5" 
          max="2.0" 
          step="0.1" 
          value="${initialValues.fragmentForce}"
        />
      </div>
      
      <div class="crystal-panel-control">
        <div class="crystal-panel-label">
          <span>颜色循环</span>
          <span class="crystal-panel-value" id="color-cycle-value">${initialValues.colorCycleSpeed.toFixed(1)}</span>
        </div>
        <input 
          type="range" 
          class="crystal-panel-slider" 
          id="color-cycle-slider"
          min="0" 
          max="1.0" 
          step="0.1" 
          value="${initialValues.colorCycleSpeed}"
        />
      </div>
      
      <button class="crystal-panel-button" id="reset-button">重置场景</button>
    `;
  }

  private bindPanelEvents(): void {
    this.growthSpeedSlider = document.getElementById('growth-speed-slider') as HTMLInputElement;
    this.fragmentForceSlider = document.getElementById('fragment-force-slider') as HTMLInputElement;
    this.colorCycleSlider = document.getElementById('color-cycle-slider') as HTMLInputElement;
    
    this.growthSpeedValue = document.getElementById('growth-speed-value');
    this.fragmentForceValue = document.getElementById('fragment-force-value');
    this.colorCycleValue = document.getElementById('color-cycle-value');
    
    const resetButton = document.getElementById('reset-button');

    if (this.growthSpeedSlider) {
      this.growthSpeedSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        if (this.growthSpeedValue) {
          this.growthSpeedValue.textContent = value.toFixed(1) + 'x';
        }
        this.onGrowthSpeedChange(value);
      });
    }

    if (this.fragmentForceSlider) {
      this.fragmentForceSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        if (this.fragmentForceValue) {
          this.fragmentForceValue.textContent = value.toFixed(1);
        }
        this.onFragmentForceChange(value);
      });
    }

    if (this.colorCycleSlider) {
      this.colorCycleSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        if (this.colorCycleValue) {
          this.colorCycleValue.textContent = value.toFixed(1);
        }
        this.onColorCycleChange(value);
      });
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.onReset();
        if (this.isMobile && this.isExpanded) {
          this.togglePanel();
        }
      });
    }
  }

  private togglePanel(): void {
    this.isExpanded = !this.isExpanded;
    const overlay = document.getElementById('crystal-panel-mobile-overlay');
    if (overlay) {
      overlay.classList.toggle('expanded', this.isExpanded);
    }
  }

  private handleResize(): void {
    const newIsMobile = window.innerWidth < this.mobileBreakpoint;
    if (newIsMobile !== this.isMobile) {
      this.isMobile = newIsMobile;
      this.recreatePanel();
    }
  }

  private recreatePanel(): void {
    const currentValues = {
      growthSpeed: this.growthSpeedSlider ? parseFloat(this.growthSpeedSlider.value) : 1.0,
      fragmentForce: this.fragmentForceSlider ? parseFloat(this.fragmentForceSlider.value) : 1.0,
      colorCycleSpeed: this.colorCycleSlider ? parseFloat(this.colorCycleSlider.value) : 0.5
    };

    this.container.innerHTML = '';
    const overlay = document.getElementById('crystal-panel-mobile-overlay');
    if (overlay) {
      overlay.remove();
    }

    this.isExpanded = false;

    if (this.isMobile) {
      this.createMobilePanel(currentValues);
    } else {
      this.createDesktopPanel(currentValues);
    }
  }

  private attachToDom(): void {
    document.body.appendChild(this.container);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.boundOnResize);
  }

  public updateGrowthSpeed(value: number): void {
    if (this.growthSpeedSlider) {
      this.growthSpeedSlider.value = value.toString();
    }
    if (this.growthSpeedValue) {
      this.growthSpeedValue.textContent = value.toFixed(1) + 'x';
    }
  }

  public updateFragmentForce(value: number): void {
    if (this.fragmentForceSlider) {
      this.fragmentForceSlider.value = value.toString();
    }
    if (this.fragmentForceValue) {
      this.fragmentForceValue.textContent = value.toFixed(1);
    }
  }

  public updateColorCycleSpeed(value: number): void {
    if (this.colorCycleSlider) {
      this.colorCycleSlider.value = value.toString();
    }
    if (this.colorCycleValue) {
      this.colorCycleValue.textContent = value.toFixed(1);
    }
  }

  public dispose(): void {
    window.removeEventListener('resize', this.boundOnResize);
    
    if (this.toggleButton) {
      this.toggleButton.removeEventListener('click', this.boundOnToggleClick);
    }
    
    const overlay = document.getElementById('crystal-panel-mobile-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent?.includes('.crystal-panel')) {
        style.remove();
      }
    });
  }
}
