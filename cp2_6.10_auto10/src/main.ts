import './styles.css';
import { ColorWheel } from './colorWheel';
import {
  HSLColor,
  ColorScheme,
  generateSchemes,
  hslToHex,
  hslToString,
  generateCssVariables,
  FavoriteItem
} from './colorScheme';
import { UIPreview } from './preview';

const MAX_HISTORY = 20;
const MAX_FAVORITES = 50;
const FAVORITES_STORAGE_KEY = 'colorpalette_favorites';

interface AppState {
  baseColor: HSLColor;
  schemes: ColorScheme[];
  currentSchemeIndex: number;
  history: HSLColor[];
  historyIndex: number;
  favorites: FavoriteItem[];
}

class ColorPaletteApp {
  private state: AppState;
  private colorWheel!: ColorWheel;
  private uiPreview!: UIPreview;
  private isUpdatingFromHistory: boolean = false;

  private els: {
    hexValue: HTMLElement;
    hslValue: HTMLElement;
    colorInfo: HTMLElement;
    schemesContainer: HTMLElement;
    favoritesList: HTMLElement;
    btnBack: HTMLButtonElement;
    btnForward: HTMLButtonElement;
    btnFavorite: HTMLButtonElement;
    btnExport: HTMLButtonElement;
    btnMenu: HTMLButtonElement;
    sidebar: HTMLElement;
    overlay: HTMLElement;
    favoritesEmpty: HTMLElement;
  };

  constructor() {
    this.state = this.initializeState();
    this.els = this.cacheElements();
    this.init();
  }

  private initializeState(): AppState {
    const defaultColor: HSLColor = { h: 210, s: 80, l: 50 };
    const schemes = generateSchemes(defaultColor);
    const favorites = this.loadFavorites();

    return {
      baseColor: defaultColor,
      schemes,
      currentSchemeIndex: 0,
      history: [defaultColor],
      historyIndex: 0,
      favorites
    };
  }

  private cacheElements() {
    const getEl = (id: string) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Element #${id} not found`);
      return el;
    };

