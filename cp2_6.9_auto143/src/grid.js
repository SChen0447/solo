import { GRID_COLS, GRID_ROWS, CELL_SIZE, MAX_HISTORY } from './types';
export class GridManager {
    constructor(gridEl, placedWordsEl, gridContainerEl) {
        this.cells = [];
        this.placedWords = new Map();
        this.history = [];
        this.nextZIndex = 1;
        this.dragState = {
            isDragging: false,
            type: null,
            wordId: null,
            text: '',
            startX: 0,
            startY: 0,
            offsetX: 0,
            offsetY: 0
        };
        this.dragGhost = null;
        this.currentHighlightCell = null;
        this.gridEl = gridEl;
        this.placedWordsEl = placedWordsEl;
        this.gridContainerEl = gridContainerEl;
        this.initializeGrid();
    }
    initializeGrid() {
        this.cells = [];
        for (let y = 0; y < GRID_ROWS; y++) {
            const row = [];
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
    setCallbacks(onWordPlaced, onWordMoved, onWordSelected, onHistoryChanged) {
        this.onWordPlaced = onWordPlaced;
        this.onWordMoved = onWordMoved;
        this.onWordSelected = onWordSelected;
        this.onHistoryChanged = onHistoryChanged;
    }
    getPlacedWords() {
        return Array.from(this.placedWords.values());
    }
    getWordById(id) {
        return this.placedWords.get(id);
    }
    updateWord(id, updates) {
        const word = this.placedWords.get(id);
        if (!word)
            return;
        const before = {
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
    saveHistory() {
        const state = {
            placedWords: Array.from(this.placedWords.values()).map(w => ({ ...w })),
            nextZIndex: this.nextZIndex
        };
        if (this.history.length >= MAX_HISTORY) {
            this.history.shift();
        }
        this.history.push(state);
        this.onHistoryChanged?.(this.history.length > 0);
    }
    undo() {
        if (this.history.length === 0)
            return;
        const lastState = this.history.pop();
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
    clear() {
        if (this.placedWords.size === 0)
            return;
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
    canUndo() {
        return this.history.length > 0;
    }
    startNewWordDrag(text, clientX, clientY) {
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
    startExistingWordDrag(wordId, clientX, clientY) {
        const word = this.placedWords.get(wordId);
        if (!word)
            return;
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
        const el = this.placedWordsEl.querySelector(`[data-id="${wordId}"]`);
        if (el)
            el.classList.add('dragging');
    }
    handleDragMove(clientX, clientY) {
        if (!this.dragState.isDragging)
            return;
        if (this.dragGhost) {
            this.dragGhost.style.left = `${clientX - 30}px`;
            this.dragGhost.style.top = `${clientY - 20}px`;
        }
        if (this.dragState.type === 'existing' && this.dragState.wordId) {
            const el = this.placedWordsEl.querySelector(`[data-id="${this.dragState.wordId}"]`);
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
    handleDragEnd(clientX, clientY) {
        if (!this.dragState.isDragging)
            return;
        const gridPos = this.getGridPosition(clientX, clientY);
        this.clearHighlight();
        if (gridPos.x >= 0 && gridPos.x < GRID_COLS && gridPos.y >= 0 && gridPos.y < GRID_ROWS) {
            if (this.dragState.type === 'new') {
                this.placeNewWord(this.dragState.text, gridPos.x, gridPos.y);
            }
            else if (this.dragState.type === 'existing' && this.dragState.wordId) {
                this.moveExistingWord(this.dragState.wordId, gridPos.x, gridPos.y);
            }
        }
        else if (this.dragState.type === 'existing' && this.dragState.wordId) {
            const word = this.placedWords.get(this.dragState.wordId);
            if (word) {
                const el = this.placedWordsEl.querySelector(`[data-id="${this.dragState.wordId}"]`);
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
    isDragging() {
        return this.dragState.isDragging;
    }
    placeNewWord(text, gridX, gridY) {
        if (this.cells[gridY][gridX].occupied)
            return;
        this.saveHistory();
        const id = `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const word = {
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
    moveExistingWord(wordId, newX, newY) {
        const word = this.placedWords.get(wordId);
        if (!word)
            return;
        if (newX === word.gridX && newY === word.gridY) {
            const el = this.placedWordsEl.querySelector(`[data-id="${wordId}"]`);
            if (el) {
                el.classList.remove('dragging');
                el.style.left = `${word.gridX * CELL_SIZE}px`;
                el.style.top = `${word.gridY * CELL_SIZE}px`;
            }
            return;
        }
        if (this.cells[newY][newX].occupied && this.cells[newY][newX].wordId !== wordId)
            return;
        this.saveHistory();
        const fromX = word.gridX;
        const fromY = word.gridY;
        this.cells[fromY][fromX].occupied = false;
        this.cells[fromY][fromX].wordId = null;
        this.cells[newY][newX].occupied = true;
        this.cells[newY][newX].wordId = wordId;
        word.gridX = newX;
        word.gridY = newY;
        const el = this.placedWordsEl.querySelector(`[data-id="${wordId}"]`);
        if (el) {
            el.classList.remove('dragging');
            el.style.left = `${newX * CELL_SIZE}px`;
            el.style.top = `${newY * CELL_SIZE}px`;
        }
        this.onWordMoved?.(word, fromX, fromY);
    }
    createWordElement(word) {
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
    applyWordTransforms(el, word) {
        el.style.transform = `rotate(${word.rotation}deg) scale(${word.scale})`;
        el.style.opacity = String(word.opacity);
        el.style.zIndex = String(word.zIndex);
    }
    renderWord(word) {
        const el = this.placedWordsEl.querySelector(`[data-id="${word.id}"]`);
        if (el) {
            this.applyWordTransforms(el, word);
        }
    }
    selectWord(wordId) {
        const prevSelected = this.placedWordsEl.querySelector('.placed-word.selected');
        if (prevSelected)
            prevSelected.classList.remove('selected');
        if (wordId) {
            const el = this.placedWordsEl.querySelector(`[data-id="${wordId}"]`);
            if (el)
                el.classList.add('selected');
            this.onWordSelected?.(this.placedWords.get(wordId) ?? null);
        }
        else {
            this.onWordSelected?.(null);
        }
    }
    bringToFront(wordId) {
        const word = this.placedWords.get(wordId);
        if (!word)
            return;
        this.saveHistory();
        word.zIndex = this.nextZIndex++;
        this.renderWord(word);
    }
    createDragGhost(text, x, y) {
        this.dragGhost = document.createElement('div');
        this.dragGhost.className = 'drag-ghost';
        this.dragGhost.textContent = text;
        this.dragGhost.style.left = `${x - 30}px`;
        this.dragGhost.style.top = `${y - 20}px`;
        document.body.appendChild(this.dragGhost);
    }
    removeDragGhost() {
        if (this.dragGhost && this.dragGhost.parentNode) {
            this.dragGhost.parentNode.removeChild(this.dragGhost);
        }
        this.dragGhost = null;
    }
    getGridRect() {
        const gridEl = this.gridEl;
        return gridEl.getBoundingClientRect();
    }
    getGridPosition(clientX, clientY) {
        const rect = this.getGridRect();
        const x = Math.floor((clientX - rect.left) / CELL_SIZE);
        const y = Math.floor((clientY - rect.top) / CELL_SIZE);
        return { x, y };
    }
    highlightCell(x, y) {
        this.clearHighlight();
        if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS)
            return;
        if (this.cells[y][x].occupied)
            return;
        const cell = this.gridEl.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (cell) {
            cell.classList.add('highlight');
            this.currentHighlightCell = cell;
        }
    }
    clearHighlight() {
        if (this.currentHighlightCell) {
            this.currentHighlightCell.classList.remove('highlight');
            this.currentHighlightCell = null;
        }
    }
}
