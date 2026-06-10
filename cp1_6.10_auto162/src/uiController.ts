import type { ThemeId } from './colorTheme';
import { getBackgroundGradient } from './colorTheme';

export interface UICallbacks {
  onDensityChange: (value: number) => void;
  onPulseChange: (value: number) => void;
  onGlowChange: (value: number) => void;
  onThemeChange: (theme: ThemeId) => void;
  onClear: () => void;
}

export class UIController {
  private densitySlider: HTMLInputElement;
  private pulseSlider: HTMLInputElement;
  private glowSlider: HTMLInputElement;
  private themeSelect: HTMLSelectElement;
  private clearBtn: HTMLButtonElement;
  private densityValue: HTMLElement;
  private pulseValue: HTMLElement;
  private glowValue: HTMLElement;
  private controlPanel: HTMLElement;
  private drawerToggle: HTMLButtonElement;
  private callbacks: UICallbacks;
  private isDrawerOpen = false;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    const densitySlider = document.getElementById('density') as HTMLInputElement | null;
    const pulseSlider = document.getElementById('pulse') as HTMLInputElement | null;
    const glowSlider = document.getElementById('glow') as HTMLInputElement | null;
    const themeSelect = document.getElementById('theme') as HTMLSelectElement | null;
    const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement | null;
    const densityValue = document.getElementById('density-value');
    const pulseValue = document.getElementById('pulse-value');
    const glowValue = document.getElementById('glow-value');
    const controlPanel = document.getElementById('control-panel');
    const drawerToggle = document.getElementById('drawer-toggle') as HTMLButtonElement | null;

    if (!densitySlider || !pulseSlider || !glowSlider || !themeSelect ||
        !clearBtn || !densityValue || !pulseValue || !glowValue ||
        !controlPanel || !drawerToggle) {
      throw new Error('控制面板元素缺失');
    }

    this.densitySlider = densitySlider;
    this.pulseSlider = pulseSlider;
    this.glowSlider = glowSlider;
    this.themeSelect = themeSelect;
    this.clearBtn = clearBtn;
    this.densityValue = densityValue;
    this.pulseValue = pulseValue;
    this.glowValue = glowValue;
    this.controlPanel = controlPanel;
    this.drawerToggle = drawerToggle;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.densitySlider.addEventListener('input', () => {
      const value = parseFloat(this.densitySlider.value);
      this.densityValue.textContent = value.toFixed(1);
      this.callbacks.onDensityChange(value);
    });

    this.pulseSlider.addEventListener('input', () => {
      const value = parseFloat(this.pulseSlider.value);
      this.pulseValue.textContent = value.toFixed(1);
      this.callbacks.onPulseChange(value);
    });

    this.glowSlider.addEventListener('input', () => {
      const value = parseFloat(this.glowSlider.value);
      this.glowValue.textContent = value.toFixed(2);
      this.callbacks.onGlowChange(value);
    });

    this.themeSelect.addEventListener('change', () => {
      const theme = this.themeSelect.value as ThemeId;
      this.updateBodyBackground(theme);
      this.callbacks.onThemeChange(theme);
    });

    this.clearBtn.addEventListener('click', () => {
      this.callbacks.onClear();
    });

    this.drawerToggle.addEventListener('click', () => {
      this.toggleDrawer();
    });
  }

  private toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
    if (this.isDrawerOpen) {
      this.controlPanel.classList.add('open');
    } else {
      this.controlPanel.classList.remove('open');
    }
  }

  private updateBodyBackground(theme: ThemeId): void {
    document.body.style.background = getBackgroundGradient(theme);
  }
}
