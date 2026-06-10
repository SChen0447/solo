export interface CardOptions {
  id?: string;
  x: number;
  y: number;
  content?: string;
}

export class Card {
  public id: string;
  public x: number;
  public y: number;
  public element: HTMLDivElement;
  private textArea: HTMLTextAreaElement;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cardStartX = 0;
  private cardStartY = 0;
  private rafId: number | null = null;
  private onDragEndCallback: ((card: Card) => void) | null = null;
  private onDeleteCallback: ((card: Card) => void) | null = null;
  private onCopyCallback: ((card: Card) => void) | null = null;
  private onContentChangeCallback: ((card: Card) => void) | null = null;

  static readonly GRID_SIZE = 30;
  static readonly CARD_WIDTH = 160;
  static readonly CARD_MIN_HEIGHT = 100;

  constructor(options: CardOptions) {
    this.id = options.id || this.generateId();
    this.x = options.x;
    this.y = options.y;
    this.element = this.createCardElement(options.content || '');
    this.textArea = this.element.querySelector('.card-text') as HTMLTextAreaElement;
    this.setupEventListeners();
    this.updatePosition();
  }

  private generateId(): string {
    return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private createCardElement(content: string): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.cardId = this.id;

    const textArea = document.createElement('textarea');
    textArea.className = 'card-text';
    textArea.placeholder = '输入...';
    textArea.value = content;
    textArea.readOnly = true;
    card.appendChild(textArea);

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'card-action-btn edit';
    editBtn.innerHTML = '✎';
    editBtn.title = '编辑';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'card-action-btn delete';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = '删除';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'card-action-btn copy';
    copyBtn.innerHTML = '+';
    copyBtn.title = '复制';

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    actions.appendChild(copyBtn);
    card.appendChild(actions);

    const waveContainer = document.createElement('div');
    waveContainer.className = 'card-wave-container';
    card.appendChild(waveContainer);

    return card;
  }

  private setupEventListeners(): void {
    const textArea = this.textArea;
    const editBtn = this.element.querySelector('.card-action-btn.edit') as HTMLButtonElement;
    const deleteBtn = this.element.querySelector('.card-action-btn.delete') as HTMLButtonElement;
    const copyBtn = this.element.querySelector('.card-action-btn.copy') as HTMLButtonElement;

    this.element.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.element.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.enterEditMode();
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.destroy();
    });

    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onCopyCallback) {
        this.onCopyCallback(this);
      }
    });

    textArea.addEventListener('input', () => {
      this.autoResize();
      if (this.onContentChangeCallback) {
        this.onContentChangeCallback(this);
      }
    });

    textArea.addEventListener('blur', () => {
      textArea.readOnly = true;
    });

    textArea.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    textArea.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    editBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    deleteBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    copyBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  }

  private onMouseDown(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.card-action-btn')) return;
    if ((e.target as HTMLElement).closest('.card-text')) return;

    e.preventDefault();
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.cardStartX = this.x;
    this.cardStartY = this.y;

    this.element.classList.add('dragging');

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isDragging) return;

      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
      }

      this.rafId = requestAnimationFrame(() => {
        const dx = moveEvent.clientX - this.dragStartX;
        const dy = moveEvent.clientY - this.dragStartY;
        this.x = this.cardStartX + dx;
        this.y = this.cardStartY + dy;
        this.updatePosition(false);
        if (this.onContentChangeCallback) {
          this.onContentChangeCallback(this);
        }
      });
    };

    const onMouseUp = () => {
      this.isDragging = false;
      this.element.classList.remove('dragging');

      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      this.snapToGrid();
      this.updatePosition();

      if (this.onDragEndCallback) {
        this.onDragEndCallback(this);
      }

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private onDoubleClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.card-action-btn')) return;
    if ((e.target as HTMLElement).closest('.card-text')) return;

    this.playWaveAnimation();
  }

  private playWaveAnimation(): void {
    const waveContainer = this.element.querySelector('.card-wave-container') as HTMLDivElement;
    if (!waveContainer) return;

    const wave = document.createElement('div');
    wave.className = 'card-wave';
    waveContainer.appendChild(wave);

    setTimeout(() => {
      wave.remove();
    }, 600);
  }

  private snapToGrid(): void {
    const grid = Card.GRID_SIZE;
    this.x = Math.round(this.x / grid) * grid;
    this.y = Math.round(this.y / grid) * grid;
  }

  private updatePosition(smooth: boolean = true): void {
    if (!smooth) {
      this.element.style.transition = 'none';
    }
    this.element.style.left = this.x + 'px';
    this.element.style.top = this.y + 'px';
    if (!smooth) {
      this.element.offsetHeight;
      this.element.style.transition = '';
    }
  }

  private autoResize(): void {
    this.textArea.style.height = 'auto';
    this.textArea.style.height = this.textArea.scrollHeight + 'px';
  }

  public enterEditMode(): void {
    this.textArea.readOnly = false;
    this.textArea.focus();
    const length = this.textArea.value.length;
    this.textArea.setSelectionRange(length, length);
  }

  public getContent(): string {
    return this.textArea.value;
  }

  public setContent(content: string): void {
    this.textArea.value = content;
    this.autoResize();
  }

  public getCenter(): { x: number; y: number } {
    const rect = this.element.getBoundingClientRect();
    return {
      x: this.x + Card.CARD_WIDTH / 2,
      y: this.y + rect.height / 2
    };
  }

  public setSelected(selected: boolean): void {
    if (selected) {
      this.element.classList.add('selected');
    } else {
      this.element.classList.remove('selected');
    }
  }

  public destroy(): void {
    this.element.classList.add('removing');
    setTimeout(() => {
      this.element.remove();
      if (this.onDeleteCallback) {
        this.onDeleteCallback(this);
      }
    }, 300);
  }

  public onDragEnd(callback: (card: Card) => void): void {
    this.onDragEndCallback = callback;
  }

  public onDelete(callback: (card: Card) => void): void {
    this.onDeleteCallback = callback;
  }

  public onCopy(callback: (card: Card) => void): void {
    this.onCopyCallback = callback;
  }

  public onContentChange(callback: (card: Card) => void): void {
    this.onContentChangeCallback = callback;
  }
}
