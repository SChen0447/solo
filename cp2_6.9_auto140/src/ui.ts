export interface UIConfig {
  depth: number;
  angle: number;
  speed: number;
}

export interface UICallbacks {
  onDepthChange: (depth: number) => void;
  onAngleChange: (angle: number) => void;
  onSpeedChange: (speed: number) => void;
}

export class UIManager {
  private depthSlider: HTMLInputElement;
  private angleSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private depthValue: HTMLElement;
  private angleValue: HTMLElement;
  private speedValue: HTMLElement;
  private depthStatus: HTMLElement;
  private branchCount: HTMLElement;
  private fpsValue: HTMLElement;
  private warningText: HTMLElement;
  private statusBar: HTMLElement;
  private controlPanel: HTMLElement;
  private panelToggle: HTMLButtonElement;
  private config: UIConfig;
  private callbacks: UICallbacks;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.config = { depth: 6, angle: 30, speed: 1.0 };

    this.depthSlider = document.getElementById('depth-slider') as HTMLInputElement;
    this.angleSlider = document.getElementById('angle-slider') as HTMLInputElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.depthValue = document.getElementById('depth-value') as HTMLElement;
    this.angleValue = document.getElementById('angle-value') as HTMLElement;
    this.speedValue = document.getElementById('speed-value') as HTMLElement;
    this.depthStatus = document.getElementById('depth-status') as HTMLElement;
    this.branchCount = document.getElementById('branch-count') as HTMLElement;
    this.fpsValue = document.getElementById('fps-value') as HTMLElement;
    this.warningText = document.getElementById('warning-text') as HTMLElement;
    this.statusBar = document.getElementById('status-bar') as HTMLElement;
    this.controlPanel = document.getElementById('control-panel') as HTMLElement;
    this.panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement;

    this.bindEvents();
    this.updateDisplays();
  }

  private bindEvents(): void {
    this.depthSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.config.depth = value;
      this.updateDepthDisplay();
      this.checkDepthWarning();
      this.callbacks.onDepthChange(value);
    });

    this.angleSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.config.angle = value;
      this.updateAngleDisplay();
      this.callbacks.onAngleChange(value);
    });

    this.speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.config.speed = value;
      this.updateSpeedDisplay();
      this.callbacks.onSpeedChange(value);
    });

    this.panelToggle.addEventListener('click', () => {
      this.controlPanel.classList.toggle('expanded');
    });
  }

  private updateDisplays(): void {
    this.updateDepthDisplay();
    this.updateAngleDisplay();
    this.updateSpeedDisplay();
    this.checkDepthWarning();
  }

  private updateDepthDisplay(): void {
    this.depthValue.textContent = this.config.depth.toString();
    this.depthStatus.textContent = this.config.depth.toString();
  }

  private updateAngleDisplay(): void {
    this.angleValue.textContent = this.config.angle.toString();
  }

  private updateSpeedDisplay(): void {
    this.speedValue.textContent = `${this.config.speed.toFixed(1)}x`;
  }

  private checkDepthWarning(): void {
    if (this.config.depth > 8) {
      this.warningText.style.display = 'block';
      this.depthSlider.max = '8';
    } else {
      this.warningText.style.display = 'none';
    }
  }

  updateBranchCount(count: number): void {
    this.branchCount.textContent = count.toString();
  }

  updateFPS(currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 1000) {
      const fps = this.frameCount;
      this.fpsValue.textContent = fps.toString();
      
      if (fps < 30) {
        this.fpsValue.classList.remove('normal');
        this.fpsValue.classList.add('low');
        this.statusBar.style.background = 'rgba(255, 68, 68, 0.4)';
      } else {
        this.fpsValue.classList.remove('low');
        this.fpsValue.classList.add('normal');
        this.statusBar.style.background = 'rgba(0, 0, 0, 0.4)';
      }
      
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }
  }

  getConfig(): UIConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<UIConfig>): void {
    if (config.depth !== undefined) {
      this.config.depth = config.depth;
      this.depthSlider.value = config.depth.toString();
    }
    if (config.angle !== undefined) {
      this.config.angle = config.angle;
      this.angleSlider.value = config.angle.toString();
    }
    if (config.speed !== undefined) {
      this.config.speed = config.speed;
      this.speedSlider.value = config.speed.toString();
    }
    this.updateDisplays();
  }
}
