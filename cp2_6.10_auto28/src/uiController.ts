import { ColorPalette, generatePalette, getPresetHues, generatePaletteId } from './colorGenerator';
import {
  applyGradient,
  createColorCardElement,
  createFavoriteThumbnail,
  generateLinearGradientCSS,
  GradientElements
} from './gradientApplier';

interface SavedPalette {
  id: string;
  name: string;
  colors: string[];
  savedAt: number;
}

interface HistoryState {
  palette: ColorPalette;
  timestamp: number;
}

const FAVORITES_KEY = 'ai_palette_favorites';
const HISTORY_KEY = 'ai_palette_history';
const MAX_FAVORITES = 20;
const MAX_HISTORY = 10;

export class UIController {
  private currentPalette: ColorPalette;
  private history: HistoryState[] = [];
  private currentHistoryIndex = -1;
  private isHistoryNavigation = false;
  private selectedColorIndex: number | null = null;

  private readonly elements: {
    promptInput: HTMLInputElement;
    generateBtn: HTMLButtonElement;
    previewArea: HTMLElement;
    cssCode: HTMLElement;
    copyBtn: HTMLButtonElement;
    copyFeedback: HTMLElement;
    paletteContainer: HTMLElement;
    favoriteBtn: HTMLButtonElement;
    colorPickerModal: HTMLElement;
    colorPickerGrid: HTMLElement;
    closePickerBtn: HTMLButtonElement;
    navTabs: NodeListOf<HTMLElement>;
    mainView: HTMLElement;
    favoritesView: HTMLElement;
    favoritesGrid: HTMLElement;
    favoritesCount: HTMLElement;
    emptyFavorites: HTMLElement;
    errorToast: HTMLElement;
  };

  constructor() {
    this.elements = {
      promptInput: document.getElementById('prompt-input') as HTMLInputElement,
      generateBtn: document.getElementById('generate-btn') as HTMLButtonElement,
      previewArea: document.getElementById('preview-area') as HTMLElement,
      cssCode: document.getElementById('css-code') as HTMLElement,
      copyBtn: document.getElementById('copy-btn') as HTMLButtonElement,
      copyFeedback: document.getElementById('copy-feedback') as HTMLElement,
      paletteContainer: document.getElementById('palette-container') as HTMLElement,
      favoriteBtn: document.getElementById('favorite-btn') as HTMLButtonElement,
      colorPickerModal: document.getElementById('color-picker-modal') as HTMLElement,
      colorPickerGrid: document.getElementById('color-picker-grid') as HTMLElement,
      closePickerBtn: document.getElementById('close-picker') as HTMLButtonElement,
      navTabs: document.querySelectorAll('.nav-tab'),
      mainView: document.getElementById('main-view') as HTMLElement,
      favoritesView: document.getElementById('favorites-view') as HTMLElement,
      favoritesGrid: document.getElementById('favorites-grid') as HTMLElement,
      favoritesCount: document.getElementById('favorites-count') as HTMLElement,
      emptyFavorites: document.getElementById('empty-favorites') as HTMLElement,
      errorToast: document.getElementById('error-toast') as HTMLElement
    };

    this.currentPalette = generatePalette('日落沙滩');
    this.currentPalette.id = generatePaletteId();

    this.validateElements();
    this.bindEvents();
    this.loadHistoryFromStorage();
    this.initializePresetHues();
  }

