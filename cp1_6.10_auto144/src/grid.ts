export const COLOR_PALETTE: readonly string[] = [
  '#ff2a2a',
  '#2aff2a',
  '#2a2aff',
  '#ffff2a',
  '#ff2aff',
  '#2affff',
  '#ff8c2a',
  '#8c2aff',
  '#2aff8c',
  '#ff2a8c',
  '#8cff2a',
  '#2a8cff'
];

export const GRID_SIZE = 6;
export const CELL_GAP = 4;
export const CELL_BORDER_RADIUS = 8;
export const GRID_CONTAINER_SIZE = 600;

export interface CellData {
  index: number;
  row: number;
  col: number;
  color: string;
  element: HTMLElement;
}

export interface GridConfig {
  minCells: number;
  maxCells: number;
  showDuration: number;
  soundEnabled: boolean;
}

export type GamePhase = 'idle' | 'showing' | 'playing' | 'finished';

export class MemoryGrid {
  private container: HTMLElement;
  private cells: CellData[] = [];
  private sequence: number[] = [];
  private currentStep: number = 0;
  private phase: GamePhase = 'idle';
  private config: GridConfig;
  private onComplete?: (correct: boolean, mistakes: number) => void;
  private mistakes: number = 0;
  private audioContext?: AudioContext;

  constructor(container: HTMLElement, config: GridConfig) {
    this.container = container;
    this.config = config;
    this.buildGrid();
  }

