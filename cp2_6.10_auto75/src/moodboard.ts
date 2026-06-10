import type { BoardManager, TextEntry, ImageEntry, ColorEntry, BoardEntry, EntryType } from './board';

const GRID_SIZE = 9;
const MAX_PER_TYPE = 3;
const POPIN_INTERVAL_MS = 100;

type MoodboardCell = BoardEntry | null;

interface CellPosition {
  row: number;
  col: number;
}

export class MoodboardGenerator {
  private board: BoardManager;
  private grid: HTMLElement;
  private cells: MoodboardCell[] = new Array(GRID_SIZE).fill(null);
  private cellElements: (HTMLElement | null)[] = new Array(GRID_SIZE).fill(null);

  private dragSrcIndex: number | null = null;
  private touchSrcIndex: number | null = null;
  private touchStartPos: { x: number; y: number } | null = null;

  constructor(boardManager: BoardManager, gridId: string) {
    this.board = boardManager;
    const g = document.getElementById(gridId);
    if (!g) {
      throw new Error('Moodboard grid container not found');
    }
    this.grid = g;
    this.buildGridStructure();
  }

  private buildGridStructure(): void {
    this.grid.innerHTML = '';
    for (let i = 0; i < GRID_SIZE; i += 1) {
      const cell = document.createElement('div');
      cell.className = 'moodboard-cell';
      cell.dataset.index = String(i);
      this.attachCellDropHandlers(cell, i);
      this.grid.appendChild(cell);
    }
  }

  generate(): void {
    this.clearWithoutRefill(false);

    const texts = this.board.getRandomTexts(MAX_PER_TYPE);
    const images = this.board.getRandomImages(MAX_PER_TYPE);
    const colors = this.board.getRandomColors(MAX_PER_TYPE);

    const allEntries: BoardEntry[] = [...texts, ...images, ...colors];

    const positions = this.distributePositions(texts.length, images.length, colors.length);

    for (let i = 0; i < positions.length; i += 1) {
      const pos = positions[i];
      const entry = allEntries[i];
      if (entry && pos !== undefined) {
        this.cells[pos] = entry;
      }
    }

    this.renderWithAnimation();
  }

  private distributePositions(textCount: number, imageCount: number, colorCount: number): number[] {
    const typePatterns: number[] = [];
    for (let i = 0; i < textCount; i += 1) typePatterns.push(0);
    for (let i = 0; i < imageCount; i += 1) typePatterns.push(1);
    for (let i = 0; i < colorCount; i += 1) typePatterns.push(2);

    const positions: number[] = [];
    const used = new Set<number>();
    let attempts = 0;
    const maxAttempts = 200;

    while (typePatterns.length > 0 && attempts < maxAttempts) {
      const shuffledTypes = this.shuffle(typePatterns);
      let placed = this.tryPlaceAll(shuffledTypes, used, positions);
      if (placed) break;
      used.clear();
      positions.length = 0;
      attempts += 1;
    }

    if (positions.length === 0 && typePatterns.length > 0) {
      const allIdx = this.shuffle(Array.from({ length: GRID_SIZE }, (k) => k));
      for (let i = 0; i < Math.min(typePatterns.length, allIdx.length); i += 1) {
        positions.push(allIdx[i]);
      }
    }

    return positions;
  }

  private tryPlaceAll(
    typePatterns: number[],
    used: Set<number>,
    positions: number[]
  ): boolean {
    for (const type of typePatterns) {
      const candidates: number[] = [];
      for (let i = 0; i < GRID_SIZE; i += 1) {
        if (
          !used.has(i) && !this.hasAdjacentSameType(i, type, positions, typePatterns, used)) {
          candidates.push(i);
        }
      }
      if (candidates.length === 0) {
        for (let i = 0; i < GRID_SIZE; i += 1) {
          if (!used.has(i)) candidates.push(i);
        }
      }
      if (candidates.length === 0) return false;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      used.add(pick);
      positions.push(pick);
    }
    return true;
  }

  private hasAdjacentSameType(
    idx: number,
    currentType: number,
    placedPositions: number[],
    _typePatterns: number[],
    _used: Set<number>
  ): boolean {
    const row = Math.floor(idx / 3);
    const col = idx % 3;

    const neighbors: number[] = [];
    if (row > 0) neighbors.push(idx - 3);
    if (row < 2) neighbors.push(idx + 3);
    if (col > 0) neighbors.push(idx - 1);
    if (col < 2) neighbors.push(idx + 1);

    let sameTypeCount = 0;
    for (const n of neighbors) {
      const placedIdx = placedPositions.indexOf(n);
      if (placedIdx !== -1) {
        const typeAtPos = this.getTypeAtPosition(placedPositions, placedIdx);
        if (typeAtPos === currentType) sameTypeCount += 1;
      }
    }
    return sameTypeCount >= 2;
  }

