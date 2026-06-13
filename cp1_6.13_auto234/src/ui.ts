import { COLORS } from './particle';

export interface UICallbacks {
  onColorChange: (color: string) => void;
  onClear: () => void;
}

export class UIManager {
  private paletteElement: HTMLElement;
  private clearButton: HTMLButtonElement;
  private colorDots: HTMLElement[] = [];
  private currentColor: string;
  private callbacks: UICallbacks;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.currentColor = COLORS[0];

    const palette = document.getElementById('color-palette');
    const clearBtn = document.getElementById('clear-btn');

    if (!palette || !clearBtn) {
      throw new Error('UI elements not found');
    }

    this.paletteElement = palette;
    this.clearButton = clearBtn as HTMLButtonElement;

    this.createColorDots();
    this.bindEvents();
    this.updateActiveDot();
  }

  private createColorDots(): void {
    COLORS.forEach((color) => {
      const dot = document.createElement('div');
      dot.className = 'color-dot';
      dot.style.backgroundColor = color;
      dot.dataset.color = color;
      this.paletteElement.appendChild(dot);
      this.colorDots.push(dot);
    });
  }

  private bindEvents(): void {
    this.colorDots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const color = dot.dataset.color;
        if (color && color !== this.currentColor) {
          this.currentColor = color;
          this.updateActiveDot();
          this.callbacks.onColorChange(color);
        }
      });
    });

    this.clearButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.flashClearButton();
      this.callbacks.onClear();
    });
  }

  private updateActiveDot(): void {
    this.colorDots.forEach((dot) => {
      if (dot.dataset.color === this.currentColor) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  private flashClearButton(): void {
    this.clearButton.style.opacity = '0.5';
    setTimeout(() => {
      this.clearButton.style.opacity = '1';
    }, 100);
  }

  getCurrentColor(): string {
    return this.currentColor;
  }

  setCurrentColor(color: string): void {
    if (COLORS.includes(color) && color !== this.currentColor) {
      this.currentColor = color;
      this.updateActiveDot();
    }
  }
}
