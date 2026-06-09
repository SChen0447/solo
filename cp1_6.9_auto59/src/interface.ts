import { InkBrush } from './brush.js';

export interface UICallbacks {
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onClear: () => Promise<void> | void;
  onInkUsed: () => void;
}

export class InkInterface {
  private brush: InkBrush;
  private callbacks: UICallbacks;
  private inkLevel: number = 100;
  private isRecovering: boolean = true;
  private lastRecoverTime: number = 0;
  private readonly INK_CIRCUMFERENCE: number = 150.8;
  private flashed: boolean = false;

  private shadeBtns: NodeListOf<HTMLButtonElement>;
  private pigmentBtns: NodeListOf<HTMLButtonElement>;
  private sizeSlider: HTMLInputElement;
  private sizeValue: HTMLSpanElement;
  private clearBtn: HTMLButtonElement;
  private inkProgress: SVGCircleElement;
  private inkText: HTMLSpanElement;

  constructor(brush: InkBrush, callbacks: UICallbacks) {
    this.brush = brush;
    this.callbacks = callbacks;

    this.shadeBtns = document.querySelectorAll('#ink-shades .shade-btn');
    this.pigmentBtns = document.querySelectorAll('#pigments .pigment-btn');
    this.sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
    this.sizeValue = document.getElementById('size-value') as HTMLSpanElement;
    this.clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
    this.inkProgress = document.getElementById('ink-progress') as SVGCircleElement;
    this.inkText = document.getElementById('ink-text') as HTMLSpanElement;

    this.bindEvents();
    this.updateInkIndicator();
  }

  private bindEvents(): void {
    this.shadeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color!;
        this.setActiveShade(btn);
        this.setActivePigment(null);
        this.callbacks.onColorChange(color);
        this.brush.setColor(color);
      });
    });

    this.pigmentBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color!;
        const isReset = btn.dataset.reset === 'true';
        if (isReset) {
          this.setActivePigment(btn);
          const activeShade = document.querySelector('#ink-shades .shade-btn.active') as HTMLButtonElement;
          const shadeColor = activeShade?.dataset.color || '#0A0A0A';
          this.callbacks.onColorChange(shadeColor);
          this.brush.setColor(shadeColor);
        } else {
          this.setActivePigment(btn);
          this.clearActiveShade();
          this.callbacks.onColorChange(color);
          this.brush.setColor(color);
        }
      });
    });

    this.sizeSlider.addEventListener('input', () => {
      const size = parseInt(this.sizeSlider.value, 10);
      this.sizeValue.textContent = `${size}px`;
      this.callbacks.onSizeChange(size);
      this.brush.setBaseSize(size);
    });

    this.clearBtn.addEventListener('click', async () => {
      await this.callbacks.onClear();
    });
  }

  private setActiveShade(activeBtn: HTMLButtonElement): void {
    this.shadeBtns.forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  private clearActiveShade(): void {
    this.shadeBtns.forEach(btn => btn.classList.remove('active'));
  }

  private setActivePigment(activeBtn: HTMLButtonElement | null): void {
    this.pigmentBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.reset === 'true') {
        btn.classList.remove('active-reset');
        btn.classList.add('active-reset');
      }
    });
    if (activeBtn) {
      if (activeBtn.dataset.reset === 'true') {
        activeBtn.classList.add('active-reset');
      } else {
        activeBtn.classList.add('active');
      }
    }
  }

  public consumeInk(): void {
    if (this.inkLevel > 0) {
      this.inkLevel = Math.max(0, this.inkLevel - 5);
      this.isRecovering = false;
      this.flashed = false;
      this.updateInkIndicator();
    }
  }

  public updateInk(now: number): void {
    if (!this.isRecovering && this.inkLevel < 100) {
      this.isRecovering = true;
      this.lastRecoverTime = now;
    }
    if (this.isRecovering && this.inkLevel < 100) {
      const elapsed = now - this.lastRecoverTime;
      if (elapsed >= 1000 / 3) {
        const ticks = Math.floor(elapsed / (1000 / 3));
        this.inkLevel = Math.min(100, this.inkLevel + ticks);
        this.lastRecoverTime = now;
        this.updateInkIndicator();
        if (this.inkLevel >= 100 && !this.flashed) {
          this.flashed = true;
          this.triggerFlash();
        }
      }
    }
  }

  private triggerFlash(): void {
    this.inkProgress.classList.remove('flash');
    void this.inkProgress.offsetWidth;
    this.inkProgress.classList.add('flash');
  }

  private updateInkIndicator(): void {
    const offset = this.INK_CIRCUMFERENCE * (1 - this.inkLevel / 100);
    this.inkProgress.style.strokeDashoffset = offset.toString();
    this.inkProgress.style.stroke = this.brush.getColor();
    this.inkText.textContent = `${Math.round(this.inkLevel)}%`;
  }

  public getInkLevel(): number {
    return this.inkLevel;
  }
}
