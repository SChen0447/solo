import { FONT_STYLES, type FontStyle } from './BrushEngine';

export interface UIState {
  currentStyle: FontStyle;
  inkColor: string;
  inkAmount: number;
  showTexture: boolean;
}

export type UIEvent =
  | { type: 'styleChange'; style: FontStyle }
  | { type: 'colorChange'; color: string }
  | { type: 'inkAmountChange'; amount: number }
  | { type: 'textureToggle'; show: boolean }
  | { type: 'clear' };

export class UIController {
  private state: UIState;
  private listeners: Array<(event: UIEvent) => void> = [];
  private styleBtns: NodeListOf<HTMLButtonElement>;
  private colorTrigger: HTMLElement;
  private colorPanel: HTMLElement;
  private colorSwatches: NodeListOf<HTMLElement>;
  private inkSlider: HTMLInputElement;
  private inkValue: HTMLElement;
  private textureToggle: HTMLElement;
  private clearBtn: HTMLButtonElement;
  private speedFill: HTMLElement;
  private inkFill: HTMLElement;
  private inkText: HTMLElement;

  constructor() {
    this.state = {
      currentStyle: FONT_STYLES.kaishu,
      inkColor: '#0D0D0D',
      inkAmount: 100,
      showTexture: true
    };

    this.styleBtns = document.querySelectorAll('.style-btn');
    this.colorTrigger = document.getElementById('colorTrigger')!;
    this.colorPanel = document.getElementById('colorPanel')!;
    this.colorSwatches = document.querySelectorAll('.color-swatch');
    this.inkSlider = document.getElementById('inkSlider') as HTMLInputElement;
    this.inkValue = document.getElementById('inkValue')!;
    this.textureToggle = document.getElementById('textureToggle')!;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    this.speedFill = document.getElementById('speedFill')!;
    this.inkFill = document.getElementById('inkFill')!;
    this.inkText = document.getElementById('inkText')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.styleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const styleKey = btn.dataset.style as keyof typeof FONT_STYLES;
        if (styleKey && FONT_STYLES[styleKey]) {
          this.setStyle(FONT_STYLES[styleKey]);
          this.styleBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });

    this.colorTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.colorPanel.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!this.colorPanel.contains(e.target as Node) && e.target !== this.colorTrigger) {
        this.colorPanel.classList.remove('show');
      }
    });

    this.colorSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        if (color) {
          this.setInkColor(color);
          this.colorSwatches.forEach((s) => s.classList.remove('selected'));
          swatch.classList.add('selected');
          this.colorTrigger.style.background = color;
          this.colorPanel.classList.remove('show');
        }
      });
    });

    this.inkSlider.addEventListener('input', () => {
      const value = parseInt(this.inkSlider.value, 10);
      this.inkValue.textContent = value.toString();
      this.setInkAmount(value);
    });

    this.textureToggle.addEventListener('click', () => {
      const show = !this.textureToggle.classList.contains('active');
      this.textureToggle.classList.toggle('active', show);
      this.setShowTexture(show);
    });

    this.clearBtn.addEventListener('click', () => {
      this.emit({ type: 'clear' });
    });
  }

  subscribe(listener: (event: UIEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: UIEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  getState(): UIState {
    return { ...this.state };
  }

  setStyle(style: FontStyle): void {
    this.state.currentStyle = style;
    this.emit({ type: 'styleChange', style });
  }

  setInkColor(color: string): void {
    this.state.inkColor = color;
    this.emit({ type: 'colorChange', color });
  }

  setInkAmount(amount: number): void {
    this.state.inkAmount = amount;
    this.emit({ type: 'inkAmountChange', amount });
  }

  setShowTexture(show: boolean): void {
    this.state.showTexture = show;
    this.emit({ type: 'textureToggle', show });
  }

  updateSpeedDisplay(speed: number): void {
    const percent = Math.min(100, speed * 50);
    this.speedFill.style.width = `${percent}%`;
  }

  updateInkDisplay(remaining: number): void {
    const percent = Math.max(0, Math.min(100, remaining));
    this.inkFill.style.width = `${percent}%`;
    this.inkText.textContent = `${Math.round(percent)}%`;

    if (percent < 25) {
      this.inkFill.classList.add('low');
    } else {
      this.inkFill.classList.remove('low');
    }
  }

  isMobile(): boolean {
    return window.innerWidth < 768;
  }
}
