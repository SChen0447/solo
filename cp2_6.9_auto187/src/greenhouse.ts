import type { AppState, PlacedPlant, Particle, GreenhouseCell, Plant, LightLevel, HumidityLevel } from './types';
import type { AppStateManager } from './state';
import { drawPlantThumbnail, drawPlantGreenhouse } from './drawing';

const MAX_PLANTS = 20;
const GROWTH_INTERVAL_MS = 2000;
const GROWTH_AMOUNT = 1;
const MAX_SIZE = 25;
const MIN_SIZE = 8;
const PARTICLE_LIFE = 500;

class Greenhouse {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private favoritesList: HTMLElement;
  private state: AppStateManager;
  private onPlantSelect: (plantId: string) => void;

  private cells: GreenhouseCell[] = [];
  private placedPlants: Map<string, PlacedPlant> = new Map();
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;
  private lastGrowthTime = 0;
  private draggedPlantId: string | null = null;
  private dragGhost: HTMLElement | null = null;
  private hoverCellIndex: number = -1;
  private currentFavoriteIds: Set<string> = new Set();

  constructor(
    canvasId: string,
    favoritesListId: string,
    state: AppStateManager,
    onPlantSelect: (plantId: string) => void
  ) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    const favoritesList = document.getElementById(favoritesListId);
    if (!canvas || !favoritesList) {
      throw new Error('Greenhouse DOM elements not found');
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.favoritesList = favoritesList;
    this.state = state;
    this.onPlantSelect = onPlantSelect;

    this.initCells();
    this.bindCanvasEvents();
    this.startLoop();
  }

