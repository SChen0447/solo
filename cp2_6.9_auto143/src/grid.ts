import {
  PlacedWord,
  GridCell,
  HistoryState,
  HistoryAction,
  DragState,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  MAX_HISTORY
} from './types';

export class GridManager {
  private cells: GridCell[][] = [];
  private placedWords: Map<string, PlacedWord> = new Map();
  private history: HistoryState[] = [];
  private nextZIndex = 1;

  private gridEl: HTMLElement;
  private placedWordsEl: HTMLElement;
  private gridContainerEl: HTMLElement;

  private dragState: DragState = {
    isDragging: false,
    type: null,
    wordId: null,
    text: '',
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0
  };

  private dragGhost: HTMLElement | null = null;
  private currentHighlightCell: HTMLElement | null = null;

  private onWordPlaced?: (word: PlacedWord) => void;
  private onWordMoved?: (word: PlacedWord, fromX: number, fromY: number) => void;
  private onWordSelected?: (word: PlacedWord | null) => void;
  private onHistoryChanged?: (canUndo: boolean) => void;

  constructor(
    gridEl: HTMLElement,
    placedWordsEl: HTMLElement,
    gridContainerEl: HTMLElement
  ) {
    this.gridEl = gridEl;
    this.placedWordsEl = placedWordsEl;
    this.gridContainerEl = gridContainerEl;
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.cells = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        row.push({ x, y, occupied: false, wordId: null });
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        this.gridEl.appendChild(cell);
      }
      this.cells.push(row);
    }
  }

  public setCallbacks(
    onWordPlaced: (word: PlacedWord) => void,
    onWordMoved: (word: PlacedWord, fromX: number, fromY: number) => void,
    onWordSelected: (word: PlacedWord | null) => void,
    onHistoryChanged: (canUndo: boolean) => void
  ): void {
    this.onWordPlaced = onWordPlaced;
    this.onWordMoved = onWordMoved;
    this.onWordSelected = onWordSelected;
    this.onHistoryChanged = onHistoryChanged;
  }

  public getPlacedWords(): PlacedWord[] {
    return Array.from(this.placedWords.values());
  }

  public getWordById(id: string): PlacedWord | undefined {
    return this.placedWords.get(id);
  }

  public updateWord(id: string, updates: Partial<PlacedWord>): void {
    const word = this.placedWords.get(id);
    if (!word) return;

    const before: Partial<PlacedWord> = {
      rotation: word.rotation,
      scale: word.scale,
      opacity: word.opacity,
      zIndex: word.zIndex
    };

    Object.assign(word, updates);
    this.renderWord(word);

    if (this.onWordPlaced) {
      this.saveHistory();
    }
  }

  private saveHistory(): void {
    const state: HistoryState = {
      placedWords: Array.from(this.placedWords.values()).map(w => ({ ...w })),
      nextZIndex: this.nextZIndex
    };

    if (this.history.length >= MAX_HISTORY) {
      this.history.shift();
    }
    this.history.push(state);
    this.onHistoryChanged?.(this.history.length > 0);
  }

  public undo(): void {
    if (this.history.length === 0) return;

    const lastState = this.history.pop()!;
    this.placedWords.clear();
    for (const row of this.cells) {
      for (const cell of row) {
        cell.occupied = false;
        cell.wordId = null;
      }
    }

    this.placedWordsEl.innerHTML = '';
    for (const word of lastState.placedWords) {
      this.placedWords.set(word.id, { ...word });
      this.cells[word.gridY][word.gridX].occupied = true;
      this.cells[word.gridY][word.gridX].wordId = word.id;
      this.createWordElement({ ...word });
    }
    this.nextZIndex = lastState.nextZIndex;

    this.onWordSelected?.(null);
    this.onHistoryChanged?.(this.history.length > 0);
  }

  public clear(): void {
    if (this.placedWords.size === 0) return;

    this.saveHistory();

    for (const row of this.cells) {
      for (const cell of row) {
        cell.occupied = false;
        cell.wordId = null;
      }
    }

    this.placedWords.clear();
    this.placedWordsEl.innerHTML = '';
    this.nextZIndex = 1;
    this.onWordSelected?.(null);
  }

  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public startNewWordDrag(text: string, clientX: number, clientY: number): void {
    this.dragState = {
      isDragging: true,
      type: 'new',
      wordId: null,
      text,
      startX: clientX,
      startY: clientY,
      offsetX: 0,
      offsetY: 0
    };
    this.createDragGhost(text, clientX, clientY);
  }

  public startExistingWordDrag(
    wordId: string,
    clientX: number,
    clientY: number
  ): void {
    const word = this.placedWords.get(wordId);
    if (!word) return;

    const rect = this.getGridRect();
    const wordPixelX = rect.left + word.gridX * CELL_SIZE;
    const wordPixelY = rect.top + word.gridY * CELL_SIZE;

    this.dragState = {
      isDragging: true,
      type: 'existing',
      wordId,
      text: word.text,
      startX: clientX,
      startY: clientY,
      offsetX: clientX - wordPixelX,
      offsetY: clientY - wordPixelY
    };

    const el = this.placedWordsEl.querySelector(`[data-id="${wordId}"]`) as HTMLElement;
    if (el) el.classList.add('dragging');
  }

  public handleDragMove(clientX: number, clientY: number): void {
    if (!this.dragState.isDragging) return;

    if (this.dragGhost) {
      this.dragGhost.style.left = `${clientX - 30}px`;
      this.dragGhost.style.top = `${clientY - 20}px`;
    }

    if (this.dragState.type === 'existing' && this.dragState.wordId) {
      const el = this.placedWordsEl.querySelector(
        `[data-id="${this.dragState.wordId}"]`
      ) as HTMLElement;
      if (el) {
        const rect = this.getGridRect();
        const pixelX = clientX - this.dragState.offsetX - rect.left;
        const pixelY = clientY - this.dragState.offsetY - rect.top;
        el.style.left = `${pixelX}px`;
        el.style.top = `${pixelY}px`;
      }
    }

    const gridPos = this.getGridPosition(clientX, clientY);
    this.highlightCell(gridPos.x, gridPos.y);
  }

  public handleDragEnd(clientX: number, clientY: number): void {
    if (!this.dragState.isDragging) return;

    const gridPos = this.getGridPosition(clientX, clientY);
    this.clearHighlight();

    if (gridPos.x >= 0 && gridPos.x < GRID_COLS && gridPos.y >= 0 && gridPos.y < GRID_ROWS) {
      if (this.dragState.type === 'new') {
        this.placeNewWord(this.dragState.text, gridPos.x, gridPos.y);
      } else if (this.dragState.type === 'existing' && this.dragState.wordId) {
        this.moveExistingWord(this.dragState.wordId, gridPos.x, gridPos.y);
      }
    } else if (this.dragState.type === 'existing' && this.dragState.wordId) {
      const word = this.placedWords.get(this.dragState.wordId);
      if (word) {
        const el = this.placedWordsEl.querySelector(
          `[data-id="${this.dragState.wordId}"]`
        ) as HTMLElement;
        if (el) {
          el.classList.remove('dragging');
          el.style.left = `${word.gridX * CELL_SIZE}px`;
          el.style.top = `${word.gridY * CELL_SIZE}px`;
        }
      }
    }

    this.removeDragGhost();
    this.dragState.isDragging = false;
    this.dragState.type = null;
    this.dragState.wordId = null;
  }

  public isDragging(): boolean {
    return this.dragState.isDragging;
  }

  private placeNewWord(text: string, gridX: number, gridY: number): void {
    if (this.cells[gridY][gridX].occupied) return;

    this.saveHistory();

    const id = `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const word: PlacedWord = {
      id,
      text,
      gridX,
      gridY,
      rotation: 0,
      scale: 1,
      opacity: 1,
      zIndex: this.nextZIndex++
    };

    this.placedWords.set(id, word);
    this.cells[gridY][gridX].occupied = true;
    this.cells[gridY][gridX].wordId = id;

    this.createWordElement(word);
    this.onWordPlaced?.(word);
  }

  private moveExistingWord(wordId: string, newX: number, newY: number): void {
    const word = this.placedWords.get(wordId);
    if (!word) return;

    if (newX === word.gridX && newY === word.gridY) {
      const el = this.placedWordsEl.querySelector(`[data-id="${wordId}"]`) as HTMLElement;
      if (el) {
        el.classList.remove('dragging');
        el.style.left = `${word.gridX * CELL_SIZE}px`;
        el.style.top = `${word.gridY * CELL_SIZE}px`;
      }
      return;
    }

    if (this.cells[newY][newX].occupied && this.cells[newY][newX].wordId !== wordId) return;

    this.saveHistory();

    const fromX = word.gridX;
    const fromY = word.gridY;

    this.cells[fromY][fromX].occupied = false;
    this.cells[fromY][fromX].wordId = null;
    this.cells[newY][newX].occupied = true;
    this.cells[newY][newX].wordId = wordId;

    word.gridX = newX;
    word.gridY = newY;

    const el = this.placedWordsEl.querySelector(`[data-id="${wordId}"]`) as HTMLElement;
    if (el) {
      el.classList.remove('dragging');
      el.style.left = `${newX * CELL_SIZE}px`;
      el.style.top = `${newY * CELL_SIZE}px`;
    }

    this.onWordMoved?.(word, fromX, fromY);
  }

  private createWordElement(word: PlacedWord): void {
    const el = document.createElement('div');
    el.className = 'placed-word';
    el.dataset.id = word.id;
    el.textContent = word.text;
    el.style.left = `${word.gridX * CELL_SIZE}px`;
    el.style.top = `${word.gridY * CELL_SIZE}px`;
    this.applyWordTransforms(el, word);

    const ring = document.createElement('div');
    ring.className = 'control-ring';
    ring.innerHTML = `
      <div class="control-handle rotate" data-handle="rotate"></div>
      <div class="control-handle scale" data-handle="scale"></div>
      <div class="control-handle opacity" data-handle="opacity"></div>
      <div class="control-handle zindex" data-handle="zindex"></div>
    `;
    el.appendChild(ring);

    this.placedWordsEl.appendChild(el);
  }

  private applyWordTransforms(el: HTMLElement, word: PlacedWord): void {
    el.style.transform = `rotate(${word.rotation}deg) scale(${word.scale})`;
    el.style.opacity = String(word.opacity);
    el.style.zIndex = String(word.zIndex);
  }

  public renderWord(word: PlacedWord): void {
    const el = this.placedWordsEl.querySelector(`[data-id="${word.id}"]`) as HTMLElement;
    if (el) {
      this.applyWordTransforms(el, word);
    }
  }

  public selectWord(wordId: string | null): void {
    const prevSelected = this.placedWordsEl.querySelector('.placed-word.selected');
    if (prevSelected) prevSelected.classList.remove('selected');

    if (wordId) {
      const el = this.placedWordsEl.querySelector(`[data-id="${wordId}"]`) as HTMLElement;
      if (el) el.classList.add('selected');
      this.onWordSelected?.(this.placedWords.get(wordId) ?? null);
    } else {
      this.onWordSelected?.(null);
    }
  }

  public bringToFront(wordId: string): void {
    const word = this.placedWords.get(wordId);
    if (!word) return;
    this.saveHistory();
    word.zIndex = this.nextZIndex++;
    this.renderWord(word);
  }

  private createDragGhost(text: string, x: number, y: number): void {
    this.dragGhost = document.createElement('div');
    this.dragGhost.className = 'drag-ghost';
    this.dragGhost.textContent = text;
    this.dragGhost.style.left = `${x - 30}px`;
    this.dragGhost.style.top = `${y - 20}px`;
    document.body.appendChild(this.dragGhost);
  }

  private removeDragGhost(): void {
    if (this.dragGhost && this.dragGhost.parentNode) {
      this.dragGhost.parentNode.removeChild(this.dragGhost);
    }
    this.dragGhost = null;
  }

  private getGridRect(): DOMRect {
    const gridEl = this.gridEl as HTMLElement;
    return gridEl.getBoundingClientRect();
  }

  private getGridPosition(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.getGridRect();
    const x = Math.floor((clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((clientY - rect.top) / CELL_SIZE);
    return { x, y };
  }

  private highlightCell(x: number, y: number): void {
    this.clearHighlight();
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;
    if (this.cells[y][x].occupied) return;

    const cell = this.gridEl.querySelector(
      `[data-x="${x}"][data-y="${y}"]`
    ) as HTMLElement;
    if (cell) {
      cell.classList.add('highlight');
      this.currentHighlightCell = cell;
    }
  }

  private clearHighlight(): void {
    if (this.currentHighlightCell) {
      this.currentHighlightCell.classList.remove('highlight');
      this.currentHighlightCell = null;
    }
  }
}
