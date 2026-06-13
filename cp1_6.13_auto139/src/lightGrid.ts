import { audioManager } from './audioManager';

interface LightDot {
  element: HTMLElement;
  row: number;
  col: number;
  isActive: boolean;
  isWave: boolean;
  isFading: boolean;
  fadeTimeoutId: number | null;
  waveTimeoutId: number | null;
}

export class LightGrid {
  private container: HTMLElement;
  private gridElement: HTMLElement;
  private dots: LightDot[][] = [];
  private readonly rows: number = 20;
  private readonly cols: number = 20;
  private readonly waveDelay: number = 50;
  private readonly fadeDelay: number = 500;

  private rhythmMode: boolean = false;
  private rhythmFrequency: number = 1.5;
  private rhythmAnimationId: number | null = null;
  private rhythmStartTime: number = 0;

  private lastMousePos: { row: number; col: number } | null = null;
  private isMouseDown: boolean = false;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.gridElement = document.createElement('div');
    this.gridElement.className = 'light-grid';
    this.container.appendChild(this.gridElement);
    this.createGrid();
    this.bindEvents();
  }

  private createGrid(): void {
    for (let row = 0; row < this.rows; row++) {
      this.dots[row] = [];
      for (let col = 0; col < this.cols; col++) {
        const dotElement = document.createElement('div');
        dotElement.className = 'light-dot';
        dotElement.dataset.row = String(row);
        dotElement.dataset.col = String(col);

        const dot: LightDot = {
          element: dotElement,
          row,
          col,
          isActive: false,
          isWave: false,
          isFading: false,
          fadeTimeoutId: null,
          waveTimeoutId: null,
        };

        this.dots[row][col] = dot;
        this.gridElement.appendChild(dotElement);
      }
    }
  }

  private bindEvents(): void {
    this.gridElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.gridElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.gridElement.addEventListener('mouseleave', this.onMouseLeaveGrid.bind(this));

    this.gridElement.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('light-dot')) {
        const row = parseInt(target.dataset.row || '0', 10);
        const col = parseInt(target.dataset.col || '0', 10);
        this.onDotHover(row, col, e);
      }
    });

    this.gridElement.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('light-dot')) {
        const row = parseInt(target.dataset.row || '0', 10);
        const col = parseInt(target.dataset.col || '0', 10);
        this.onDotLeave(row, col);
      }
    });

    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isMouseDown = true;
    }
  }

  private onMouseUp(): void {
    this.isMouseDown = false;
  }

  private onMouseLeaveGrid(): void {
    this.lastMousePos = null;
    this.isMouseDown = false;
  }

  private onDotHover(row: number, col: number, e: MouseEvent): void {
    const dot = this.dots[row]?.[col];
    if (!dot) return;

    this.lastMousePos = { row, col };
    this.activateDot(row, col, true);
    this.triggerWaveEffect(row, col);
    this.scheduleFade(row, col);
  }

  private onDotLeave(row: number, col: number): void {
    const dot = this.dots[row]?.[col];
    if (!dot || this.rhythmMode) return;

    if (!dot.isWave) {
      this.deactivateDot(row, col);
    }
  }

  private activateDot(row: number, col: number, playSound: boolean = false): void {
    const dot = this.dots[row]?.[col];
    if (!dot) return;

    if (dot.fadeTimeoutId) {
      clearTimeout(dot.fadeTimeoutId);
      dot.fadeTimeoutId = null;
    }

    dot.isFading = false;
    dot.isActive = true;
    dot.element.classList.remove('fading', 'wave');
    dot.element.classList.add('active');

    if (playSound && !this.rhythmMode) {
      audioManager.playTone(row, col);
    }
  }

  private deactivateDot(row: number, col: number): void {
    const dot = this.dots[row]?.[col];
    if (!dot) return;

    dot.isActive = false;
    dot.isWave = false;
    dot.element.classList.remove('active', 'wave', 'fading');

    if (!this.rhythmMode) {
      audioManager.stopTone(row, col);
    }
  }

  private triggerWaveEffect(centerRow: number, centerCol: number): void {
    const maxDistance = Math.max(this.rows, this.cols);

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const distance = Math.sqrt(
          Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
        );
        const delay = distance * this.waveDelay;

        const dot = this.dots[row][col];

        if (dot.waveTimeoutId) {
          clearTimeout(dot.waveTimeoutId);
        }

        if (distance > 0) {
          dot.waveTimeoutId = window.setTimeout(() => {
            if (dot.isActive) return;
            this.setWaveState(row, col, true);
            this.scheduleWaveFade(row, col);
          }, delay);
        }
      }
    }
  }

  private setWaveState(row: number, col: number, state: boolean): void {
    const dot = this.dots[row]?.[col];
    if (!dot || dot.isActive) return;

    dot.isWave = state;
    if (state) {
      dot.element.classList.remove('fading');
      dot.element.classList.add('wave');
    } else {
      dot.element.classList.remove('wave');
    }
  }

  private scheduleWaveFade(row: number, col: number): void {
    const dot = this.dots[row]?.[col];
    if (!dot) return;

    if (dot.fadeTimeoutId) {
      clearTimeout(dot.fadeTimeoutId);
    }

    dot.fadeTimeoutId = window.setTimeout(() => {
      this.fadeDot(row, col);
    }, this.fadeDelay);
  }

  private scheduleFade(row: number, col: number): void {
    const dot = this.dots[row]?.[col];
    if (!dot) return;

    if (dot.fadeTimeoutId) {
      clearTimeout(dot.fadeTimeoutId);
    }

    dot.fadeTimeoutId = window.setTimeout(() => {
      if (dot.isActive && !this.isMouseDown) {
        this.fadeDot(row, col);
      }
    }, this.fadeDelay);
  }

  private fadeDot(row: number, col: number): void {
    const dot = this.dots[row]?.[col];
    if (!dot || this.rhythmMode) return;

    dot.isFading = true;
    dot.element.classList.remove('active', 'wave');
    dot.element.classList.add('fading');

    audioManager.stopTone(row, col);

    setTimeout(() => {
      if (dot.isFading) {
        dot.isFading = false;
        dot.isActive = false;
        dot.isWave = false;
        dot.element.classList.remove('fading');
      }
    }, 500);
  }

  public reset(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const dot = this.dots[row][col];

        if (dot.fadeTimeoutId) {
          clearTimeout(dot.fadeTimeoutId);
          dot.fadeTimeoutId = null;
        }
        if (dot.waveTimeoutId) {
          clearTimeout(dot.waveTimeoutId);
          dot.waveTimeoutId = null;
        }

        dot.isActive = false;
        dot.isWave = false;
        dot.isFading = false;
        dot.element.classList.remove('active', 'wave', 'fading');
      }
    }

    audioManager.stopAll();
    this.lastMousePos = null;
  }

  public setRhythmMode(enabled: boolean): void {
    this.rhythmMode = enabled;

    if (enabled) {
      this.reset();
      this.startRhythmAnimation();
    } else {
      this.stopRhythmAnimation();
      this.reset();
    }
  }

  public setRhythmFrequency(frequency: number): void {
    this.rhythmFrequency = Math.max(0.5, Math.min(3, frequency));
  }

  private startRhythmAnimation(): void {
    this.rhythmStartTime = performance.now();

    const animate = (time: number) => {
      if (!this.rhythmMode) return;

      const elapsed = (time - this.rhythmStartTime) / 1000;

      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const dot = this.dots[row][col];

          const distanceFromCenter = Math.sqrt(
            Math.pow(row - this.rows / 2, 2) + Math.pow(col - this.cols / 2, 2)
          );

          const phase = (elapsed * this.rhythmFrequency * Math.PI * 2) - (distanceFromCenter * 0.1);
          const sineValue = Math.sin(phase);
          const normalizedValue = (sineValue + 1) / 2;

          const threshold = 0.6;

          if (normalizedValue > threshold) {
            const intensity = (normalizedValue - threshold) / (1 - threshold);

            dot.isWave = true;
            dot.isFading = false;
            dot.element.classList.remove('fading', 'active');
            dot.element.classList.add('wave');

            dot.element.style.opacity = String(0.4 + intensity * 0.6);
            dot.element.style.boxShadow = `0 0 ${8 + intensity * 16}px #ccff00, 0 0 ${16 + intensity * 32}px rgba(204, 255, 0, ${0.3 + intensity * 0.5})`;
          } else {
            if (!dot.isFading) {
              dot.isWave = false;
              dot.element.classList.remove('wave');
              dot.element.style.opacity = '';
              dot.element.style.boxShadow = '';
            }
          }
        }
      }

      this.rhythmAnimationId = requestAnimationFrame(animate);
    };

    this.rhythmAnimationId = requestAnimationFrame(animate);
  }

  private stopRhythmAnimation(): void {
    if (this.rhythmAnimationId !== null) {
      cancelAnimationFrame(this.rhythmAnimationId);
      this.rhythmAnimationId = null;
    }

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const dot = this.dots[row][col];
        dot.element.style.opacity = '';
        dot.element.style.boxShadow = '';
      }
    }
  }

  public getGridElement(): HTMLElement {
    return this.gridElement;
  }

  public destroy(): void {
    this.stopRhythmAnimation();
    this.reset();
    if (this.gridElement.parentNode) {
      this.gridElement.parentNode.removeChild(this.gridElement);
    }
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
  }
}

export const lightGrid = new LightGrid('app');
