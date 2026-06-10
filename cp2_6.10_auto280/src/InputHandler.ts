import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, GridPos, TowerType } from './types';

export type InputEvent =
  | { type: 'canvasClick'; pos: GridPos }
  | { type: 'canvasHover'; pos: GridPos | null }
  | { type: 'selectTower'; towerType: TowerType | null }
  | { type: 'startWave' }
  | { type: 'regenerateMap'; seed: string | undefined }
  | { type: 'upgradeTower' }
  | { type: 'sellTower' }
  | { type: 'escape' };

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private listeners: ((event: InputEvent) => void)[] = [];
  private isDraggingTower: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindCanvasEvents();
    this.bindUIEvents();
    this.bindKeyboardEvents();
  }

  public onEvent(callback: (event: InputEvent) => void): void {
    this.listeners.push(callback);
  }

  private emit(event: InputEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private getCanvasPos(e: MouseEvent): GridPos | null {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (col < 0 || col >= MAP_WIDTH || row < 0 || row >= MAP_HEIGHT) return null;
    return { col, row };
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this.getCanvasPos(e);
      this.emit({ type: 'canvasHover', pos });
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.emit({ type: 'canvasHover', pos: null });
    });

    this.canvas.addEventListener('click', (e) => {
      const pos = this.getCanvasPos(e);
      if (pos) {
        this.emit({ type: 'canvasClick', pos });
      }
    });
  }

  private bindUIEvents(): void {
    const towerBtns = document.querySelectorAll('.tower-btn');
    towerBtns.forEach((btn) => {
      const towerType = (btn as HTMLElement).dataset.tower as TowerType;

      btn.addEventListener('click', () => {
        this.setSelectedTowerButton(towerType);
        this.emit({ type: 'selectTower', towerType });
      });

      btn.addEventListener('dragstart', (e) => {
        e.preventDefault();
        this.isDraggingTower = true;
        this.setSelectedTowerButton(towerType);
        this.emit({ type: 'selectTower', towerType });
      });
    });

    const waveBtn = document.getElementById('waveBtn');
    if (waveBtn) {
      waveBtn.addEventListener('click', () => {
        this.emit({ type: 'startWave' });
      });
    }

    const regenBtn = document.getElementById('regenBtn');
    const seedInput = document.getElementById('seedInput') as HTMLInputElement | null;
    if (regenBtn) {
      regenBtn.addEventListener('click', () => {
        const seed = seedInput?.value;
        this.emit({ type: 'regenerateMap', seed: seed && seed.trim() !== '' ? seed : undefined });
      });
    }

    const upgradeBtn = document.getElementById('upgradeBtn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        this.emit({ type: 'upgradeTower' });
      });
    }

    const sellBtn = document.getElementById('sellBtn');
    if (sellBtn) {
      sellBtn.addEventListener('click', () => {
        this.emit({ type: 'sellTower' });
      });
    }
  }

  public setSelectedTowerButton(towerType: TowerType | null): void {
    const towerBtns = document.querySelectorAll('.tower-btn');
    towerBtns.forEach((btn) => {
      const btnType = (btn as HTMLElement).dataset.tower as TowerType;
      if (towerType && btnType === towerType) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  private bindKeyboardEvents(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.setSelectedTowerButton(null);
        this.emit({ type: 'selectTower', towerType: null });
        this.emit({ type: 'escape' });
      }
      if (e.key === '1') {
        this.setSelectedTowerButton(TowerType.ARROW);
        this.emit({ type: 'selectTower', towerType: TowerType.ARROW });
      }
      if (e.key === '2') {
        this.setSelectedTowerButton(TowerType.CANNON);
        this.emit({ type: 'selectTower', towerType: TowerType.CANNON });
      }
      if (e.key === '3') {
        this.setSelectedTowerButton(TowerType.MAGIC);
        this.emit({ type: 'selectTower', towerType: TowerType.MAGIC });
      }
      if (e.key === '4') {
        this.setSelectedTowerButton(TowerType.SLOW);
        this.emit({ type: 'selectTower', towerType: TowerType.SLOW });
      }
      if (e.key === ' ') {
        e.preventDefault();
        this.emit({ type: 'startWave' });
      }
    });
  }
}
