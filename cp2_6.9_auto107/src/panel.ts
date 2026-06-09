import { BrickManager } from './brickManager';
import { Brick, BrickType, BRICK_COLORS, BRICK_TYPE_LABELS } from './types';

export class PanelManager {
  private brickManager: BrickManager;
  private app: HTMLElement;
  private toolPanel: HTMLElement | null = null;
  private listPanel: HTMLElement | null = null;
  private brickListEl: HTMLElement | null = null;
  private miniPanel: HTMLElement | null = null;
  private colorSwatches: Map<string, HTMLElement> = new Map();
  private selectedBrickId: string | null = null;
  private onUndoCallback: (() => void) | null = null;
  private onDeleteCallback: ((id: string) => void) | null = null;
  private onDuplicateCallback: ((id: string) => void) | null = null;
  private onRotateCallback: ((id: string) => void) | null = null;

  constructor(brickManager: BrickManager) {
    this.brickManager = brickManager;
    this.app = document.getElementById('app')!;
    this.init();
  }

  private init(): void {
    this.createToolPanel();
    this.createBrickListPanel();
    this.createMiniPanel();
    this.brickManager.subscribe(() => this.renderBrickList());
    this.renderBrickList();
  }

  private createToolPanel(): void {
    this.toolPanel = document.createElement('div');
    this.toolPanel.className = 'tool-panel';

    const typeSection = document.createElement('div');
    typeSection.className = 'panel-section';

    const typeTitle = document.createElement('div');
    typeTitle.className = 'panel-title';
    typeTitle.textContent = '积木类型';
    typeSection.appendChild(typeTitle);

    const select = document.createElement('select');
    select.className = 'brick-select';
    Object.values(BrickType).forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = BRICK_TYPE_LABELS[type];
      select.appendChild(option);
    });
    select.value = this.brickManager.getCurrentBrick();
    select.addEventListener('change', (e) => {
      const type = (e.target as HTMLSelectElement).value as BrickType;
      this.brickManager.setCurrentBrick(type);
      document.body.classList.add('dragging');
    });
    typeSection.appendChild(select);

    this.toolPanel.appendChild(typeSection);

    const colorSection = document.createElement('div');
    colorSection.className = 'panel-section';

    const colorTitle = document.createElement('div');
    colorTitle.className = 'panel-title';
    colorTitle.textContent = '积木颜色';
    colorSection.appendChild(colorTitle);

    const colorList = document.createElement('div');
    colorList.className = 'color-list';

    BRICK_COLORS.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      if (color === '#FFFFFF') {
        swatch.classList.add('white-swatch');
      }
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.title = color;

      if (color === this.brickManager.getCurrentColor()) {
        swatch.classList.add('selected');
      }

      swatch.addEventListener('click', () => {
        this.colorSwatches.forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        this.brickManager.setCurrentColor(color);
        document.body.classList.add('dragging');
      });

      colorList.appendChild(swatch);
      this.colorSwatches.set(color, swatch);
    });

    colorSection.appendChild(colorList);
    this.toolPanel.appendChild(colorSection);

    const hintSection = document.createElement('div');
    hintSection.className = 'panel-section';
    const hint = document.createElement('div');
    hint.className = 'hint-text';
    hint.innerHTML = '选择类型和颜色后<br>点击场景放置积木<br>Ctrl+Z 撤销操作';
    hintSection.appendChild(hint);
    this.toolPanel.appendChild(hintSection);

    this.app.appendChild(this.toolPanel);
  }

  private createBrickListPanel(): void {
    this.listPanel = document.createElement('div');
    this.listPanel.className = 'brick-list-panel';

    const header = document.createElement('div');
    header.className = 'list-header';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.style.marginBottom = '0';
    title.textContent = '积木列表';
    header.appendChild(title);

    const undoBtn = document.createElement('button');
    undoBtn.className = 'undo-btn';
    undoBtn.innerHTML = '↶ 撤销';
    undoBtn.disabled = !this.brickManager.canUndo();
    undoBtn.addEventListener('click', () => {
      if (this.onUndoCallback) this.onUndoCallback();
    });
    header.appendChild(undoBtn);

    this.listPanel.appendChild(header);

    this.brickListEl = document.createElement('div');
    this.brickListEl.className = 'brick-list';
    this.listPanel.appendChild(this.brickListEl);

    this.app.appendChild(this.listPanel);

    setInterval(() => {
      undoBtn.disabled = !this.brickManager.canUndo();
    }, 100);
  }

  private createMiniPanel(): void {
    this.miniPanel = document.createElement('div');
    this.miniPanel.className = 'mini-panel';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'mini-btn';
    deleteBtn.innerHTML = '🗑';
    deleteBtn.title = '删除';
    deleteBtn.addEventListener('click', () => {
      if (this.selectedBrickId && this.onDeleteCallback) {
        this.onDeleteCallback(this.selectedBrickId);
        this.hideMiniPanel();
      }
    });
    this.miniPanel.appendChild(deleteBtn);

    const duplicateBtn = document.createElement('button');
    duplicateBtn.className = 'mini-btn';
    duplicateBtn.innerHTML = '📋';
    duplicateBtn.title = '复制';
    duplicateBtn.addEventListener('click', () => {
      if (this.selectedBrickId && this.onDuplicateCallback) {
        this.onDuplicateCallback(this.selectedBrickId);
        this.hideMiniPanel();
      }
    });
    this.miniPanel.appendChild(duplicateBtn);

    const rotateBtn = document.createElement('button');
    rotateBtn.className = 'mini-btn';
    rotateBtn.innerHTML = '↻';
    rotateBtn.title = '旋转90°';
    rotateBtn.addEventListener('click', () => {
      if (this.selectedBrickId && this.onRotateCallback) {
        this.onRotateCallback(this.selectedBrickId);
      }
    });
    this.miniPanel.appendChild(rotateBtn);

    this.app.appendChild(this.miniPanel);
  }

  private renderBrickList(): void {
    if (!this.brickListEl) return;

    const bricks = this.brickManager.getBricks();
    this.brickListEl.innerHTML = '';

    if (bricks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '暂无积木，开始搭建吧！';
      this.brickListEl.appendChild(empty);
      return;
    }

    bricks.forEach((brick, index) => {
      const item = this.createBrickItem(brick, index);
      this.brickListEl!.appendChild(item);
    });
  }

  private createBrickItem(brick: Brick, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'brick-item';
    item.dataset.brickId = brick.id;

    const colorBox = document.createElement('div');
    colorBox.className = 'brick-item-color';
    colorBox.style.backgroundColor = brick.color;
    if (brick.color === '#FFFFFF') {
      colorBox.style.border = '1px solid #ddd';
    }
    item.appendChild(colorBox);

    const info = document.createElement('div');
    info.className = 'brick-item-info';

    const typeLabel = document.createElement('div');
    typeLabel.className = 'brick-item-type';
    typeLabel.textContent = `${index + 1}. ${BRICK_TYPE_LABELS[brick.type]}`;
    info.appendChild(typeLabel);

    const posLabel = document.createElement('div');
    posLabel.className = 'brick-item-pos';
    posLabel.textContent = `(${brick.position.x.toFixed(1)}, ${brick.position.y.toFixed(2)}, ${brick.position.z.toFixed(1)})`;
    info.appendChild(posLabel);

    item.appendChild(info);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '✕';
    deleteBtn.title = '删除';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onDeleteCallback) {
        this.onDeleteCallback(brick.id);
      }
    });
    item.appendChild(deleteBtn);

    return item;
  }

  showMiniPanel(brickId: string, screenX: number, screenY: number): void {
    if (!this.miniPanel) return;
    this.selectedBrickId = brickId;
    this.miniPanel.style.display = 'flex';
    this.miniPanel.style.left = `${screenX - 56}px`;
    this.miniPanel.style.top = `${screenY - 60}px`;
  }

  hideMiniPanel(): void {
    if (!this.miniPanel) return;
    this.selectedBrickId = null;
    this.miniPanel.style.display = 'none';
  }

  isMiniPanelVisible(): boolean {
    return this.miniPanel?.style.display === 'flex';
  }

  setOnUndo(callback: () => void): void {
    this.onUndoCallback = callback;
  }

  setOnDelete(callback: (id: string) => void): void {
    this.onDeleteCallback = callback;
  }

  setOnDuplicate(callback: (id: string) => void): void {
    this.onDuplicateCallback = callback;
  }

  setOnRotate(callback: (id: string) => void): void {
    this.onRotateCallback = callback;
  }

  setDraggingCursor(active: boolean): void {
    if (active) {
      document.body.classList.add('dragging');
    } else {
      document.body.classList.remove('dragging');
    }
  }

  isPointerOnPanel(x: number, y: number): boolean {
    const panels = [this.toolPanel, this.listPanel, this.miniPanel];
    for (const panel of panels) {
      if (!panel) continue;
      const rect = panel.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return true;
      }
    }
    return false;
  }
}
