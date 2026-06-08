import { ColorTheme, colorThemes } from './particleSystem';

export interface ControlPanelCallbacks {
  onPlayPause: () => void;
  onSeek: (progress: number) => void;
  onThemeChange: (theme: string) => void;
  onSizeChange: (size: number) => void;
  onSensitivityChange: (sensitivity: number) => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private playBtn: HTMLButtonElement;
  private progressBar: HTMLElement;
  private progressFill: HTMLElement;
  private currentTimeEl: HTMLElement;
  private totalTimeEl: HTMLElement;
  private sizeSlider: HTMLInputElement;
  private sizeValue: HTMLElement;
  private sensitivitySlider: HTMLInputElement;
  private sensitivityValue: HTMLElement;
  private themeButtons: NodeListOf<HTMLButtonElement>;

  private callbacks: ControlPanelCallbacks;
  private isDragging: boolean = false;
  private currentTheme: string = 'aurora';

  constructor(containerId: string, callbacks: ControlPanelCallbacks) {
    this.container = document.getElementById(containerId)!;
    this.callbacks = callbacks;

    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.progressBar = document.getElementById('progress-bar') as HTMLElement;
    this.progressFill = document.getElementById('progress-fill') as HTMLElement;
    this.currentTimeEl = document.getElementById('current-time') as HTMLElement;
    this.totalTimeEl = document.getElementById('total-time') as HTMLElement;
    this.sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
    this.sizeValue = document.getElementById('size-value') as HTMLElement;
    this.sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
    this.sensitivityValue = document.getElementById('sensitivity-value') as HTMLElement;
    this.themeButtons = document.querySelectorAll('.theme-btn') as NodeListOf<HTMLButtonElement>;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.playBtn.addEventListener('click', () => {
      this.callbacks.onPlayPause();
    });

    this.progressBar.addEventListener('click', (e) => {
      const rect = this.progressBar.getBoundingClientRect();
      const progress = (e.clientX - rect.left) / rect.width;
      this.callbacks.onSeek(Math.max(0, Math.min(1, progress)));
    });

    this.progressBar.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      const rect = this.progressBar.getBoundingClientRect();
      const progress = (e.clientX - rect.left) / rect.width;
      this.callbacks.onSeek(Math.max(0, Math.min(1, progress)));
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const rect = this.progressBar.getBoundingClientRect();
        const progress = (e.clientX - rect.left) / rect.width;
        this.callbacks.onSeek(Math.max(0, Math.min(1, progress)));
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.themeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme!;
        this.setTheme(theme);
        this.callbacks.onThemeChange(theme);
      });
    });

    this.sizeSlider.addEventListener('input', () => {
      const value = parseFloat(this.sizeSlider.value);
      this.sizeValue.textContent = `${value}px`;
      this.callbacks.onSizeChange(value);
    });

    this.sensitivitySlider.addEventListener('input', () => {
      const value = parseFloat(this.sensitivitySlider.value);
      this.sensitivityValue.textContent = value.toFixed(1);
      this.callbacks.onSensitivityChange(value);
    });
  }

  public show(): void {
    this.container.style.display = 'block';
  }

  public setPlaying(isPlaying: boolean): void {
    this.playBtn.textContent = isPlaying ? '⏸' : '▶';
  }

  public setProgress(currentTime: number, duration: number): void {
    if (duration > 0) {
      const progress = (currentTime / duration) * 100;
      this.progressFill.style.width = `${progress}%`;
    }
    this.currentTimeEl.textContent = this.formatTime(currentTime);
    this.totalTimeEl.textContent = this.formatTime(duration);
  }

  public setTheme(themeName: string): void {
    this.currentTheme = themeName;
    const theme = colorThemes[themeName];
    
    this.themeButtons.forEach((btn) => {
      if (btn.dataset.theme === themeName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (theme) {
      this.progressFill.style.background = `linear-gradient(90deg, ${theme.gradientStart}, ${theme.gradientEnd})`;
      this.playBtn.style.background = `linear-gradient(135deg, ${theme.gradientStart}, ${theme.gradientEnd})`;
      
      const thumbStyle = document.createElement('style');
      thumbStyle.textContent = `
        .slider::-webkit-slider-thumb {
          background: ${theme.gradientStart} !important;
        }
      `;
    }
  }

  public getCurrentTheme(): string {
    return this.currentTheme;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
