import type { LevelEditor, BlockType } from './levelEditor';

export class Toolbar {
  private editor: LevelEditor;
  private blockButtons: NodeListOf<HTMLButtonElement>;
  private undoBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private exportBtn: HTMLButtonElement;
  private exportTip: HTMLElement;
  private confirmDialog: HTMLElement;
  private confirmYes: HTMLButtonElement;
  private confirmNo: HTMLButtonElement;
  private currentToolEl: HTMLElement;
  private coordDisplay: HTMLElement;
  private tooltip: HTMLElement;

  constructor(editor: LevelEditor) {
    this.editor = editor;
    this.blockButtons = document.querySelectorAll('.block-btn');
    this.undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    this.exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    this.exportTip = document.getElementById('exportTip') as HTMLElement;
    this.confirmDialog = document.getElementById('confirmDialog') as HTMLElement;
    this.confirmYes = document.getElementById('confirmYes') as HTMLButtonElement;
    this.confirmNo = document.getElementById('confirmNo') as HTMLButtonElement;
    this.currentToolEl = document.getElementById('currentTool') as HTMLElement;
    this.coordDisplay = document.getElementById('coordDisplay') as HTMLElement;
    this.tooltip = document.getElementById('tooltip') as HTMLElement;

    this.bindEvents();
    this.updateUndoButton();
  }

  private bindEvents(): void {
    this.blockButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type as BlockType;
        this.selectTool(type);
      });
    });

    this.undoBtn.addEventListener('click', () => {
      this.editor.undo();
      this.updateUndoButton();
    });

    this.clearBtn.addEventListener('click', () => {
      this.showConfirmDialog();
    });

    this.confirmYes.addEventListener('click', () => {
      this.editor.clearAll();
      this.hideConfirmDialog();
      this.updateUndoButton();
    });

    this.confirmNo.addEventListener('click', () => {
      this.hideConfirmDialog();
    });

    this.exportBtn.addEventListener('click', async () => {
      await this.exportToClipboard();
    });

    this.setupTooltipEvents();
  }

  private setupTooltipEvents(): void {
    const canvas = document.getElementById('editorCanvas') as HTMLCanvasElement;

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const hoverCell = this.editor.getHoverCell();
      if (hoverCell) {
        const blockType = this.editor.getBlockAt(hoverCell.x, hoverCell.y);
        if (blockType !== null) {
          this.showTooltip(e, LevelEditor.getBlockName(blockType));
          return;
        }
      }
      this.hideTooltip();
    });

    canvas.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  }

  private showTooltip(e: MouseEvent, text: string): void {
    this.tooltip.textContent = text;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${e.clientX + 10}px`;
    this.tooltip.style.top = `${e.clientY - 10}px`;
    this.tooltip.style.transform = 'translateY(-100%)';
  }

  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }

  private selectTool(type: BlockType): void {
    this.blockButtons.forEach(btn => {
      if (btn.dataset.type === type) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
    this.editor.setSelectedTool(type);
    this.updateCurrentToolDisplay();
  }

  private updateCurrentToolDisplay(): void {
    const tool = this.editor.getSelectedTool();
    this.currentToolEl.textContent = `当前工具：${LevelEditor.getBlockName(tool)}`;
  }

  private updateUndoButton(): void {
    this.undoBtn.disabled = !this.editor.canUndo();
    this.undoBtn.classList.toggle('disabled', !this.editor.canUndo());
  }

  public updateCoordDisplay(x: number, y: number): void {
    if (x === -1 || y === -1) {
      this.coordDisplay.textContent = '坐标：(-, -)';
    } else {
      this.coordDisplay.textContent = `坐标：(${x}, ${y})`;
    }
  }

  public updateStatus(tool: BlockType, x: number, y: number): void {
    this.currentToolEl.textContent = `当前工具：${LevelEditor.getBlockName(tool)}`;
    this.updateCoordDisplay(x, y);
    this.updateUndoButton();
  }

  private showConfirmDialog(): void {
    this.confirmDialog.classList.remove('hidden');
  }

  private hideConfirmDialog(): void {
    this.confirmDialog.classList.add('hidden');
  }

  private async exportToClipboard(): Promise<void> {
    const json = this.editor.exportToJSON();
    try {
      await navigator.clipboard.writeText(json);
      this.showExportTip('已复制到剪贴板！', true);
    } catch {
      this.showExportTip('复制失败，请手动复制', false);
    }
  }

  private showExportTip(message: string, success: boolean): void {
    this.exportTip.textContent = message;
    this.exportTip.classList.add('show');
    this.exportTip.classList.toggle('success', success);
    this.exportTip.classList.toggle('error', !success);

    setTimeout(() => {
      this.exportTip.classList.remove('show');
    }, 1500);
  }

  public undo(): void {
    this.editor.undo();
    this.updateUndoButton();
  }
}