  private validateElements(): void {
    const missing: string[] = [];
    for (const [key, value] of Object.entries(this.elements)) {
      if (!value) {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Missing DOM elements: ${missing.join(', ')}`);
    }
  }

  private bindEvents(): void {
    this.elements.generateBtn.addEventListener('click', () => this.handleGenerate());
    this.elements.promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleGenerate();
      }
    });

    this.elements.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.elements.cssCode.addEventListener('click', () => this.copyToClipboard());

    this.elements.favoriteBtn.addEventListener('click', () => this.toggleFavorite());

    this.elements.paletteContainer.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest('.color-card');
      if (card) {
        const index = parseInt((card as HTMLElement).dataset.colorIndex || '0', 10);
        this.openColorPicker(index);
      }
    });

    this.elements.closePickerBtn.addEventListener('click', () => this.closeColorPicker());
    this.elements.colorPickerModal.addEventListener('click', (e) => {
      if (e.target === this.elements.colorPickerModal) {
        this.closeColorPicker();
      }
    });

    this.elements.colorPickerGrid.addEventListener('click', (e) => {
      const colorEl = (e.target as HTMLElement).closest('.picker-color');
      if (colorEl && this.selectedColorIndex !== null) {
        const newColor = (colorEl as HTMLElement).dataset.color || '';
        this.replaceColor(this.selectedColorIndex, newColor);
        this.closeColorPicker();
      }
    });

    this.elements.navTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const view = (tab as HTMLElement).dataset.view || 'main';
        this.switchView(view);
      });
    });

    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.palette) {
        this.isHistoryNavigation = true;
        this.applyPalette(e.state.palette as ColorPalette, false);
        this.isHistoryNavigation = false;
      }
    });
  }

  public initialize(): void {
    this.applyPalette(this.currentPalette, false);
    this.updateFavoritesUI();

    if (this.history.length === 0) {
      this.pushToHistory(this.currentPalette);
    } else {
      const lastState = this.history[this.history.length - 1];
      this.currentPalette = lastState.palette;
      this.currentHistoryIndex = this.history.length - 1;
      this.applyPalette(this.currentPalette, false);
    }
  }

  private handleGenerate(): void {
    const input = this.elements.promptInput.value.trim();

    try {
      const newPalette = generatePalette(input);
      newPalette.id = generatePaletteId();
      if (input) {
        newPalette.name = input;
      }
      this.applyPalette(newPalette, true);
    } catch (error) {
      this.showError('生成配色失败，请重试');
    }
  }

  private applyPalette(palette: ColorPalette, addToHistory: boolean): void {
    this.currentPalette = { ...palette, colors: [...palette.colors] };

    const gradientElements: GradientElements = {
      previewArea: this.elements.previewArea,
      cssCodeElement: this.elements.cssCode
    };
    applyGradient(this.currentPalette.colors, gradientElements, 45);

    this.renderColorCards();
    this.updateFavoriteButtonState();

    if (addToHistory && !this.isHistoryNavigation) {
      this.pushToHistory(this.currentPalette);
    }
  }

  private renderColorCards(): void {
    this.elements.paletteContainer.innerHTML = '';

    this.currentPalette.colors.forEach((color, index) => {
      const card = createColorCardElement(color, index);
      this.elements.paletteContainer.appendChild(card);
    });
  }

  private async copyToClipboard(): Promise<void> {
    const cssCode = generateLinearGradientCSS(this.currentPalette.colors, 45);

    try {
      await navigator.clipboard.writeText(cssCode);
      this.showCopyFeedback();
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = cssCode;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showCopyFeedback();
      } catch {
        this.showError('复制失败，请手动复制');
      }
    }
  }

  private showCopyFeedback(): void {
    this.elements.copyFeedback.classList.add('show');
    setTimeout(() => {
      this.elements.copyFeedback.classList.remove('show');
    }, 1000);
  }

  private openColorPicker(index: number): void {
    this.selectedColorIndex = index;
    this.elements.colorPickerModal.classList.remove('hidden');
  }

  private closeColorPicker(): void {
    this.selectedColorIndex = null;
    this.elements.colorPickerModal.classList.add('hidden');
  }

  private initializePresetHues(): void {
    const hues = getPresetHues();
    this.elements.colorPickerGrid.innerHTML = '';

    hues.forEach((color) => {
      const colorEl = document.createElement('div');
      colorEl.className = 'picker-color';
      colorEl.style.backgroundColor = color;
      colorEl.dataset.color = color;
      this.elements.colorPickerGrid.appendChild(colorEl);
    });
  }

  private replaceColor(index: number, newColor: string): void {
    if (index < 0 || index >= this.currentPalette.colors.length) return;

    const updatedColors = [...this.currentPalette.colors];
    updatedColors[index] = newColor;
    this.currentPalette = {
      ...this.currentPalette,
      id: generatePaletteId(),
      colors: updatedColors
    };

    const gradientElements: GradientElements = {
      previewArea: this.elements.previewArea,
      cssCodeElement: this.elements.cssCode
    };
    applyGradient(this.currentPalette.colors, gradientElements, 45);

    this.renderColorCards();
    this.updateFavoriteButtonState();
    this.pushToHistory(this.currentPalette);
  }

  private toggleFavorite(): void {
    const favorites = this.getFavorites();
    const existsIndex = favorites.findIndex((f) => this.colorsMatch(f.colors, this.currentPalette.colors));

    if (existsIndex >= 0) {
      favorites.splice(existsIndex, 1);
    } else {
      const savedPalette: SavedPalette = {
        id: this.currentPalette.id,
        name: this.currentPalette.name,
        colors: [...this.currentPalette.colors],
        savedAt: Date.now()
      };
      favorites.unshift(savedPalette);
      if (favorites.length > MAX_FAVORITES) {
        favorites.length = MAX_FAVORITES;
      }
    }

    this.saveFavorites(favorites);
    this.updateFavoriteButtonState();
    this.updateFavoritesUI();
  }

  private colorsMatch(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((color, i) => color.toLowerCase() === b[i].toLowerCase());
  }

  private getFavorites(): SavedPalette[] {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveFavorites(favorites: SavedPalette[]): void {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      this.showError('收藏失败，存储空间可能已满');
    }
  }

  private updateFavoriteButtonState(): void {
    const favorites = this.getFavorites();
    const isFavorited = favorites.some((f) => this.colorsMatch(f.colors, this.currentPalette.colors));

    if (isFavorited) {
      this.elements.favoriteBtn.classList.add('active');
    } else {
      this.elements.favoriteBtn.classList.remove('active');
    }
  }

  private updateFavoritesUI(): void {
    const favorites = this.getFavorites();
    this.elements.favoritesCount.textContent = String(favorites.length);

    if (favorites.length === 0) {
      this.elements.favoritesGrid.innerHTML = '';
      this.elements.emptyFavorites.classList.remove('hidden');
      return;
    }

    this.elements.emptyFavorites.classList.add('hidden');
    this.elements.favoritesGrid.innerHTML = '';

    favorites.forEach((saved) => {
      const item = createFavoriteThumbnail(saved.colors, saved.name);

      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.delete-favorite')) {
          this.deleteFavorite(saved.id);
          return;
        }
        const palette: ColorPalette = {
          id: saved.id,
          name: saved.name,
          colors: [...saved.colors],
          keywords: []
        };
        this.switchView('main');
        this.applyPalette(palette, true);
      });

      this.elements.favoritesGrid.appendChild(item);
    });
  }

  private deleteFavorite(id: string): void {
    const favorites = this.getFavorites();
    const filtered = favorites.filter((f) => f.id !== id);
    this.saveFavorites(filtered);
    this.updateFavoriteButtonState();
    this.updateFavoritesUI();
  }

  private pushToHistory(palette: ColorPalette): void {
    if (this.currentHistoryIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentHistoryIndex + 1);
    }

    const state: HistoryState = {
      palette: { ...palette, colors: [...palette.colors] },
      timestamp: Date.now()
    };

    this.history.push(state);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    this.currentHistoryIndex = this.history.length - 1;
    this.saveHistoryToStorage();

    try {
      history.pushState({ palette: state.palette }, '', `#${palette.id}`);
    } catch {
    }
  }

  private saveHistoryToStorage(): void {
    try {
      const recent = this.history.slice(-MAX_HISTORY);
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(recent));
    } catch {
    }
  }

  private loadHistoryFromStorage(): void {
    try {
      const stored = sessionStorage.getItem(HISTORY_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch {
      this.history = [];
    }
  }

  private switchView(view: string): void {
    this.elements.navTabs.forEach((tab) => {
      const tabView = (tab as HTMLElement).dataset.view;
      if (tabView === view) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    if (view === 'favorites') {
      this.elements.mainView.classList.remove('active');
      this.elements.favoritesView.classList.add('active');
      this.updateFavoritesUI();
    } else {
      this.elements.favoritesView.classList.remove('active');
      this.elements.mainView.classList.add('active');
    }
  }

  private showError(message: string): void {
    this.elements.errorToast.textContent = message;
    this.elements.errorToast.classList.remove('hidden');

    setTimeout(() => {
      this.elements.errorToast.classList.add('hidden');
    }, 3000);
  }
}
