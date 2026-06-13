import { BrushMode, PAINT_COLORS, PaintColor } from './sharedTypes.js';
import { PaintEngine } from './paintEngine.js';

export class UIController {
  private engine: PaintEngine;
  private canvasWrapper: HTMLElement;
  private humiditySlider: HTMLInputElement;
  private humidityLabel: HTMLElement;
  private watercolorBtn: HTMLButtonElement;
  private oilBtn: HTMLButtonElement;
  private paintTubeBtn: HTMLElement;
  private palette: HTMLElement;
  private resetBtn: HTMLButtonElement;

  private isPaletteOpen = false;
  private selectedColorIndex: number | null = null;
  private lastHumidityValue = 50;

  constructor(engine: PaintEngine) {
    this.engine = engine;

    this.canvasWrapper = document.getElementById('canvasWrapper')!;
    this.humiditySlider = document.getElementById('humiditySlider') as HTMLInputElement;
    this.humidityLabel = document.getElementById('humidityLabel')!;
    this.watercolorBtn = document.getElementById('watercolorBtn') as HTMLButtonElement;
    this.oilBtn = document.getElementById('oilBtn') as HTMLButtonElement;
    this.paintTubeBtn = document.getElementById('paintTubeBtn')!;
    this.palette = document.getElementById('palette')!;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

    this.buildPalette();
    this.bindUIEvents();
    this.updateHumidityLabel(this.lastHumidityValue);
  }

  private buildPalette(): void {
    this.palette.innerHTML = '';
    PAINT_COLORS.forEach((color, index) => {
      const chip = document.createElement('div');
      chip.className = 'color-chip';
      chip.title = color.name;
      chip.style.backgroundColor = color.hex;
      chip.style.color = color.hex;
      chip.dataset.index = String(index);
      chip.addEventListener('click', () => this.onColorSelect(index));
      this.palette.appendChild(chip);
    });
  }

  private bindUIEvents(): void {
    this.humiditySlider.addEventListener('input', () => {
      const value = parseInt(this.humiditySlider.value, 10);
      this.onHumidityChange(value);
    });

    this.humiditySlider.addEventListener('mousedown', () => {
      this.humidityLabel.classList.add('visible');
    });

    this.watercolorBtn.addEventListener('click', () => this.onBrushModeChange(BrushMode.WATERCOLOR));
    this.oilBtn.addEventListener('click', () => this.onBrushModeChange(BrushMode.OIL));

    this.paintTubeBtn.addEventListener('mousedown', () => {
      this.paintTubeBtn.classList.add('pressed');
    });
    this.paintTubeBtn.addEventListener('mouseup', () => {
      this.paintTubeBtn.classList.remove('pressed');
      this.togglePalette();
    });
    this.paintTubeBtn.addEventListener('mouseleave', () => {
      this.paintTubeBtn.classList.remove('pressed');
    });

    this.resetBtn.addEventListener('click', () => this.onReset());

    document.addEventListener('click', (e) => {
      if (this.isPaletteOpen) {
        const target = e.target as Node;
        if (
          !this.palette.contains(target) &&
          !this.paintTubeBtn.contains(target)
        ) {
          this.closePalette();
        }
      }
    });
  }

  private onHumidityChange(value: number): void {
    if (value !== this.lastHumidityValue) {
      this.lastHumidityValue = value;
      this.engine.setHumidity(value);
      this.updateHumidityLabel(value);
    }
  }

  private updateHumidityLabel(value: number): void {
    const text = `${value}%`;
    this.humidityLabel.style.opacity = '0';
    setTimeout(() => {
      this.humidityLabel.textContent = text;
      this.humidityLabel.style.opacity = '1';
    }, 100);
  }

  private onBrushModeChange(mode: BrushMode): void {
    if (this.engine.getBrushMode() === mode) return;

    this.engine.setBrushMode(mode);
    this.canvasWrapper.classList.add('flash');
    setTimeout(() => {
      this.canvasWrapper.classList.remove('flash');
    }, 400);

    if (mode === BrushMode.WATERCOLOR) {
      this.watercolorBtn.classList.add('active');
      this.oilBtn.classList.remove('active');
    } else {
      this.oilBtn.classList.add('active');
      this.watercolorBtn.classList.remove('active');
    }

    if (this.selectedColorIndex !== null) {
      this.engine.setCurrentColor(PAINT_COLORS[this.selectedColorIndex].rgb);
    }
  }

  private togglePalette(): void {
    if (this.isPaletteOpen) {
      this.closePalette();
    } else {
      this.openPalette();
    }
  }

  private openPalette(): void {
    this.isPaletteOpen = true;
    this.palette.classList.add('open');
  }

  private closePalette(): void {
    this.isPaletteOpen = false;
    this.palette.classList.remove('open');
  }

  private onColorSelect(index: number): void {
    const chips = this.palette.querySelectorAll('.color-chip');
    if (this.selectedColorIndex !== null) {
      const prevChip = chips[this.selectedColorIndex];
      if (prevChip) prevChip.classList.remove('selected');
    }

    chips[index].classList.add('selected');
    this.selectedColorIndex = index;
    const color: PaintColor = PAINT_COLORS[index];
    this.engine.setCurrentColor(color.rgb);
  }

  private onReset(): void {
    this.engine.resetCanvas();
    if (this.selectedColorIndex !== null) {
      const chips = this.palette.querySelectorAll('.color-chip');
      chips[this.selectedColorIndex]?.classList.remove('selected');
      this.selectedColorIndex = null;
      this.engine.setCurrentColor(null);
    }
  }

  getSelectedColor(): { r: number; g: number; b: number } | null {
    if (this.selectedColorIndex === null) return null;
    return PAINT_COLORS[this.selectedColorIndex].rgb;
  }

  getSelectedColorName(): string | null {
    if (this.selectedColorIndex === null) return null;
    return PAINT_COLORS[this.selectedColorIndex].name;
  }
}
