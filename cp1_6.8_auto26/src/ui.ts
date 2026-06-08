import { FireworksConfig } from './system';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  config: FireworksConfig;
}

export interface UICallbacks {
  onConfigChange: (config: FireworksConfig) => void;
  onLaunch: () => void;
  onPreview: () => void;
  onSave: () => void;
  onReplay: () => void;
}

const STORAGE_KEY = 'fireworks_styles';
const MAX_STYLES = 10;

export class UIManager {
  private config: FireworksConfig;
  private callbacks: UICallbacks;
  private history: HistoryEntry[] = [];
  private savedStyles: FireworksConfig[] = [];
  private previewActive: boolean = false;

  private launchAngleInput: HTMLInputElement;
  private explosionRadiusInput: HTMLInputElement;
  private particleCountInput: HTMLInputElement;
  private particleLifetimeInput: HTMLInputElement;
  private startColorInput: HTMLInputElement;
  private endColorInput: HTMLInputElement;

  private launchAngleValue: HTMLElement;
  private explosionRadiusValue: HTMLElement;
  private particleCountValue: HTMLElement;
  private particleLifetimeValue: HTMLElement;
  private startColorPreview: HTMLElement;
  private endColorPreview: HTMLElement;

  private launchBtn: HTMLButtonElement;
  private previewBtn: HTMLButtonElement;
  private saveBtn: HTMLButtonElement;
  private replayBtn: HTMLButtonElement;

  private sidebar: HTMLElement;
  private sidebarToggle: HTMLElement;
  private historyList: HTMLElement;

  private flashEffect: HTMLElement;
  private warningToast: HTMLElement;

  private fpsValue: HTMLElement;
  private particleCountStatus: HTMLElement;
  private sparkCountStatus: HTMLElement;

  constructor(config: FireworksConfig, callbacks: UICallbacks) {
    this.config = { ...config };
    this.callbacks = callbacks;

    this.launchAngleInput = document.getElementById('launchAngle') as HTMLInputElement;
    this.explosionRadiusInput = document.getElementById('explosionRadius') as HTMLInputElement;
    this.particleCountInput = document.getElementById('particleCount') as HTMLInputElement;
    this.particleLifetimeInput = document.getElementById('particleLifetime') as HTMLInputElement;
    this.startColorInput = document.getElementById('startColor') as HTMLInputElement;
    this.endColorInput = document.getElementById('endColor') as HTMLInputElement;

    this.launchAngleValue = document.getElementById('launchAngleValue') as HTMLElement;
    this.explosionRadiusValue = document.getElementById('explosionRadiusValue') as HTMLElement;
    this.particleCountValue = document.getElementById('particleCountValue') as HTMLElement;
    this.particleLifetimeValue = document.getElementById('particleLifetimeValue') as HTMLElement;
    this.startColorPreview = document.getElementById('startColorPreview') as HTMLElement;
    this.endColorPreview = document.getElementById('endColorPreview') as HTMLElement;

    this.launchBtn = document.getElementById('launchBtn') as HTMLButtonElement;
    this.previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
    this.saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    this.replayBtn = document.getElementById('replayBtn') as HTMLButtonElement;

    this.sidebar = document.getElementById('sidebar') as HTMLElement;
    this.sidebarToggle = document.getElementById('sidebarToggle') as HTMLElement;
    this.historyList = document.getElementById('historyList') as HTMLElement;

    this.flashEffect = document.getElementById('flashEffect') as HTMLElement;
    this.warningToast = document.getElementById('warningToast') as HTMLElement;

    this.fpsValue = document.getElementById('fpsValue') as HTMLElement;
    this.particleCountStatus = document.getElementById('particleCountStatus') as HTMLElement;
    this.sparkCountStatus = document.getElementById('sparkCountStatus') as HTMLElement;

    this.loadSavedStyles();
    this.bindEvents();
    this.updateUI();
  }

