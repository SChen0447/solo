import type { Plant, AppState } from './types';
import type { AppStateManager } from './state';
import { drawPlantThumbnail } from './drawing';

class Gallery {
  private container: HTMLElement;
  private searchInput: HTMLInputElement;
  private noResults: HTMLElement;
  private state: AppStateManager;
  private onPlantSelect: (plantId: string) => void;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentRenderedIds: Set<string> = new Set();

  constructor(
    containerId: string,
    searchInputId: string,
    noResultsId: string,
    state: AppStateManager,
    onPlantSelect: (plantId: string) => void
  ) {
    const container = document.getElementById(containerId);
    const searchInput = document.getElementById(searchInputId) as HTMLInputElement;
    const noResults = document.getElementById(noResultsId);
    if (!container || !searchInput || !noResults) {
      throw new Error('Gallery DOM elements not found');
    }

    this.container = container;
    this.searchInput = searchInput;
    this.noResults = noResults;
    this.state = state;
    this.onPlantSelect = onPlantSelect;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;

      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      this.searchDebounceTimer = setTimeout(() => {
        this.state.setSearchQuery(value);
      }, 200);
    });
  }

  render(state: AppState): void {
    const plants = this.state.getFilteredPlants();

    if (plants.length === 0) {
      this.noResults.classList.remove('hidden');
    } else {
      this.noResults.classList.add('hidden');
    }

    const newIds = new Set(plants.map(p => p.id));
    let needsRerender = false;

    if (newIds.size !== this.currentRenderedIds.size) {
      needsRerender = true;
    } else {
      for (const id of newIds) {
        if (!this.currentRenderedIds.has(id)) {
          needsRerender = true;
          break;
        }
      }
    }

    if (!needsRerender) {
      return;
    }

    this.currentRenderedIds = newIds;

    this.container.style.opacity = '0';
    this.container.style.transition = 'opacity 0.15s ease';

    setTimeout(() => {
      this.container.innerHTML = '';

      for (const plant of plants) {
        const card = this.createCard(plant);
        this.container.appendChild(card);
      }

      requestAnimationFrame(() => {
        this.container.style.opacity = '1';
      });
    }, 150);
  }

  private createCard(plant: Plant): HTMLElement {
    const card = document.createElement('div');
    card.className = 'plant-card';
    card.dataset.plantId = plant.id;

    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 100;
    canvas.className = 'plant-card-canvas';

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F0F0F0';
      ctx.fillRect(0, 0, 120, 100);
      drawPlantThumbnail(ctx, plant, 0, 0, 120, 100);
    }

    const name = document.createElement('div');
    name.className = 'plant-card-name';
    name.textContent = plant.name;

    card.appendChild(canvas);
    card.appendChild(name);

    card.addEventListener('click', (e) => {
      this.onPlantSelect(plant.id);
      this.createRipple(e, card);
    });

    return card;
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

export { Gallery };