  private initCells(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cellW = w / 2;
    const cellH = h / 2;

    this.cells = [
      { light: 'strong' as LightLevel, humidity: 'wet' as HumidityLevel, x: 0, y: 0, width: cellW, height: cellH },
      { light: 'strong' as LightLevel, humidity: 'dry' as HumidityLevel, x: cellW, y: 0, width: cellW, height: cellH },
      { light: 'weak' as LightLevel, humidity: 'wet' as HumidityLevel, x: 0, y: cellH, width: cellW, height: cellH },
      { light: 'weak' as LightLevel, humidity: 'dry' as HumidityLevel, x: cellW, y: cellH, width: cellW, height: cellH }
    ];
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.hoverCellIndex = this.getCellAt(x, y);
    });

    this.canvas.addEventListener('dragleave', () => {
      this.hoverCellIndex = -1;
    });

    this.canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const plantId = e.dataTransfer?.getData('text/plain');
      if (!plantId) return;

      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      const cellIndex = this.getCellAt(x, y);

      if (cellIndex >= 0 && this.placedPlants.size < MAX_PLANTS) {
        this.placePlant(plantId, cellIndex, x, y);
      }

      this.hoverCellIndex = -1;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      for (const [id, placed] of this.placedPlants) {
        const dx = x - placed.x;
        const dy = y - placed.y;
        if (dx * dx + dy * dy <= placed.size * placed.size) {
          this.removePlant(id);
          break;
        }
      }
    });
  }

  private getCellAt(x: number, y: number): number {
    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      if (x >= c.x && x < c.x + c.width && y >= c.y && y < c.y + c.height) {
        return i;
      }
    }
    return -1;
  }

  private placePlant(plantId: string, cellIndex: number, x: number, y: number): void {
    if (this.placedPlants.has(plantId)) return;

    const cell = this.cells[cellIndex];
    const clampedX = Math.max(cell.x + MAX_SIZE, Math.min(cell.x + cell.width - MAX_SIZE, x));
    const clampedY = Math.max(cell.y + MAX_SIZE, Math.min(cell.y + cell.height - MAX_SIZE, y));

    this.placedPlants.set(plantId, {
      plantId,
      cellIndex,
      x: clampedX,
      y: clampedY,
      size: MIN_SIZE,
      saturation: 0,
      growing: true
    });
  }

  private removePlant(plantId: string): void {
    const placed = this.placedPlants.get(plantId);
    if (!placed) return;
    placed.growing = false;

    const shrink = () => {
      const p = this.placedPlants.get(plantId);
      if (!p) return;
      p.size -= 0.5;
      if (p.size <= 0) {
        this.placedPlants.delete(plantId);
      } else {
        requestAnimationFrame(shrink);
      }
    };
    shrink();
  }

  private startLoop(): void {
    this.lastGrowthTime = performance.now();
    const loop = (now: number) => {
      this.update(now);
      this.renderCanvas();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private update(now: number): void {
    const elapsed = now - this.lastGrowthTime;
    if (elapsed >= GROWTH_INTERVAL_MS) {
      this.lastGrowthTime = now;
      for (const placed of this.placedPlants.values()) {
        if (placed.growing && placed.size < MAX_SIZE) {
          const cell = this.cells[placed.cellIndex];
          const plant = this.getPlantById(placed.plantId);
          if (!plant) continue;

          let speedMultiplier = 1;
          if (plant.lightRequirement === cell.light) {
            speedMultiplier *= 1.5;
          } else if (plant.lightRequirement === 'medium') {
            speedMultiplier *= 1;
          } else {
            speedMultiplier *= 0.5;
          }

          if (plant.waterRequirement === cell.humidity) {
            speedMultiplier *= 1.5;
          } else if (plant.waterRequirement === 'medium') {
            speedMultiplier *= 1;
          } else {
            speedMultiplier *= 0.5;
          }

          placed.size = Math.min(MAX_SIZE, placed.size + GROWTH_AMOUNT * speedMultiplier);
          placed.saturation = Math.min(0.6, placed.saturation + 0.03 * speedMultiplier);

          if (placed.growing && Math.random() < 0.4) {
            this.spawnParticles(placed.x, placed.y, 3);
          }
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += 16;
      const t = p.life / p.maxLife;
      p.radius += 0.15;
      p.opacity = 1 - t;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnParticles(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.5;
      this.particles.push({
        x: x + Math.cos(angle) * 2,
        y: y + Math.sin(angle) * 2,
        radius: 1.5 + Math.random() * 1.5,
        opacity: 1,
        life: 0,
        maxLife: PARTICLE_LIFE
      });
    }
  }

  private getPlantById(id: string): Plant | undefined {
    return this.state.getState().plants.find(p => p.id === id);
  }

  private renderCanvas(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const isHover = this.hoverCellIndex === i;
      this.drawCellBackground(ctx, cell, isHover);
    }

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    this.drawCellLabels(ctx);

    for (const placed of this.placedPlants.values()) {
      const plant = this.getPlantById(placed.plantId);
      if (plant) {
        drawPlantGreenhouse(ctx, plant, placed.x, placed.y, placed.size, placed.saturation);
      }
    }

    for (const p of this.particles) {
      ctx.fillStyle = `rgba(76, 175, 80, ${p.opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCellBackground(ctx: CanvasRenderingContext2D, cell: GreenhouseCell, isHover: boolean): void {
    let gradient: CanvasGradient;

    if (cell.light === 'strong' && cell.humidity === 'wet') {
      gradient = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.width, cell.y + cell.height);
      gradient.addColorStop(0, 'rgba(255, 235, 59, 0.35)');
      gradient.addColorStop(1, 'rgba(100, 181, 246, 0.3)');
    } else if (cell.light === 'strong' && cell.humidity === 'dry') {
      gradient = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.width, cell.y + cell.height);
      gradient.addColorStop(0, 'rgba(255, 193, 7, 0.35)');
      gradient.addColorStop(1, 'rgba(255, 152, 0, 0.3)');
    } else if (cell.light === 'weak' && cell.humidity === 'wet') {
      gradient = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.width, cell.y + cell.height);
      gradient.addColorStop(0, 'rgba(100, 181, 246, 0.3)');
      gradient.addColorStop(1, 'rgba(40, 53, 147, 0.35)');
    } else {
      gradient = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.width, cell.y + cell.height);
      gradient.addColorStop(0, 'rgba(158, 158, 158, 0.25)');
      gradient.addColorStop(1, 'rgba(96, 125, 139, 0.3)');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

    if (isHover) {
      ctx.strokeStyle = 'rgba(46, 125, 50, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cell.x + 1, cell.y + 1, cell.width - 2, cell.height - 2);
    }
  }

  private drawCellLabels(ctx: CanvasRenderingContext2D): void {
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.textAlign = 'center';

    const labels = [
      '强光 / 湿润',
      '强光 / 干燥',
      '弱光 / 湿润',
      '弱光 / 干燥'
    ];

    for (let i = 0; i < this.cells.length; i++) {
      const c = this.cells[i];
      ctx.fillText(labels[i], c.x + c.width / 2, c.y + 14);
    }
  }

  render(state: AppState): void {
    this.renderFavorites();
  }

  private renderFavorites(): void {
    const favorites = this.state.getFavoritePlants();
    const newIds = new Set(favorites.map(p => p.id));
    let changed = newIds.size !== this.currentFavoriteIds.size;
    if (!changed) {
      for (const id of newIds) {
        if (!this.currentFavoriteIds.has(id)) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;

    const removedIds: string[] = [];
    for (const id of this.currentFavoriteIds) {
      if (!newIds.has(id)) {
        removedIds.push(id);
      }
    }

    this.currentFavoriteIds = newIds;

    for (const id of removedIds) {
      const existingEl = this.favoritesList.querySelector(`[data-plant-id="${id}"]`);
      if (existingEl) {
        existingEl.classList.add('fading-out');
        setTimeout(() => existingEl.remove(), 300);
      }
      this.placedPlants.delete(id);
    }

    for (const plant of favorites) {
      if (this.favoritesList.querySelector(`[data-plant-id="${plant.id}"]`)) continue;

      const card = this.createFavoriteCard(plant);
      this.favoritesList.appendChild(card);
    }
  }

  private createFavoriteCard(plant: Plant): HTMLElement {
    const card = document.createElement('div');
    card.className = 'favorite-card';
    card.draggable = true;
    card.dataset.plantId = plant.id;

    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 55;
    canvas.className = 'favorite-canvas';

    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawPlantThumbnail(ctx, plant, 0, 0, 50, 55);
    }

    const name = document.createElement('div');
    name.className = 'favorite-name';
    name.textContent = plant.name;

    card.appendChild(canvas);
    card.appendChild(name);

    card.addEventListener('click', () => {
      this.onPlantSelect(plant.id);
    });

    card.addEventListener('dragstart', (e) => {
      this.draggedPlantId = plant.id;
      card.style.opacity = '0.5';
      card.style.transform = 'scale(1.05)';
      e.dataTransfer?.setData('text/plain', plant.id);
      e.dataTransfer!.effectAllowed = 'copy';

      if (e.dataTransfer && canvas) {
        try {
          e.dataTransfer.setDragImage(canvas, 25, 27);
        } catch (_) {
        }
      }
    });

    card.addEventListener('dragend', () => {
      this.draggedPlantId = null;
      card.style.opacity = '1';
      setTimeout(() => {
        card.style.transform = '';
      }, 150);
    });

    return card;
  }
}

export { Greenhouse };