  private bindEvents(): void {
    this.launchAngleInput.addEventListener('input', () => this.onSliderInput('launchAngle'));
    this.explosionRadiusInput.addEventListener('input', () => this.onSliderInput('explosionRadius'));
    this.particleCountInput.addEventListener('input', () => this.onSliderInput('particleCount'));
    this.particleLifetimeInput.addEventListener('input', () => this.onSliderInput('particleLifetime'));

    this.startColorInput.addEventListener('input', () => this.onColorInput('startColor'));
    this.endColorInput.addEventListener('input', () => this.onColorInput('endColor'));

    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      slider.addEventListener('mousedown', (e) => this.onSliderStart(e));
      slider.addEventListener('mousemove', (e) => this.onSliderMove(e));
      slider.addEventListener('mouseup', () => this.onSliderEnd());
      slider.addEventListener('touchstart', (e) => this.onSliderStart(e));
      slider.addEventListener('touchmove', (e) => this.onSliderMove(e));
      slider.addEventListener('touchend', () => this.onSliderEnd());
    });

    this.launchBtn.addEventListener('click', (e) => {
      this.createRipple(e);
      this.callbacks.onLaunch();
    });

    this.previewBtn.addEventListener('click', (e) => {
      this.createRipple(e);
      this.togglePreview();
    });

    this.saveBtn.addEventListener('click', (e) => {
      this.createRipple(e);
      this.saveStyle();
    });

    this.replayBtn.addEventListener('click', (e) => {
      this.createRipple(e);
      this.callbacks.onReplay();
    });

    this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());

    const sectionHeaders = document.querySelectorAll('.section-header');
    sectionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const section = header.getAttribute('data-section');
        if (section) this.toggleSection(section);
      });
    });
  }

  private onSliderInput(key: keyof FireworksConfig): void {
    const inputMap: Record<string, HTMLInputElement> = {
      launchAngle: this.launchAngleInput,
      explosionRadius: this.explosionRadiusInput,
      particleCount: this.particleCountInput,
      particleLifetime: this.particleLifetimeInput
    };

    const value = parseFloat(inputMap[key].value);
    (this.config as unknown as Record<string, number>)[key] = value;

    this.updateValueLabels();
    this.addHistoryEntry();
    this.callbacks.onConfigChange({ ...this.config });
  }

  private onColorInput(key: 'startColor' | 'endColor'): void {
    const input = key === 'startColor' ? this.startColorInput : this.endColorInput;
    this.config[key] = input.value;

    const preview = key === 'startColor' ? this.startColorPreview : this.endColorPreview;
    preview.style.background = input.value;

    this.addHistoryEntry();
    this.callbacks.onConfigChange({ ...this.config });
  }

  private onSliderStart(e: Event): void {
    const target = e.target as HTMLInputElement;
    const container = target.closest('.slider-container');
    if (container) {
      container.classList.add('active');
    }
    this.updateSliderValuePosition(e);
  }

  private onSliderMove(e: Event): void {
    this.updateSliderValuePosition(e);
  }

  private onSliderEnd(): void {
    const containers = document.querySelectorAll('.slider-container');
    containers.forEach(c => c.classList.remove('active'));
  }

  private updateSliderValuePosition(e: Event): void {
    const target = e.target as HTMLInputElement;
    const container = target.closest('.slider-container');
    if (!container) return;

    const valueSpan = container.querySelector('.slider-value') as HTMLElement;
    if (!valueSpan) return;

    const rect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const min = parseFloat(target.min);
    const max = parseFloat(target.max);
    const value = parseFloat(target.value);
    const percent = (value - min) / (max - min);
    const left = percent * rect.width;

    valueSpan.style.left = `${left}px`;
  }

  private updateValueLabels(): void {
    this.launchAngleValue.textContent = `${this.config.launchAngle}°`;
    this.explosionRadiusValue.textContent = `${this.config.explosionRadius}px`;
    this.particleCountValue.textContent = `${this.config.particleCount}`;
    this.particleLifetimeValue.textContent = `${this.config.particleLifetime.toFixed(1)}s`;
  }

  private updateUI(): void {
    this.launchAngleInput.value = this.config.launchAngle.toString();
    this.explosionRadiusInput.value = this.config.explosionRadius.toString();
    this.particleCountInput.value = this.config.particleCount.toString();
    this.particleLifetimeInput.value = this.config.particleLifetime.toString();
    this.startColorInput.value = this.config.startColor;
    this.endColorInput.value = this.config.endColor;

    this.startColorPreview.style.background = this.config.startColor;
    this.endColorPreview.style.background = this.config.endColor;

    this.updateValueLabels();
  }

  private addHistoryEntry(): void {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      config: { ...this.config }
    };

    this.history.unshift(entry);
    if (this.history.length > 20) {
      this.history.pop();
    }

    this.renderHistory();
  }

  private renderHistory(): void {
    this.historyList.innerHTML = '';

    if (this.history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-item';
      empty.textContent = '暂无历史记录';
      empty.style.opacity = '0.5';
      empty.style.cursor = 'default';
      this.historyList.appendChild(empty);
      return;
    }

    for (const entry of this.history) {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.dataset.id = entry.id;

      const time = new Date(entry.timestamp);
      const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      item.innerHTML = `
        <div class="history-time">${timeStr}</div>
        <div class="history-preview">
          <span class="history-dot" style="background: ${entry.config.startColor}"></span>
          <span>→</span>
          <span class="history-dot" style="background: ${entry.config.endColor}"></span>
          <span style="margin-left: 5px; font-size: 10px;">${entry.config.particleCount}粒</span>
        </div>
      `;

      item.addEventListener('click', () => this.restoreHistory(entry.id));
      this.historyList.appendChild(item);
    }
  }

  private restoreHistory(id: string): void {
    const entry = this.history.find(h => h.id === id);
    if (!entry) return;

    this.config = { ...entry.config };
    this.updateUI();
    this.callbacks.onConfigChange({ ...this.config });
  }

  private toggleSidebar(): void {
    this.sidebar.classList.toggle('expanded');
  }

  private toggleSection(section: string): void {
    const contentMap: Record<string, string> = {
      history: 'historyContent',
      launch: 'launchContent',
      particle: 'particleContent',
      color: 'colorContent',
      action: 'actionContent'
    };

    const contentId = contentMap[section];
    if (!contentId) return;

    const content = document.getElementById(contentId);
    const header = document.querySelector(`.section-header[data-section="${section}"]`);
    const arrow = header?.querySelector('.section-arrow') as HTMLElement | null;

    if (content) {
      content.classList.toggle('collapsed');
      if (arrow) {
        arrow.style.transform = content.classList.contains('collapsed') ? 'rotate(-90deg)' : 'rotate(0)';
      }
    }
  }

  private createRipple(e: MouseEvent): void {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    target.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  }

  private togglePreview(): void {
    this.previewActive = !this.previewActive;
    const btnText = this.previewBtn.querySelector('.btn-text');
    const btnIcon = this.previewBtn.querySelector('.btn-icon');

    if (this.previewActive) {
      if (btnText) btnText.textContent = '停止';
      if (btnIcon) btnIcon.textContent = '⏸';
      this.callbacks.onPreview();
    } else {
      if (btnText) btnText.textContent = '预览';
      if (btnIcon) btnIcon.textContent = '▶';
    }
  }

  public isPreviewActive(): boolean {
    return this.previewActive;
  }

  public stopPreview(): void {
    this.previewActive = false;
    const btnText = this.previewBtn.querySelector('.btn-text');
    const btnIcon = this.previewBtn.querySelector('.btn-icon');
    if (btnText) btnText.textContent = '预览';
    if (btnIcon) btnIcon.textContent = '▶';
  }

  private saveStyle(): void {
    if (this.savedStyles.length >= MAX_STYLES) {
      this.showWarning();
      return;
    }

    this.savedStyles.push({ ...this.config });
    this.saveToStorage();
    this.callbacks.onSave();
  }

  private loadSavedStyles(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.savedStyles = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load saved styles:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.savedStyles));
    } catch (e) {
      console.error('Failed to save styles:', e);
    }
  }

  public getSavedStyles(): FireworksConfig[] {
    return [...this.savedStyles];
  }

  private showWarning(): void {
    this.warningToast.classList.add('show');
    setTimeout(() => {
      this.warningToast.classList.remove('show');
    }, 3000);
  }

  public showFlash(): void {
    this.flashEffect.classList.add('active');
    setTimeout(() => {
      this.flashEffect.classList.remove('active');
    }, 300);
  }

  public updateStatus(fps: number, particles: number, sparks: number): void {
    const oldFps = parseInt(this.fpsValue.textContent || '0');
    const oldParticles = parseInt(this.particleCountStatus.textContent || '0');
    const oldSparks = parseInt(this.sparkCountStatus.textContent || '0');

    this.fpsValue.textContent = Math.round(fps).toString();
    this.particleCountStatus.textContent = particles.toString();
    this.sparkCountStatus.textContent = sparks.toString();

    if (Math.abs(fps - oldFps) > 5) {
      this.fpsValue.classList.add('bump');
      setTimeout(() => this.fpsValue.classList.remove('bump'), 300);
    }

    if (particles !== oldParticles) {
      this.particleCountStatus.classList.add('bump');
      setTimeout(() => this.particleCountStatus.classList.remove('bump'), 300);
    }

    if (sparks !== oldSparks) {
      this.sparkCountStatus.classList.add('bump');
      setTimeout(() => this.sparkCountStatus.classList.remove('bump'), 300);
    }
  }

  public setConfig(config: FireworksConfig): void {
    this.config = { ...config };
    this.updateUI();
  }

  public getConfig(): FireworksConfig {
    return { ...this.config };
  }
}
