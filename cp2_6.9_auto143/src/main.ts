import './styles.css';
import { PlacedWord, DEFAULT_WORD_POOL } from './types';
import { GridManager } from './grid';
import { ControlsManager } from './controls';
import { exportToPNG } from './export';

function getRandomWords(count: number): string[] {
  const shuffled = [...DEFAULT_WORD_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function init(): void {
  const gridEl = document.getElementById('grid') as HTMLElement;
  const placedWordsEl = document.getElementById('placed-words') as HTMLElement;
  const gridContainerEl = document.getElementById('grid-container') as HTMLElement;
  const wordListEl = document.getElementById('word-list') as HTMLElement;
  const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
  const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
  const btnExport = document.getElementById('btn-export') as HTMLButtonElement;

  if (!gridEl || !placedWordsEl || !gridContainerEl || !wordListEl || !btnClear || !btnUndo || !btnExport) {
    console.error('Required DOM elements not found');
    return;
  }

  const gridManager = new GridManager(gridEl, placedWordsEl, gridContainerEl);
  const controlsManager = new ControlsManager(gridManager, placedWordsEl);

  gridManager.setCallbacks(
    (word: PlacedWord) => {},
    (word: PlacedWord, fromX: number, fromY: number) => {},
    (word: PlacedWord | null) => {},
    (canUndo: boolean) => {
      btnUndo.disabled = !canUndo;
      btnUndo.style.opacity = canUndo ? '1' : '0.5';
      btnUndo.style.cursor = canUndo ? 'pointer' : 'not-allowed';
    }
  );

  const words = getRandomWords(20);
  for (const word of words) {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.textContent = word;
    card.draggable = false;
    wordListEl.appendChild(card);
  }

  let draggingWordCard: HTMLElement | null = null;

  wordListEl.addEventListener('mousedown', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('word-card')) {
      e.preventDefault();
      draggingWordCard = target;
      target.classList.add('dragging');
      gridManager.startNewWordDrag(target.textContent || '', e.clientX, e.clientY);
    }
  });

  placedWordsEl.addEventListener('mousedown', (e: MouseEvent) => {
    const handle = (e.target as HTMLElement).closest('.control-handle') as HTMLElement | null;
    const wordEl = (e.target as HTMLElement).closest('.placed-word') as HTMLElement | null;

    if (handle && wordEl) {
      e.preventDefault();
      e.stopPropagation();
      const wordId = wordEl.dataset.id;
      const handleType = handle.dataset.handle as 'rotate' | 'scale' | 'opacity' | 'zindex';
      if (wordId && handleType) {
        controlsManager.startInteraction(wordId, handleType, e.clientX, e.clientY);
      }
      return;
    }

    if (wordEl) {
      e.preventDefault();
      const wordId = wordEl.dataset.id;
      if (wordId) {
        gridManager.startExistingWordDrag(wordId, e.clientX, e.clientY);
      }
    }
  });

  placedWordsEl.addEventListener('dblclick', (e: MouseEvent) => {
    const wordEl = (e.target as HTMLElement).closest('.placed-word') as HTMLElement | null;
    if (wordEl) {
      const wordId = wordEl.dataset.id;
      if (wordId) {
        e.preventDefault();
        controlsManager.handleDoubleClick(wordId, e.clientX, e.clientY);
      }
    }
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (controlsManager.isActive()) {
      controlsManager.handleMove(e.clientX, e.clientY);
    } else if (gridManager.isDragging()) {
      gridManager.handleDragMove(e.clientX, e.clientY);
    }
  });

  document.addEventListener('mouseup', (e: MouseEvent) => {
    if (controlsManager.isActive()) {
      controlsManager.endInteraction();
    } else if (gridManager.isDragging()) {
      gridManager.handleDragEnd(e.clientX, e.clientY);
    }

    if (draggingWordCard) {
      draggingWordCard.classList.remove('dragging');
      draggingWordCard = null;
    }
  });

  document.addEventListener('mousedown', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const inPlacedWord = target.closest('.placed-word');
    const inWordPanel = target.closest('.word-panel');
    const inToolbar = target.closest('.toolbar');

    if (!inPlacedWord && !inWordPanel && !inToolbar) {
      controlsManager.handleClickOutside();
    }
  });

  btnClear.addEventListener('click', () => {
    if (confirm('确定要清空画布吗？')) {
      gridManager.clear();
    }
  });

  btnUndo.addEventListener('click', () => {
    gridManager.undo();
  });

  btnExport.addEventListener('click', async () => {
    btnExport.disabled = true;
    btnExport.textContent = '导出中...';
    try {
      await exportToPNG(gridManager.getPlacedWords());
    } catch (err) {
      console.error('Export failed:', err);
      alert('导出失败，请重试');
    } finally {
      btnExport.disabled = false;
      btnExport.textContent = '导出 PNG';
    }
  });

  btnUndo.disabled = true;
  btnUndo.style.opacity = '0.5';
  btnUndo.style.cursor = 'not-allowed';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