  private buildGrid(): void {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.width = `${GRID_CONTAINER_SIZE}px`;
    this.container.style.height = `${GRID_CONTAINER_SIZE}px`;
    this.container.style.backgroundColor = '#1e1e24';
    this.container.style.borderRadius = '12px';
    this.container.style.padding = `${CELL_GAP}px`;
    this.container.style.display = 'grid';
    this.container.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
    this.container.style.gridTemplateRows = `repeat(${GRID_SIZE}, 1fr)`;
    this.container.style.gap = `${CELL_GAP}px`;
    this.container.style.boxShadow = '0 0 40px #7c4dff40, 0 0 80px #7c4dff20';

    const totalCells = GRID_SIZE * GRID_SIZE;
    for (let i = 0; i < totalCells; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];

      const cell = document.createElement('div');
      cell.style.width = '100%';
      cell.style.height = '100%';
      cell.style.backgroundColor = '#2a2a33';
      cell.style.borderRadius = `${CELL_BORDER_RADIUS}px`;
      cell.style.cursor = 'pointer';
      cell.style.transition = 'transform 0.3s ease-out, background-color 0.15s ease, box-shadow 0.3s ease';
      cell.style.position = 'relative';
      cell.style.overflow = 'hidden';

      const inner = document.createElement('div');
      inner.style.position = 'absolute';
      inner.style.inset = '0';
      inner.style.backgroundColor = color;
      inner.style.opacity = '0';
      inner.style.borderRadius = `${CELL_BORDER_RADIUS}px`;
      inner.style.transition = 'opacity 0.15s ease';
      cell.appendChild(inner);

      cell.addEventListener('click', () => this.handleCellClick(i));

      this.container.appendChild(cell);
      this.cells.push({ index: i, row, col, color, element: cell });
    }
  }

  private playSound(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.config.soundEnabled) return;
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.frequency.value = frequency;
      osc.type = type;
      gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      osc.start();
      osc.stop(this.audioContext.currentTime + duration);
    } catch {
      // silently fail
    }
  }

  private handleCellClick(index: number): void {
    if (this.phase !== 'playing') return;

    const cell = this.cells[index];
    const expectedIndex = this.sequence[this.currentStep];

    if (index === expectedIndex) {
      this.playSound(880, 0.1, 'sine');
      this.flashCorrect(cell);
      this.currentStep++;
      if (this.currentStep >= this.sequence.length) {
        this.phase = 'finished';
        this.onComplete?.(true, this.mistakes);
      }
    } else {
      this.playSound(220, 0.2, 'square');
      this.mistakes++;
      this.shakeWrong(cell);
    }
  }

  private flashCorrect(cell: CellData): void {
    const inner = cell.element.firstElementChild as HTMLElement;
    inner.style.backgroundColor = '#00ff66';
    inner.style.opacity = '1';
    cell.element.style.transform = 'scale(1.08)';
    cell.element.style.boxShadow = '0 0 20px #00ff6680';

    setTimeout(() => {
      cell.element.style.transform = '';
      cell.element.style.boxShadow = '';
      inner.style.opacity = '0';
      inner.style.backgroundColor = cell.color;
    }, 200);
  }

  private shakeWrong(cell: CellData): void {
    const inner = cell.element.firstElementChild as HTMLElement;
    inner.style.backgroundColor = '#ff4444';
    inner.style.opacity = '1';

    cell.element.style.animation = 'none';
    cell.element.offsetHeight;
    cell.element.style.animation = 'shake 0.3s ease';

    setTimeout(() => {
      cell.element.style.animation = '';
      inner.style.opacity = '0';
      inner.style.backgroundColor = cell.color;
    }, 300);
  }

  public startRound(): void {
    this.resetAll();
    this.phase = 'showing';
    this.generateSequence();
    this.showSequence();
  }

  private resetAll(): void {
    this.currentStep = 0;
    this.mistakes = 0;
    this.sequence = [];
    this.cells.forEach(cell => {
      const inner = cell.element.firstElementChild as HTMLElement;
      inner.style.opacity = '0';
      cell.element.style.transform = '';
      cell.element.style.boxShadow = '';
      cell.element.style.animation = '';
    });
  }

  private generateSequence(): void {
    const count = Math.floor(Math.random() * (this.config.maxCells - this.config.minCells + 1)) + this.config.minCells;
    const available = this.cells.map(c => c.index);
    for (let i = 0; i < count && available.length > 0; i++) {
      const randIdx = Math.floor(Math.random() * available.length);
      this.sequence.push(available[randIdx]);
      available.splice(randIdx, 1);
    }
  }

  private showSequence(): Promise<void> {
    return new Promise((resolve) => {
      let idx = 0;
      const showNext = () => {
        if (idx >= this.sequence.length) {
          this.hideAll();
          setTimeout(() => {
            this.phase = 'playing';
            resolve();
          }, 400);
          return;
        }
        const cell = this.cells[this.sequence[idx]];
        this.lightUpCell(cell);
        setTimeout(() => {
          this.dimCell(cell);
          idx++;
          setTimeout(showNext, 150);
        }, this.config.showDuration * 1000);
      };
      showNext();
    });
  }

  private lightUpCell(cell: CellData): void {
    const inner = cell.element.firstElementChild as HTMLElement;
    inner.style.opacity = '1';
    cell.element.style.transform = 'scale(1.1)';
    cell.element.style.boxShadow = `0 0 30px ${cell.color}80, 0 0 60px ${cell.color}40`;
  }

  private dimCell(cell: CellData): void {
    const inner = cell.element.firstElementChild as HTMLElement;
    inner.style.opacity = '0';
    cell.element.style.transform = '';
    cell.element.style.boxShadow = '';
  }

  private hideAll(): void {
    this.cells.forEach(cell => {
      const inner = cell.element.firstElementChild as HTMLElement;
      inner.style.opacity = '0';
      cell.element.style.transform = '';
      cell.element.style.boxShadow = '';
    });
  }

  public setOnComplete(callback: (correct: boolean, mistakes: number) => void): void {
    this.onComplete = callback;
  }

  public updateConfig(config: GridConfig): void {
    this.config = config;
  }

  public getPhase(): GamePhase {
    return this.phase;
  }

  public getSequenceLength(): number {
    return this.sequence.length;
  }

  public destroy(): void {
    this.cells.forEach(c => c.element.remove());
    this.cells = [];
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
    }
  }
}

const style = document.createElement('style');
style.textContent = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
`;
document.head.appendChild(style);