  private getTypeAtPosition(positions: number[], _posIdx: number): number {
    const total = positions.length;
    const textEnd = Math.min(MAX_PER_TYPE, this.countTypes().text);
    const imageEnd = textEnd + Math.min(MAX_PER_TYPE, this.countTypes().image);
    if (_posIdx < textEnd) return 0;
    if (_posIdx < imageEnd) return 1;
    if (_posIdx < total) return 2;
    return -1;
  }

  private countTypes(): { text: number; image: number; color: number } {
    let text = 0;
    let image = 0;
    let color = 0;
    for (const c of this.cells) {
      if (!c) continue;
      if (c.type === 'text') text += 1;
      else if (c.type === 'image') image += 1;
      else if (c.type === 'color') color += 1;
    }
    return { text, image, color };
  }

  private shuffle<T>(arr: readonly T[]): T[] {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private renderWithAnimation(): void {
    const cellNodes = this.grid.querySelectorAll('.moodboard-cell');
    cellNodes.forEach((node => {
      const content = node.querySelector('.moodboard-card');
      if (content) content.remove();
    });

    let animOffset = 0;
    for (let i = 0; i < GRID_SIZE; i += 1) {
      const entry = this.cells[i];
      const cellEl = cellNodes[i] as HTMLElement;
      if (entry) {
        const card = this.createCard(entry, i);
        if (card) {
          card.style.animationDelay = `${animOffset * POPIN_INTERVAL_MS}ms`;
          cellEl.appendChild(card);
          this.cellElements[i] = card;
          animOffset += 1;
        }
      }
    }
  }

  private createCard(entry: BoardEntry, index: number): HTMLElement | null {
    const card = document.createElement('div');
    card.className = 'moodboard-card';
    card.draggable = true;
    card.dataset.index = String(index);
    card.dataset.entryId = entry.id;
    card.dataset.entryType = entry.type;

    this.attachCardDragHandlers(card, index);

    if (entry.type === 'text') {
      this.renderTextCard(card, entry);
    } else if (entry.type === 'image') {
      this.renderImageCard(card, entry);
    } else if (entry.type === 'color') {
      this.renderColorCard(card, entry);
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'mb-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = '移除并补充';
    removeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.removeAndReplace(index);
    });
    card.appendChild(removeBtn);

    return card;
  }

  private renderTextCard(card: HTMLElement, entry: TextEntry): void {
    const inner = document.createElement('div');
    inner.className = 'mb-text';
    inner.textContent = entry.content;
    inner.style.backgroundColor = entry.color;
    card.appendChild(inner);
  }

  private renderImageCard(card: HTMLElement, entry: ImageEntry): void {
    const img = document.createElement('img');
    img.className = 'mb-image';
    img.src = entry.url;
    img.alt = '情绪板图片';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.remove();
      const ph = document.createElement('div');
      ph.className = 'mb-image-placeholder';
      ph.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
        </svg>`;
      card.appendChild(ph);
    });
    card.appendChild(img);
  }

  private renderColorCard(card: HTMLElement, entry: ColorEntry): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'mb-color';
    const swatch = document.createElement('div');
    swatch.className = 'mb-color-swatch';
    swatch.style.backgroundColor = entry.hex;
    const code = document.createElement('div');
    code.className = 'mb-color-code';
    code.textContent = entry.hex;
    wrapper.appendChild(swatch);
    wrapper.appendChild(code);
    card.appendChild(wrapper);
  }

  private attachCardDragHandlers(card: HTMLElement, index: number): void {
    card.addEventListener('dragstart', (ev) => {
      this.dragSrcIndex = index;
      card.classList.add('dragging');
      if (ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', String(index));
      }
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      this.dragSrcIndex = null;
      this.clearDragOver();
    });

    card.addEventListener('touchstart', (ev) => {
      const touch = ev.touches[0];
      this.touchSrcIndex = index;
      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
      card.classList.add('dragging');
    }, { passive: true });

    card.addEventListener('touchmove', (ev) => {
      if (!this.touchStartPos) return;
      ev.preventDefault();
    }, { passive: false });

    card.addEventListener('touchend', (ev) => {
      if (ev.preventDefault();
      if (this.touchSrcIndex === null || !this.touchStartPos) return;
      const touch = ev.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetCell = target?.closest('.moodboard-cell');
      if (targetCell && targetCell !== card.parentElement) {
        const targetIdx = Number((targetCell as HTMLElement).dataset.index);
        if (!Number.isNaN(targetIdx) && targetIdx !== this.touchSrcIndex) {
          this.swapItems(this.touchSrcIndex, targetIdx);
        }
      }
      card.classList.remove('dragging');
      this.touchSrcIndex = null;
      this.touchStartPos = null;
      this.clearDragOver();
    });
  }

  private attachCellDropHandlers(cell: HTMLElement, index: number): void {
    cell.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      if (ev.dataTransfer) {
        ev.dataTransfer.dropEffect = 'move';
      }
      cell.classList.add('drag-over');
    });
    cell.addEventListener('dragleave', () => {
      cell.classList.remove('drag-over');
    });
    cell.addEventListener('drop', (ev) => {
      ev.preventDefault();
      cell.classList.remove('drag-over');
      if (this.dragSrcIndex !== null && this.dragSrcIndex !== index) {
        this.swapItems(this.dragSrcIndex, index);
      }
    });
  }

  private clearDragOver(): void {
    this.grid.querySelectorAll('.moodboard-cell.drag-over').forEach((el) => {
      el.classList.remove('drag-over');
    });
  }

  swapItems(a: number, b: number): void {
    if (a === b) return;
    if (a < 0 || a >= GRID_SIZE || b < 0 || b >= GRID_SIZE) return;

    const tempEntry = this.cells[a];
    this.cells[a] = this.cells[b];
    this.cells[b] = tempEntry;

    const cellNodes = this.grid.querySelectorAll('.moodboard-cell');
    const cellA = cellNodes[a] as HTMLElement;
    const cellB = cellNodes[b] as HTMLElement;
    const cardA = this.cellElements[a];
    const cardB = this.cellElements[b];

    if (cardA) {
      cardA.classList.add('swapping');
    }
    if (cardB) {
      cardB.classList.add('swapping');
    }

    const fragA = cardA ? cardA.cloneNode(true) : null;
    const fragB = cardB ? cardB.cloneNode(true) : null;

    if (cardA) cardA.remove();
    if (cardB) cardB.remove();

    if (fragB) {
      const newCardB = fragB as HTMLElement;
      newCardB.dataset.index = String(a);
      this.attachCardDragHandlers(newCardB, a);
      const removeBtnB = newCardB.querySelector('.mb-remove') as HTMLButtonElement | null;
      if (removeBtnB) {
        removeBtnB.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.removeAndReplace(a);
        });
      }
      cellA.appendChild(newCardB);
      this.cellElements[a] = newCardB;
    } else {
      this.cellElements[a] = null;
    }

    if (fragA) {
      const newCardA = fragA as HTMLElement;
      newCardA.dataset.index = String(b);
      this.attachCardDragHandlers(newCardA, b);
      const removeBtnA = newCardA.querySelector('.mb-remove') as HTMLButtonElement | null;
      if (removeBtnA) {
        removeBtnA.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.removeAndReplace(b);
        });
      }
      cellB.appendChild(newCardA);
      this.cellElements[b] = newCardA;
    } else {
      this.cellElements[b] = null;
    }
  }

  removeAndReplace(index: number): void {
    if (index < 0 || index >= GRID_SIZE) return;
    const currentEntry = this.cells[index];
    if (!currentEntry) return;

    const currentType: EntryType = currentEntry.type;
    const excludeIds = new Set<string>();
    for (const c of this.cells) {
      if (c) {
        if (c.type === currentType) {
          excludeIds.add(c.id);
        }
      }
    }

    let replacement: BoardEntry | null = null;
    if (currentType === 'text') {
      replacement = this.board.getOneRandomText(excludeIds);
    } else if (currentType === 'image') {
      replacement = this.board.getOneRandomImage(excludeIds);
    } else if (currentType === 'color') {
      replacement = this.board.getOneRandomColor(excludeIds);
    }

    if (!replacement) {
      if (currentType === 'text') {
        replacement = this.board.getOneRandomText();
      } else if (currentType === 'image') {
        replacement = this.board.getOneRandomImage();
      } else if (currentType === 'color') {
        replacement = this.board.getOneRandomColor();
      }
    }

    const cellNodes = this.grid.querySelectorAll('.moodboard-cell')[index] as HTMLElement;
    const oldCard = this.cellElements[index];
    if (oldCard) {
      oldCard.classList.add('clearing');
      setTimeout(() => {
        if (replacement) {
          oldCard.remove();
          this.cells[index] = replacement;
          const newCard = this.createCard(replacement, index);
          if (newCard) {
            newCard.classList.add('replacing');
            cellNodes.appendChild(newCard);
            this.cellElements[index] = newCard;
          }
        } else {
          oldCard.remove();
          this.cells[index] = null;
          this.cellElements[index] = null;
        }
      }, 180);
    } else if (replacement) {
      this.cells[index] = replacement;
      const newCard = this.createCard(replacement, index);
      if (newCard) {
        newCard.classList.add('replacing');
        cellNodes.appendChild(newCard);
        this.cellElements[index] = newCard;
      }
    }
  }

  clear(refill: boolean = true): void {
    this.clearWithoutRefill(true);
    if (refill) {
      setTimeout(() => this.generate(), 220);
    }
  }

  private clearWithoutRefill(animate: boolean): void {
    if (animate) {
      for (let i = 0; i < GRID_SIZE; i += 1) {
        const card = this.cellElements[i];
        if (card) {
          card.classList.add('clearing');
        }
      }
      setTimeout(() => {
        this.cells = new Array(GRID_SIZE).fill(null);
        this.cellElements = new Array(GRID_SIZE).fill(null);
        const cellNodes = this.grid.querySelectorAll('.moodboard-cell');
        cellNodes.forEach((node) => {
          const content = node.querySelector('.moodboard-card');
          if (content) content.remove();
        });
      }, 220);
    } else {
      this.cells = new Array(GRID_SIZE).fill(null);
      this.cellElements = new Array(GRID_SIZE).fill(null);
      const cellNodes = this.grid.querySelectorAll('.moodboard-cell');
      cellNodes.forEach((node) => {
        const content = node.querySelector('.moodboard-card');
        if (content) content.remove();
      });
    }
  }

  exportSVG(): string {
    const cellSize = 200;
    const gap = 16;
    const padding = 24;
    const boardSize = cellSize * 3 + gap * 2 + padding * 2;

    let svgContent = '';
    svgContent += `<svg xmlns="http://www.w3.org/2000/svg" width="${boardSize}" height="${boardSize}" viewBox="0 0 ${boardSize} ${boardSize}">`;
    svgContent += `<rect width="100%" height="100%" fill="#ffffff"/>`;

    for (let i = 0; i < GRID_SIZE; i += 1) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = padding + col * (cellSize + gap);
      const y = padding + row * (cellSize + gap);
      const entry = this.cells[i];
      if (!entry) continue;

      svgContent += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="8" fill="#f5f6f8"/>`;

      if (entry.type === 'text') {
        const tEntry = entry as TextEntry;
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;
        const r = cellSize * 0.42;
        svgContent += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${tEntry.color}"/>`;
        const textLines = this.wrapText(tEntry.content, 14);
        const lineHeight = 18;
        const startY = cy - ((textLines.length - 1) * lineHeight / 2 + 6;
        textLines.forEach((line, lineIdx) => {
          svgContent += `<text x="${cx}" y="${startY + lineIdx * lineHeight}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="500" fill="#2d3436">${this.escapeXml(line)}</text>`;
        });
      } else if (entry.type === 'image') {
        const iEntry = entry as ImageEntry;
        svgContent += `<image x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" href="${this.escapeXml(iEntry.url)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#rounded-clip-${i})"/>`;
        svgContent += `<defs><clipPath id="rounded-clip-${i}"><rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="8"/></clipPath></defs>`;
      } else if (entry.type === 'color') {
        const cEntry = entry as ColorEntry;
        const swatchSize = cellSize * 0.82;
        const sx = x + (cellSize - swatchSize) / 2;
        const sy = y + (cellSize - swatchSize) / 2;
        svgContent += `<rect x="${sx}" y="${sy}" width="${swatchSize}" height="${swatchSize * 0.78}" rx="8" fill="${cEntry.hex}"/>`;
        const codeY = y + cellSize - 16;
        svgContent += `<text x="${x + cellSize / 2}" y="${codeY}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="600" fill="#2d3436">${cEntry.hex}</text>`;
      }
    }

    svgContent += '</svg>';
    return svgContent;
  }

  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const result: string[] = [];
    let current = '';
    for (const ch of text) {
      if (current.length >= maxCharsPerLine) {
        result.push(current);
        current = '';
      }
      current += ch;
    }
    if (current) result.push(current);
    return result.slice(0, 3);
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