    return {
      hexValue: getEl('hex-value'),
      hslValue: getEl('hsl-value'),
      colorInfo: getEl('color-info'),
      schemesContainer: getEl('schemes-container'),
      favoritesList: getEl('favorites-list'),
      btnBack: document.getElementById('btn-back') as HTMLButtonElement,
      btnForward: document.getElementById('btn-forward') as HTMLButtonElement,
      btnFavorite: document.getElementById('btn-favorite') as HTMLButtonElement,
      btnExport: document.getElementById('btn-export') as HTMLButtonElement,
      btnMenu: document.getElementById('btn-menu') as HTMLButtonElement,
      sidebar: getEl('sidebar'),
      overlay: getEl('sidebar-overlay'),
      favoritesEmpty: getEl('favorites-empty')
    };
  }

  private init(): void {
    const canvas = document.getElementById('color-wheel') as HTMLCanvasElement;
    const previewContainer = document.getElementById('preview-container');
    if (!previewContainer) throw new Error('Preview container not found');

    this.colorWheel = new ColorWheel(canvas, (color) => this.handleColorChange(color));
    this.uiPreview = new UIPreview(previewContainer);

    this.bindEvents();
    this.renderAll();
  }

  private bindEvents(): void {
    this.els.btnBack.addEventListener('click', () => this.goBack());
    this.els.btnForward.addEventListener('click', () => this.goForward());
    this.els.btnFavorite.addEventListener('click', () => this.toggleFavorite());
    this.els.btnExport.addEventListener('click', () => this.exportCss());
    this.els.btnMenu.addEventListener('click', () => this.toggleSidebar());
    this.els.overlay.addEventListener('click', () => this.closeSidebar());

    this.els.hexValue.addEventListener('click', () => this.copyToClipboard(hslToHex(this.state.baseColor)));
    this.els.hslValue.addEventListener('click', () => this.copyToClipboard(hslToString(this.state.baseColor)));

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.goForward();
        } else {
          this.goBack();
        }
      }
    });

    window.addEventListener('resize', () => this.handleResize());
  }

  private handleColorChange(color: HSLColor): void {
    this.state.baseColor = { ...color };
    this.state.schemes = generateSchemes(color);

    if (!this.isUpdatingFromHistory) {
      this.addToHistory(color);
    }

    this.renderColorInfo();
    this.renderSchemes();
    this.renderPreview();
    this.updateHistoryButtons();
    this.updateFavoriteButton();
  }

  private addToHistory(color: HSLColor): void {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
    }

    const lastColor = this.state.history[this.state.history.length - 1];
    if (lastColor &&
        lastColor.h === color.h &&
        lastColor.s === color.s &&
        lastColor.l === color.l) {
      return;
    }

    this.state.history.push({ ...color });
    if (this.state.history.length > MAX_HISTORY) {
      this.state.history.shift();
    }
    this.state.historyIndex = this.state.history.length - 1;
  }

  private goBack(): void {
    if (this.state.historyIndex <= 0) return;
    this.state.historyIndex--;
    this.applyHistoryColor();
  }

  private goForward(): void {
    if (this.state.historyIndex >= this.state.history.length - 1) return;
    this.state.historyIndex++;
    this.applyHistoryColor();
  }

  private applyHistoryColor(): void {
    this.isUpdatingFromHistory = true;
    const color = this.state.history[this.state.historyIndex];
    this.colorWheel.setColor(color);
    this.handleColorChange(color);
    this.isUpdatingFromHistory = false;
  }

  private toggleFavorite(): void {
    const existingIndex = this.findFavoriteIndex();

    if (existingIndex >= 0) {
      this.state.favorites.splice(existingIndex, 1);
    } else {
      if (this.state.favorites.length >= MAX_FAVORITES) {
        this.state.favorites.shift();
      }
      const favorite: FavoriteItem = {
        id: Date.now().toString(),
        baseColor: { ...this.state.baseColor },
        schemes: JSON.parse(JSON.stringify(this.state.schemes)),
        createdAt: Date.now()
      };
      this.state.favorites.push(favorite);
    }

    this.saveFavorites();
    this.renderFavorites();
    this.updateFavoriteButton();
  }

  private findFavoriteIndex(): number {
    return this.state.favorites.findIndex(f =>
      f.baseColor.h === this.state.baseColor.h &&
      f.baseColor.s === this.state.baseColor.s &&
      f.baseColor.l === this.state.baseColor.l
    );
  }

  private loadFavorites(): FavoriteItem[] {
    try {
      const data = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveFavorites(): void {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(this.state.favorites));
    } catch {
      console.warn('无法保存收藏到localStorage');
    }
  }

  private applyFavorite(favorite: FavoriteItem): void {
    this.isUpdatingFromHistory = true;
    this.colorWheel.setColor(favorite.baseColor);
    this.handleColorChange(favorite.baseColor);
    this.isUpdatingFromHistory = false;
    this.closeSidebar();
  }

  private deleteFavorite(id: string, e: Event): void {
    e.stopPropagation();
    const index = this.state.favorites.findIndex(f => f.id === id);
    if (index >= 0) {
      this.state.favorites.splice(index, 1);
      this.saveFavorites();
      this.renderFavorites();
      this.updateFavoriteButton();
    }
  }

  private exportCss(): void {
    const currentScheme = this.state.schemes[this.state.currentSchemeIndex] || this.state.schemes[0];
    const css = generateCssVariables(currentScheme);
    this.copyToClipboard(css);
    this.showToast('CSS变量已复制到剪贴板');
  }

  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`已复制: ${text}`);
    }).catch(() => {
      this.showToast('复制失败，请手动复制');
    });
  }

  private showToast(message: string): void {
    const existing = document.querySelector('.app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'app-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  private toggleSidebar(): void {
    this.els.sidebar.classList.toggle('open');
    this.els.overlay.classList.toggle('visible');
  }

  private closeSidebar(): void {
    this.els.sidebar.classList.remove('open');
    this.els.overlay.classList.remove('visible');
  }

  private handleResize(): void {
    if (window.innerWidth >= 768) {
      this.closeSidebar();
    }
  }

  private setSchemeColor(color: HSLColor): void {
    this.isUpdatingFromHistory = true;
    this.colorWheel.setColor(color);
    this.handleColorChange(color);
    this.isUpdatingFromHistory = false;
  }

  private selectScheme(index: number): void {
    this.state.currentSchemeIndex = index;
    this.renderSchemes();
    this.renderPreview();
  }

  private renderAll(): void {
    this.renderColorInfo();
    this.renderSchemes();
    this.renderPreview();
    this.renderFavorites();
    this.updateHistoryButtons();
    this.updateFavoriteButton();
  }

  private renderColorInfo(): void {
    const hex = hslToHex(this.state.baseColor);
    const hsl = hslToString(this.state.baseColor);

    this.els.hexValue.textContent = hex;
    this.els.hslValue.textContent = hsl;
    this.els.colorInfo.style.background = hex;

    const textColor = this.state.baseColor.l > 60 ? '#1a1a1a' : '#ffffff';
    this.els.colorInfo.style.color = textColor;
  }

  private renderSchemes(): void {
    this.els.schemesContainer.innerHTML = '';

    this.state.schemes.forEach((scheme, schemeIndex) => {
      const card = document.createElement('div');
      card.className = `scheme-card ${schemeIndex === this.state.currentSchemeIndex ? 'active' : ''}`;
      card.onclick = () => this.selectScheme(schemeIndex);

      const header = document.createElement('div');
      header.className = 'scheme-header';
      header.innerHTML = `<span class="scheme-name">${scheme.name}</span>`;

      const bars = document.createElement('div');
      bars.className = 'scheme-bars';

      scheme.colors.forEach((color, colorIndex) => {
        const bar = document.createElement('div');
        bar.className = 'scheme-bar';
        bar.style.background = hslToHex(color);
        bar.title = `${hslToHex(color)} · ${hslToString(color)}`;
        bar.onclick = (e) => {
          e.stopPropagation();
          bar.classList.add('pulse');
          setTimeout(() => bar.classList.remove('pulse'), 200);
          this.setSchemeColor(color);
        };
        bars.appendChild(bar);
      });

      card.appendChild(header);
      card.appendChild(bars);
      this.els.schemesContainer.appendChild(card);
    });
  }

  private renderPreview(): void {
    const scheme = this.state.schemes[this.state.currentSchemeIndex] || this.state.schemes[0];
    this.uiPreview.update(scheme);
  }

  private renderFavorites(): void {
    if (this.state.favorites.length === 0) {
      this.els.favoritesList.innerHTML = '';
      this.els.favoritesEmpty.style.display = 'block';
      return;
    }

    this.els.favoritesEmpty.style.display = 'none';
    this.els.favoritesList.innerHTML = '';

    const sorted = [...this.state.favorites].reverse();

    sorted.forEach(favorite => {
      const item = document.createElement('div');
      item.className = 'favorite-item';
      item.onclick = () => this.applyFavorite(favorite);

      const preview = document.createElement('div');
      preview.className = 'favorite-preview';
      favorite.schemes[0].colors.slice(0, 5).forEach(c => {
        const dot = document.createElement('div');
        dot.className = 'favorite-dot';
        dot.style.background = hslToHex(c);
        preview.appendChild(dot);
      });

      const info = document.createElement('div');
      info.className = 'favorite-info';
      info.innerHTML = `
        <span class="favorite-hex">${hslToHex(favorite.baseColor)}</span>
        <span class="favorite-date">${new Date(favorite.createdAt).toLocaleDateString()}</span>
      `;

      const delBtn = document.createElement('button');
      delBtn.className = 'favorite-delete';
      delBtn.innerHTML = '×';
      delBtn.title = '删除收藏';
      delBtn.onclick = (e) => this.deleteFavorite(favorite.id, e);

      item.appendChild(preview);
      item.appendChild(info);
      item.appendChild(delBtn);
      this.els.favoritesList.appendChild(item);
    });
  }

  private updateHistoryButtons(): void {
    this.els.btnBack.disabled = this.state.historyIndex <= 0;
    this.els.btnForward.disabled = this.state.historyIndex >= this.state.history.length - 1;
  }

  private updateFavoriteButton(): void {
    const isFavorited = this.findFavoriteIndex() >= 0;
    this.els.btnFavorite.classList.toggle('is-favorite', isFavorited);
    this.els.btnFavorite.innerHTML = isFavorited ? '★' : '☆';
    this.els.btnFavorite.title = isFavorited ? '取消收藏' : '收藏此方案';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ColorPaletteApp();
});
