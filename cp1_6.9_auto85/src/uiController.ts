interface UIControllerOptions {
  container: HTMLElement;
  onClear: () => void;
}

export class UIController {
  private container: HTMLElement;
  private clearBtn: HTMLButtonElement;
  private previewBox: HTMLDivElement;
  private previewDot: HTMLDivElement;
  private onClear: () => void;
  private boundHandleClearClick: (e: MouseEvent | TouchEvent) => void;

  constructor(options: UIControllerOptions) {
    this.container = options.container;
    this.onClear = options.onClear;
    this.boundHandleClearClick = this.handleClearClick.bind(this);

    this.clearBtn = this.createClearButton();
    this.previewBox = this.createPreviewBox();
    this.previewDot = this.previewBox.querySelector('.stroke-preview-dot') as HTMLDivElement;

    this.container.appendChild(this.clearBtn);
    this.container.appendChild(this.previewBox);
  }

  private createClearButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'clear-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', '清空画布');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
        <path d="M10 11v6M14 11v6"/>
      </svg>
    `;
    btn.addEventListener('click', this.boundHandleClearClick);
    return btn;
  }

  private createPreviewBox(): HTMLDivElement {
    const box = document.createElement('div');
    box.className = 'stroke-preview';
    const dot = document.createElement('div');
    dot.className = 'stroke-preview-dot';
    dot.style.width = '13px';
    dot.style.height = '13px';
    box.appendChild(dot);
    return box;
  }

  private handleClearClick(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.onClear();
  }

  updateStrokePreview(width: number): void {
    const clampedWidth = Math.max(4, Math.min(34, width));
    this.previewDot.style.width = `${clampedWidth}px`;
    this.previewDot.style.height = `${clampedWidth}px`;
  }

  destroy(): void {
    this.clearBtn.removeEventListener('click', this.boundHandleClearClick);
    if (this.clearBtn.parentNode === this.container) {
      this.container.removeChild(this.clearBtn);
    }
    if (this.previewBox.parentNode === this.container) {
      this.container.removeChild(this.previewBox);
    }
  }
}
