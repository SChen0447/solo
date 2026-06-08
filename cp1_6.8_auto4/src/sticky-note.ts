const COLORS = [
  '#FFF9C4',
  '#BBDEFB',
  '#F8BBD0',
  '#C8E6C9',
  '#E1BEE7',
];

const STICKY_TEMPLATE = document.createElement('template');
STICKY_TEMPLATE.innerHTML = `
  <style>
    :host {
      display: block;
      position: absolute;
      width: 200px;
      height: 180px;
      cursor: grab;
      user-select: none;
      transition: box-shadow 0.3s ease, transform 0.3s ease;
      will-change: transform, box-shadow;
    }

    :host(.topmost) {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    :host(.entering) {
      animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    :host(.exiting) {
      animation: fade-out 0.3s ease forwards;
      pointer-events: none;
    }

    :host(.move-animate) {
      transition: left 0.3s ease, top 0.3s ease;
    }

    @keyframes pop-in {
      0% {
        transform: scale(0.5);
        opacity: 0;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    @keyframes fade-out {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(0.8);
      }
    }

    .sticky-note {
      position: relative;
      width: 100%;
      height: 100%;
      background-color: var(--note-color, #FFF9C4);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      transition: box-shadow 0.3s ease;
    }

    .sticky-note:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    }

    .corner-fold {
      position: absolute;
      top: 0;
      right: 0;
      width: 0;
      height: 0;
      border-left: 24px solid transparent;
      border-bottom: 24px solid rgba(0, 0, 0, 0.08);
      border-top: 24px solid var(--note-color, #FFF9C4);
      border-right: 24px solid var(--note-color, #FFF9C4);
      z-index: 2;
    }

    .delete-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 24px;
      height: 24px;
      border: none;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 50%;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease, background 0.2s ease, transform 0.2s ease;
      z-index: 3;
    }

    .sticky-note:hover .delete-btn {
      opacity: 1;
    }

    .delete-btn:hover {
      background: rgba(255, 100, 100, 0.9);
      color: white;
      transform: scale(1.1);
    }

    .color-picker {
      position: absolute;
      top: 6px;
      left: 6px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 3;
    }

    .sticky-note:hover .color-picker {
      opacity: 1;
    }

    .color-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .color-dot:hover {
      transform: scale(1.2);
    }

    .color-dot.selected {
      border-color: rgba(0, 0, 0, 0.3);
    }

    .content-area {
      position: absolute;
      top: 36px;
      left: 12px;
      right: 12px;
      bottom: 12px;
      outline: none;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      word-wrap: break-word;
      overflow-y: auto;
      cursor: text;
      user-select: text;
    }

    .content-area:empty::before {
      content: attr(data-placeholder);
      color: #999;
      pointer-events: none;
    }

    .resize-handle {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 16px;
      height: 16px;
      cursor: se-resize;
      z-index: 2;
    }

    .resize-handle::before {
      content: '';
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 8px;
      height: 8px;
      border-right: 2px solid rgba(0, 0, 0, 0.2);
      border-bottom: 2px solid rgba(0, 0, 0, 0.2);
    }
  </style>
  <div class="sticky-note">
    <div class="corner-fold"></div>
    <div class="color-picker">
      ${COLORS.map(c => `<div class="color-dot" style="background: ${c}" data-color="${c}"></div>`).join('')}
    </div>
    <button class="delete-btn" title="删除">✕</button>
    <div class="content-area" contenteditable="true" data-placeholder="输入内容..."></div>
    <div class="resize-handle"></div>
  </div>
`;

export class StickyNote extends HTMLElement {
  private _content: string = '';
  private _color: string = '#FFF9C4';
  private _noteId: string = '';
  private _zIndex: number = 0;
  private _isDragging: boolean = false;
  private _isResizing: boolean = false;
  private _dragStartX: number = 0;
  private _dragStartY: number = 0;
  private _resizeStartW: number = 0;
  private _resizeStartH: number = 0;
  private _contentArea: HTMLElement | null = null;
  private _shadowRoot: ShadowRoot;

