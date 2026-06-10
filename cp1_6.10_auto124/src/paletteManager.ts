import { RGB, ColorBlindType, rgbToHex, rgbToCss, applyColorBlindness } from './colorUtils';

export interface PaletteColor {
  hex: string;
  locked: boolean;
}

const STORAGE_KEY = 'chroma_studio_palette';
const MAX_COLORS = 12;

export class PaletteManager {
  private container: HTMLElement;
  private colors: PaletteColor[] = [];
  private gridContainer: HTMLElement | null = null;
  private colorBlindType: ColorBlindType = 'none';
  private draggingIndex: number | null = null;
  public onPaletteChange: (() => void) | null = null;
  public showToast: ((message: string, type: 'success' | 'error') => void) | null = null;
  public getCurrentColor: (() => RGB) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.loadFromStorage();
    this.render();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.colors = JSON.parse(saved);
      }
    } catch (e) {
      console.error('加载调色板失败', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.colors));
    } catch (e) {
      console.error('保存调色板失败', e);
    }
  }

  private notifyChange(): void {
    if (this.onPaletteChange) {
      this.onPaletteChange();
    }
  }

  private showToastMessage(message: string, type: 'success' | 'error'): void {
    if (this.showToast) {
      this.showToast(message, type);
    }
  }

  public getColors(): PaletteColor[] {
    return [...this.colors];
  }

  public getDisplayColors(): string[] {
    return this.colors.map((c) => {
      const rgb = this.hexToRgbObj(c.hex);
      const displayRgb = applyColorBlindness(rgb, this.colorBlindType);
      return rgbToHex(displayRgb.r, displayRgb.g, displayRgb.b);
    });
  }

  private hexToRgbObj(hex: string): RGB {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  public setColorBlindType(type: ColorBlindType): void {
    this.colorBlindType = type;
    this.updateCards();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="module-title">调色板管理 (${this.colors.length}/${MAX_COLORS})</div>
      <div class="palette-grid"></div>
      <div class="palette-actions">
        <button class="btn btn-danger" id="clear-all-btn">清空所有</button>
        <button class="btn btn-primary" id="export-css-btn">导出为CSS变量</button>
      </div>
    `;
    this.gridContainer = this.container.querySelector('.palette-grid');
    this.renderGrid();
    this.bindActionButtons();
  }

  private renderGrid(): void {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = '';

    this.colors.forEach((color, index) => {
      const card = this.createColorCard(color, index);
      this.gridContainer!.appendChild(card);
    });

    for (let i = this.colors.length; i < MAX_COLORS; i++) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'empty-slot';
      emptySlot.textContent = '+';
      emptySlot.addEventListener('click', () => this.addCurrentColor());
      this.gridContainer.appendChild(emptySlot);
    }
  }

  private createColorCard(color: PaletteColor, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'color-card';
    card.dataset.index = String(index);
    card.draggable = true;

    const displayHex = this.getDisplayHex(color.hex);
    card.style.backgroundColor = displayHex;

    if (color.locked) {
      const lockIcon = document.createElement('div');
      lockIcon.className = 'lock-icon';
      lockIcon.innerHTML = '🔒';
      lockIcon.title = '点击解锁';
      lockIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleLock(index);
      });
      card.appendChild(lockIcon);
    } else {
      const lockIcon = document.createElement('div');
      lockIcon.className = 'lock-icon';
      lockIcon.innerHTML = '🔓';
      lockIcon.title = '点击锁定';
      lockIcon.style.opacity = '0.6';
      lockIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleLock(index);
      });
      card.appendChild(lockIcon);
    }

    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = '删除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeColor(index, card);
    });
    card.appendChild(deleteBtn);

    card.addEventListener('dragstart', (e) => {
      this.draggingIndex = index;
      card.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      this.draggingIndex = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetIndex = parseInt(card.dataset.index || '-1');
      if (this.draggingIndex !== null && this.draggingIndex !== targetIndex && targetIndex >= 0) {
        this.reorderColors(this.draggingIndex, targetIndex);
      }
    });

    return card;
  }

  private getDisplayHex(hex: string): string {
    const rgb = this.hexToRgbObj(hex);
    const displayRgb = applyColorBlindness(rgb, this.colorBlindType);
    return rgbToHex(displayRgb.r, displayRgb.g, displayRgb.b);
  }

  private updateCards(): void {
    if (!this.gridContainer) return;
    const cards = this.gridContainer.querySelectorAll('.color-card');
    cards.forEach((card, index) => {
      if (this.colors[index]) {
        const displayHex = this.getDisplayHex(this.colors[index].hex);
        (card as HTMLElement).style.backgroundColor = displayHex;
      }
    });
    const titleEl = this.container.querySelector('.module-title');
    if (titleEl) {
      titleEl.textContent = `调色板管理 (${this.colors.length}/${MAX_COLORS})`;
    }
  }

  private toggleLock(index: number): void {
    this.colors[index].locked = !this.colors[index].locked;
    this.saveToStorage();
    this.renderGrid();
    this.notifyChange();
  }

  private addCurrentColor(): void {
    if (this.colors.length >= MAX_COLORS) {
      this.showToastMessage('调色板已满', 'error');
      return;
    }
    if (!this.getCurrentColor) return;
    const rgb = this.getCurrentColor();
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    this.colors.push({ hex, locked: false });
    this.saveToStorage();
    this.renderGrid();
    this.updateTitle();
    this.notifyChange();
    this.showToastMessage('已保存', 'success');
  }

  private removeColor(index: number, card: HTMLElement): void {
    if (this.colors[index].locked) {
      this.showToastMessage('该颜色已锁定', 'error');
      return;
    }
    card.classList.add('removing');
    setTimeout(() => {
      this.colors.splice(index, 1);
      this.saveToStorage();
      this.renderGrid();
      this.updateTitle();
      this.notifyChange();
      this.showToastMessage('已删除', 'error');
    }, 300);
  }

  private reorderColors(from: number, to: number): void {
    const [removed] = this.colors.splice(from, 1);
    this.colors.splice(to, 0, removed);
    this.saveToStorage();
    this.renderGrid();
    this.notifyChange();
  }

  private updateTitle(): void {
    const titleEl = this.container.querySelector('.module-title');
    if (titleEl) {
      titleEl.textContent = `调色板管理 (${this.colors.length}/${MAX_COLORS})`;
    }
  }

  private bindActionButtons(): void {
    const clearBtn = this.container.querySelector('#clear-all-btn');
    const exportBtn = this.container.querySelector('#export-css-btn');

    clearBtn?.addEventListener('click', () => this.showClearModal());
    exportBtn?.addEventListener('click', () => this.exportCss());
  }

  private showClearModal(): void {
    const hasUnlockedColors = this.colors.some((c) => !c.locked);
    if (this.colors.length === 0) {
      this.showToastMessage('调色板为空', 'error');
      return;
    }
    if (!hasUnlockedColors) {
      this.showToastMessage('所有颜色都已锁定', 'error');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-title">确认清空所有未锁定的颜色？</div>
        <div style="color: #666; font-size: 13px;">此操作无法撤销，已锁定的颜色将保留。</div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-confirm" id="modal-confirm">确认</button>
          <button class="modal-btn modal-btn-cancel" id="modal-cancel">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#modal-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.querySelector('#modal-confirm')?.addEventListener('click', () => {
      this.colors = this.colors.filter((c) => c.locked);
      this.saveToStorage();
      this.renderGrid();
      this.updateTitle();
      this.notifyChange();
      this.showToastMessage('已清空', 'error');
      overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  private async exportCss(): Promise<void> {
    if (this.colors.length === 0) {
      this.showToastMessage('调色板为空', 'error');
      return;
    }
    let css = ':root {\n';
    this.colors.forEach((c, i) => {
      css += `  --color-${i + 1}: ${c.hex};\n`;
    });
    css += '}';

    try {
      await navigator.clipboard.writeText(css);
      this.showToastMessage('已复制', 'success');
    } catch (e) {
      console.error('复制失败', e);
      this.showToastMessage('复制失败', 'error');
    }
  }

  public reset(): void {
    this.colors = [];
    this.saveToStorage();
    this.renderGrid();
    this.updateTitle();
    this.notifyChange();
  }
}
