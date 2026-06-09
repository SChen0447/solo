import type { AppState } from './types';
import type { AppStateManager } from './state';
import { drawPlantLarge } from './drawing';

class PlantView {
  private container: HTMLElement;
  private state: AppStateManager;
  private onFavoriteToggle: (plantId: string) => void;

  constructor(
    containerId: string,
    state: AppStateManager,
    onFavoriteToggle: (plantId: string) => void
  ) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error('PlantView container not found');
    }
    this.container = container;
    this.state = state;
    this.onFavoriteToggle = onFavoriteToggle;
  }

  render(state: AppState): void {
    const plant = this.state.getSelectedPlant();
    if (!plant) {
      this.container.innerHTML = '<div class="no-selection">请选择一种植物</div>';
      return;
    }

    const isFavorite = this.state.isFavorite(plant.id);
    const lightLabels: Record<string, string> = {
      strong: '强光照',
      medium: '中光照',
      weak: '弱光照'
    };
    const waterLabels: Record<string, string> = {
      dry: '少浇水',
      medium: '适量浇水',
      wet: '多浇水'
    };

    this.container.innerHTML = `
      <div class="plant-detail">
        <canvas id="plantLargeCanvas" width="400" height="300"></canvas>
        <div class="plant-info">
          <h2 class="plant-name">${this.escapeHtml(plant.name)}</h2>
          <p class="plant-family">${this.escapeHtml(plant.family)} · ${this.escapeHtml(plant.genus)} · <em>${this.escapeHtml(plant.scientificName)}</em></p>
        </div>
        <div class="plant-habits">
          <div class="habit-item">
            <span class="habit-icon" aria-hidden="true">☀️</span>
            <span class="habit-label">光照需求：${lightLabels[plant.lightRequirement]}</span>
          </div>
          <div class="habit-item">
            <span class="habit-icon" aria-hidden="true">💧</span>
            <span class="habit-label">水分需求：${waterLabels[plant.waterRequirement]}</span>
          </div>
          <div class="habit-item">
            <span class="habit-icon" aria-hidden="true">🌡️</span>
            <span class="habit-label">温度范围：${plant.temperatureRange}</span>
          </div>
          <div class="habit-desc">
            <span class="habit-icon" aria-hidden="true">📝</span>
            <span>${this.escapeHtml(plant.description)}</span>
          </div>
        </div>
        <button class="favorite-btn ${isFavorite ? 'active' : ''}" id="favoriteBtn" type="button" aria-label="${isFavorite ? '取消收藏' : '收藏'}">
          <span class="star-icon" aria-hidden="true">${isFavorite ? '★' : '☆'}</span>
        </button>
      </div>
    `;

    const canvas = document.getElementById('plantLargeCanvas') as HTMLCanvasElement | null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 400, 300);
        drawPlantLarge(ctx, plant, 0, 0, 400, 300);
      }
    }

    const favBtn = document.getElementById('favoriteBtn');
    if (favBtn) {
      favBtn.addEventListener('click', (e) => {
        this.onFavoriteToggle(plant.id);
        this.createRipple(e as MouseEvent, favBtn);
      });
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private createRipple(e: MouseEvent, element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 200);
  }
}

export { PlantView };
