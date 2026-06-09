import { ITEMS } from './puzzle.js';

const MAX_SLOTS = 8;

export class Inventory {
  private items: string[] = [];
  private selectedIndex: number = -1;
  private container: HTMLElement;
  private onItemSelect: ((itemId: string | null) => void) | null = null;
  private onCombine: ((item1: string, item2: string, pos: { x: number; y: number }) => void) | null = null;
  private draggingIndex: number = -1;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setOnItemSelect(callback: (itemId: string | null) => void): void {
    this.onItemSelect = callback;
  }

  setOnCombine(callback: (item1: string, item2: string, pos: { x: number; y: number }) => void): void {
    this.onCombine = callback;
  }

  getItems(): string[] {
    return [...this.items];
  }

  hasItem(itemId: string): boolean {
    return this.items.includes(itemId);
  }

  addItem(itemId: string): boolean {
    if (this.items.length >= MAX_SLOTS || this.items.includes(itemId)) {
      return false;
    }
    this.items.push(itemId);
    this.render();
    return true;
  }

  removeItem(itemId: string): boolean {
    const idx = this.items.indexOf(itemId);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    if (this.selectedIndex === idx) {
      this.selectedIndex = -1;
    } else if (this.selectedIndex > idx) {
      this.selectedIndex--;
    }
    this.render();
    return true;
  }

  getSelectedItem(): string | null {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.items.length) {
      return null;
    }
    return this.items[this.selectedIndex];
  }

  clear(): void {
    this.items = [];
    this.selectedIndex = -1;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    for (let i = 0; i < MAX_SLOTS; i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.dataset.index = String(i);

      if (i === this.selectedIndex) {
        slot.classList.add('selected');
      }

      if (i < this.items.length) {
        const item = ITEMS[this.items[i]];
        if (item) {
          const icon = document.createElement('span');
          icon.className = 'item-icon';
          icon.textContent = item.icon;
          slot.appendChild(icon);

          const tooltip = document.createElement('span');
          tooltip.className = 'item-tooltip';
          tooltip.textContent = item.description;
          slot.appendChild(tooltip);

          slot.draggable = true;

          slot.addEventListener('click', () => {
            if (this.selectedIndex === i) {
              this.selectedIndex = -1;
              this.onItemSelect?.(null);
            } else {
              this.selectedIndex = i;
              this.onItemSelect?.(this.items[i]);
            }
            this.render();
          });

          slot.addEventListener('dragstart', (e: DragEvent) => {
            this.draggingIndex = i;
            if (e.dataTransfer) {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', this.items[i]);
            }
          });

          slot.addEventListener('dragend', () => {
            this.draggingIndex = -1;
            this.container.querySelectorAll('.inventory-slot').forEach(s => {
              s.classList.remove('drag-over');
            });
          });

          slot.addEventListener('dragover', (e: DragEvent) => {
            e.preventDefault();
            if (this.draggingIndex !== -1 && this.draggingIndex !== i) {
              slot.classList.add('drag-over');
            }
          });

          slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
          });

          slot.addEventListener('drop', (e: DragEvent) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            if (this.draggingIndex !== -1 && this.draggingIndex !== i) {
              const rect = slot.getBoundingClientRect();
              this.onCombine?.(
                this.items[this.draggingIndex],
                this.items[i],
                { x: rect.left + rect.width / 2, y: rect.top }
              );
            }
          });
        }
      }

      this.container.appendChild(slot);
    }
  }

  renderEmpty(): void {
    this.container.innerHTML = '';
    for (let i = 0; i < MAX_SLOTS; i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      this.container.appendChild(slot);
    }
  }

  flashCombine(): void {
    const flash = document.getElementById('combine-flash');
    if (flash) {
      flash.classList.remove('active');
      void flash.offsetWidth;
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 300);
    }
  }

  showFail(x: number, y: number): void {
    const fail = document.getElementById('fail-mark');
    if (fail) {
      fail.style.left = `${x - 16}px`;
      fail.style.top = `${y - 16}px`;
      fail.classList.remove('active');
      void fail.offsetWidth;
      fail.classList.add('active');
      setTimeout(() => fail.classList.remove('active'), 500);
    }
  }
}
