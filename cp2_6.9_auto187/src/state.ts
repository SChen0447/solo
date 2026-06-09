import type { AppState, Plant, StateListener } from './types';

class AppStateManager {
  private state: AppState;
  private listeners: Set<StateListener> = new Set();

  constructor(initialPlants: Plant[]) {
    this.state = {
      plants: initialPlants,
      selectedPlantId: initialPlants.length > 0 ? initialPlants[0].id : null,
      favoriteIds: new Set(),
      searchQuery: ''
    };
  }

  getState(): AppState {
    return this.state;
  }

  getSelectedPlant(): Plant | null {
    return this.state.plants.find(p => p.id === this.state.selectedPlantId) || null;
  }

  getFavoritePlants(): Plant[] {
    return this.state.plants.filter(p => this.state.favoriteIds.has(p.id));
  }

  getFilteredPlants(): Plant[] {
    const query = this.state.searchQuery.trim().toLowerCase();
    if (!query) return this.state.plants;

    const exactMatches: Plant[] = [];
    const partialMatches: Plant[] = [];

    for (const plant of this.state.plants) {
      const name = plant.name.toLowerCase();
      const sciName = plant.scientificName.toLowerCase();
      if (name === query || sciName === query) {
        exactMatches.push(plant);
      } else if (name.includes(query) || sciName.includes(query)) {
        partialMatches.push(plant);
      }
    }

    return [...exactMatches, ...partialMatches];
  }

  selectPlant(id: string): void {
    if (this.state.selectedPlantId !== id) {
      this.state.selectedPlantId = id;
      this.notify();
    }
  }

  toggleFavorite(id: string): void {
    if (this.state.favoriteIds.has(id)) {
      this.state.favoriteIds.delete(id);
    } else {
      this.state.favoriteIds.add(id);
    }
    this.notify();
  }

  isFavorite(id: string): boolean {
    return this.state.favoriteIds.has(id);
  }

  setSearchQuery(query: string): void {
    if (this.state.searchQuery !== query) {
      this.state.searchQuery = query;
      this.notify();
    }
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export { AppStateManager };