  static get observedAttributes() {
    return ['note-id', 'color', 'z-index', 'x', 'y', 'width', 'height', 'content'];
  }

  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this._shadowRoot.appendChild(STICKY_TEMPLATE.content.cloneNode(true));
  }

  connectedCallback() {
    this._contentArea = this._shadowRoot.querySelector('.content-area');
    this._setupEventListeners();
    this._updateColor();
    this._updateContent();
    this._updateDimensions();
    this._updatePosition();
    this._updateZIndex();
    this._updateSelectedColor();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'note-id':
        this._noteId = newValue || '';
        break;
      case 'color':
        this._color = newValue || '#FFF9C4';
        this._updateColor();
        this._updateSelectedColor();
        break;
      case 'z-index':
        this._zIndex = parseInt(newValue || '0', 10);
        this._updateZIndex();
        break;
      case 'x':
        this.style.left = `${newValue}px`;
        break;
      case 'y':
        this.style.top = `${newValue}px`;
        break;
      case 'width':
        this.style.width = `${newValue}px`;
        this._updateDimensions();
        break;
      case 'height':
        this.style.height = `${newValue}px`;
        this._updateDimensions();
        break;
      case 'content':
        this._content = newValue || '';
        this._updateContent();
        break;
    }
  }

  private _setupEventListeners(): void {
    const deleteBtn = this._shadowRoot.querySelector('.delete-btn');
    const colorPicker = this._shadowRoot.querySelector('.color-picker');
    const resizeHandle = this._shadowRoot.querySelector('.resize-handle');
    const contentArea = this._shadowRoot.querySelector('.content-area');

    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleDelete();
    });

    colorPicker?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('color-dot')) {
        const color = target.dataset.color || '#FFF9C4';
        this._handleColorChange(color);
      }
    });

    this.addEventListener('mousedown', (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('.content-area')) return;
      if (e.target instanceof HTMLElement && e.target.closest('.color-picker')) return;
      if (e.target instanceof HTMLElement && e.target.closest('.delete-btn')) return;
      if (e.target instanceof HTMLElement && e.target.closest('.resize-handle')) {
        this._startResize(e);
        return;
      }
      this._startDrag(e);
    });

    contentArea?.addEventListener('input', () => {
      this._content = (contentArea as HTMLElement).innerText;
      this.dispatchEvent(new CustomEvent('contentchange', {
        detail: { content: this._content },
        bubbles: true,
        composed: true,
      }));
    });

    contentArea?.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('mousemove', this._onMouseMove.bind(this));
    document.addEventListener('mouseup', this._onMouseUp.bind(this));
  }

  private _startDrag(e: MouseEvent): void {
    this._isDragging = true;
    this._dragStartX = e.clientX - parseFloat(this.style.left || '0');
    this._dragStartY = e.clientY - parseFloat(this.style.top || '0');
    this.style.cursor = 'grabbing';
    this.dispatchEvent(new CustomEvent('dragstart', {
      bubbles: true,
      composed: true,
    }));
  }

  private _startResize(e: MouseEvent): void {
    this._isResizing = true;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._resizeStartW = this.offsetWidth;
    this._resizeStartH = this.offsetHeight;
    e.stopPropagation();
  }

  private _onMouseMove(e: MouseEvent): void {
    if (this._isDragging) {
      const x = e.clientX - this._dragStartX;
      const y = e.clientY - this._dragStartY;
      this.style.left = `${x}px`;
      this.style.top = `${y}px`;
      this.setAttribute('x', String(x));
      this.setAttribute('y', String(y));
      this.dispatchEvent(new CustomEvent('move', {
        detail: { x, y },
        bubbles: true,
        composed: true,
      }));
    }

    if (this._isResizing) {
      const dx = e.clientX - this._dragStartX;
      const dy = e.clientY - this._dragStartY;
      const newWidth = Math.max(120, this._resizeStartW + dx);
      const newHeight = Math.max(100, this._resizeStartH + dy);
      this.style.width = `${newWidth}px`;
      this.style.height = `${newHeight}px`;
      this.setAttribute('width', String(newWidth));
      this.setAttribute('height', String(newHeight));
      this.dispatchEvent(new CustomEvent('resize', {
        detail: { width: newWidth, height: newHeight },
        bubbles: true,
        composed: true,
      }));
    }
  }

  private _onMouseUp(): void {
    if (this._isDragging) {
      this._isDragging = false;
      this.style.cursor = 'grab';
      this.dispatchEvent(new CustomEvent('dragend', {
        detail: {
          x: parseFloat(this.style.left || '0'),
          y: parseFloat(this.style.top || '0'),
        },
        bubbles: true,
        composed: true,
      }));
    }

    if (this._isResizing) {
      this._isResizing = false;
      this.dispatchEvent(new CustomEvent('resizeend', {
        detail: {
          width: this.offsetWidth,
          height: this.offsetHeight,
        },
        bubbles: true,
        composed: true,
      }));
    }
  }

  private _handleDelete(): void {
    this.classList.add('exiting');
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('delete', {
        detail: { id: this._noteId },
        bubbles: true,
        composed: true,
      }));
    }, 300);
  }

  private _handleColorChange(color: string): void {
    this._color = color;
    this.setAttribute('color', color);
    this.dispatchEvent(new CustomEvent('colorchange', {
      detail: { color },
      bubbles: true,
      composed: true,
    }));
  }

  private _updateColor(): void {
    this.style.setProperty('--note-color', this._color);
  }

  private _updateContent(): void {
    if (this._contentArea && this._contentArea.innerText !== this._content) {
      this._contentArea.innerText = this._content;
    }
  }

  private _updateDimensions(): void {
    const note = this._shadowRoot.querySelector('.sticky-note');
    if (note) {
      (note as HTMLElement).style.width = '100%';
      (note as HTMLElement).style.height = '100%';
    }
  }

  private _updatePosition(): void {
    const x = this.getAttribute('x');
    const y = this.getAttribute('y');
    if (x) this.style.left = `${x}px`;
    if (y) this.style.top = `${y}px`;
  }

  private _updateZIndex(): void {
    this.style.zIndex = String(this._zIndex);
  }

  private _updateSelectedColor(): void {
    const dots = this._shadowRoot.querySelectorAll('.color-dot');
    dots.forEach(dot => {
      if ((dot as HTMLElement).dataset.color === this._color) {
        dot.classList.add('selected');
      } else {
        dot.classList.remove('selected');
      }
    });
  }

  public bringToFront(): void {
    this.classList.add('topmost');
    this.dispatchEvent(new CustomEvent('bringtofront', {
      detail: { id: this._noteId },
      bubbles: true,
      composed: true,
    }));
  }

  public setSmoothMove(enable: boolean): void {
    if (enable) {
      this.classList.add('move-animate');
    } else {
      this.classList.remove('move-animate');
    }
  }

  public playEnterAnimation(): void {
    this.classList.add('entering');
    setTimeout(() => {
      this.classList.remove('entering');
    }, 400);
  }

  get noteId(): string { return this._noteId; }
  get noteColor(): string { return this._color; }
  get noteContent(): string { return this._content; }
  get noteZIndex(): number { return this._zIndex; }
}

customElements.define('sticky-note', StickyNote);
