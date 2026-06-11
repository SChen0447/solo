import { COLOR_THEMES, ThemeName, ColorTheme } from './materials';

export interface UICallbacks {
  onHeatChange: (value: number) => void;
  onThemeChange: (themeName: ThemeName) => void;
}

export class UIController {
  private callbacks: UICallbacks;
  private heatSlider!: HTMLElement;
  private heatThumb!: HTMLElement;
  private heatTrack!: HTMLElement;
  private heatValueEl!: HTMLElement;
  private themeButtonsContainer!: HTMLElement;
  private currentHeat: number;
  private currentTheme: ThemeName;
  private isDraggingSlider: boolean;
  private themeButtons: Map<ThemeName, HTMLElement>;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.currentHeat = 50;
    this.currentTheme = 'neon';
    this.isDraggingSlider = false;
    this.themeButtons = new Map();

    this.initElements();
    this.initThemeButtons();
    this.bindHeatSliderEvents();
    this.updateHeatUI(this.currentHeat);
  }

  private initElements(): void {
    this.heatSlider = document.getElementById('heat-slider')!;
    this.heatThumb = document.getElementById('heat-slider-thumb')!;
    this.heatTrack = document.getElementById('heat-slider-track')!;
    this.heatValueEl = document.getElementById('heat-value')!;
    this.themeButtonsContainer = document.getElementById('theme-buttons')!;

    if (!this.heatSlider || !this.heatThumb || !this.heatTrack || !this.heatValueEl) {
      console.error('UI elements not found');
    }
  }

  private initThemeButtons(): void {
    if (!this.themeButtonsContainer) return;

    COLOR_THEMES.forEach((theme: ColorTheme) => {
      const btn = document.createElement('div');
      btn.className = 'theme-btn';
      btn.dataset.theme = theme.name;
      btn.style.background = theme.buttonGradient;
      btn.style.backgroundSize = '300% 300%';
      btn.style.animation = `gradientShift_${theme.name} 4s ease infinite`;

      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = theme.displayName;
      btn.appendChild(tooltip);

      btn.addEventListener('click', () => {
        this.setTheme(theme.name);
      });

      if (theme.name === this.currentTheme) {
        btn.classList.add('active');
      }

      this.themeButtonsContainer.appendChild(btn);
      this.themeButtons.set(theme.name, btn);
    });

    this.injectThemeAnimations();
  }

  private injectThemeAnimations(): void {
    const style = document.createElement('style');
    let css = '';
    COLOR_THEMES.forEach((theme: ColorTheme) => {
      css += `
        @keyframes gradientShift_${theme.name} {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `;
    });
    style.textContent = css;
    document.head.appendChild(style);
  }

  private bindHeatSliderEvents(): void {
    if (!this.heatSlider) return;

    this.heatSlider.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDraggingSlider = true;
      this.handleSliderInteraction(e);
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDraggingSlider) {
        this.handleSliderInteraction(e);
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDraggingSlider = false;
    });

    this.heatSlider.addEventListener('touchstart', (e: TouchEvent) => {
      this.isDraggingSlider = true;
      this.handleSliderTouch(e);
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.isDraggingSlider) {
        this.handleSliderTouch(e);
      }
    });

    document.addEventListener('touchend', () => {
      this.isDraggingSlider = false;
    });
  }

  private handleSliderInteraction(e: MouseEvent): void {
    if (!this.heatSlider) return;
    const rect = this.heatSlider.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const value = Math.round((1 - Math.min(Math.max(y / rect.height, 0), 1)) * 100);
    this.setHeat(value);
  }

  private handleSliderTouch(e: TouchEvent): void {
    if (!this.heatSlider || e.touches.length === 0) return;
    const rect = this.heatSlider.getBoundingClientRect();
    const y = e.touches[0].clientY - rect.top;
    const value = Math.round((1 - Math.min(Math.max(y / rect.height, 0), 1)) * 100);
    this.setHeat(value);
  }

  private setHeat(value: number): void {
    const clampedValue = Math.min(Math.max(value, 0), 100);
    if (clampedValue === this.currentHeat) return;
    this.currentHeat = clampedValue;
    this.updateHeatUI(clampedValue);
    this.callbacks.onHeatChange(clampedValue);
  }

  private updateHeatUI(value: number): void {
    const percentage = value;
    if (this.heatThumb) {
      this.heatThumb.style.bottom = `${percentage}%`;
    }
    if (this.heatTrack) {
      this.heatTrack.style.height = `${percentage}%`;
    }
    if (this.heatValueEl) {
      this.heatValueEl.textContent = String(value);
    }
  }

  setTheme(themeName: ThemeName): void {
    if (themeName === this.currentTheme) return;

    const oldBtn = this.themeButtons.get(this.currentTheme);
    if (oldBtn) oldBtn.classList.remove('active');

    const newBtn = this.themeButtons.get(themeName);
    if (newBtn) newBtn.classList.add('active');

    this.currentTheme = themeName;
    this.callbacks.onThemeChange(themeName);
  }

  getCurrentHeat(): number {
    return this.currentHeat;
  }

  getCurrentTheme(): ThemeName {
    return this.currentTheme;
  }
}
