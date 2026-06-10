import type { PaletteManager, PaletteColor, LogEntry, Member } from './paletteManager';

export interface UIControllerCallbacks {
  onApplyPalette: () => void;
  onExportPalette: () => void;
  onImportPalette: (file: File) => void;
}

export class UIController {
  private app: HTMLElement;
  private manager: PaletteManager;
  private callbacks: UIControllerCallbacks;
  private paletteList: HTMLElement | null = null;
  private operationLog: HTMLElement | null = null;
  private paletteSection: HTMLElement | null = null;
  private colorPicker: HTMLInputElement | null = null;
  private addBtn: HTMLButtonElement | null = null;
  private applyBtn: HTMLButtonElement | null = null;
  private exportBtn: HTMLButtonElement | null = null;
  private importBtn: HTMLButtonElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private dragIndex: number | null = null;
  private toasts: HTMLElement[] = [];

  constructor(app: HTMLElement, manager: PaletteManager, callbacks: UIControllerCallbacks) {
    this.app = app;
    this.manager = manager;
    this.callbacks = callbacks;
    this.buildDOM();
    this.bindEvents();
    this.subscribeManager();
    this.renderAll();
  }

  private buildDOM(): void {
    this.app.innerHTML = '';

    const membersPanel = document.createElement('div');
    membersPanel.className = 'members-panel';

    const membersList = document.createElement('div');
    membersList.className = 'members-list';

    const members = this.manager.getMembers();
    members.forEach(member => {
      const avatar = document.createElement('div');
      avatar.className = 'member-avatar';
      avatar.title = member.name;

      const dot = document.createElement('div');
      dot.className = 'member-dot';
      dot.style.background = member.color;

      avatar.appendChild(dot);
      membersList.appendChild(avatar);
    });

    this.operationLog = document.createElement('div');
    this.operationLog.className = 'operation-log';

    membersPanel.appendChild(membersList);
    membersPanel.appendChild(this.operationLog);

    const mainContainer = document.createElement('div');
    mainContainer.className = 'main-container';

    const canvasSection = document.createElement('div');
    canvasSection.className = 'canvas-section';

    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'canvas-wrapper pulse-overlay';
    canvasWrapper.id = 'canvasWrapper';

    const canvasActions = document.createElement('div');
    canvasActions.className = 'canvas-actions';

    this.applyBtn = document.createElement('button');
    this.applyBtn.className = 'btn';
    this.applyBtn.textContent = '应用色板替换';

    this.exportBtn = document.createElement('button');
    this.exportBtn.className = 'btn btn-secondary';
    this.exportBtn.textContent = '导出色板';

    this.importBtn = document.createElement('button');
    this.importBtn.className = 'btn btn-secondary';
    this.importBtn.textContent = '导入色板';

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json';
    this.fileInput.style.display = 'none';

    canvasActions.appendChild(this.applyBtn);
    canvasActions.appendChild(this.exportBtn);
    canvasActions.appendChild(this.importBtn);
    canvasActions.appendChild(this.fileInput);

    canvasSection.appendChild(canvasWrapper);
    canvasSection.appendChild(canvasActions);

    this.paletteSection = document.createElement('div');
    this.paletteSection.className = 'palette-section';

    const paletteHeader = document.createElement('div');
    paletteHeader.className = 'palette-header';

    const paletteTitle = document.createElement('h2');
    paletteTitle.textContent = '协作调色板';

    const colorAddRow = document.createElement('div');
    colorAddRow.className = 'color-add-row';

    const colorPickerWrapper = document.createElement('div');
    colorPickerWrapper.className = 'color-picker-wrapper';

    this.colorPicker = document.createElement('input');
    this.colorPicker.type = 'color';
    this.colorPicker.value = '#ff6b6b';

    colorPickerWrapper.appendChild(this.colorPicker);

    this.addBtn = document.createElement('button');
    this.addBtn.className = 'btn';
    this.addBtn.textContent = '添加颜色';

    colorAddRow.appendChild(colorPickerWrapper);
    colorAddRow.appendChild(this.addBtn);

    paletteHeader.appendChild(paletteTitle);
    paletteHeader.appendChild(colorAddRow);

    this.paletteList = document.createElement('div');
    this.paletteList.className = 'palette-list';

    this.paletteSection.appendChild(paletteHeader);
    this.paletteSection.appendChild(this.paletteList);

    mainContainer.appendChild(canvasSection);
    mainContainer.appendChild(this.paletteSection);

    this.app.appendChild(membersPanel);
    this.app.appendChild(mainContainer);
  }

  private bindEvents(): void {
    if (this.addBtn && this.colorPicker) {
      this.addBtn.addEventListener('click', () => {
        if (this.manager.isFull()) {
          this.showToast(`色板最多容纳${this.manager.getMaxColors()}种颜色`, 'warning');
          return;
        }
        const hex = this.colorPicker!.value;
        const added = this.manager.addColor(hex);
        if (added) {
          setTimeout(() => {
            if (this.paletteList) {
              this.paletteList.scrollTop = this.paletteList.scrollHeight;
            }
          }, 50);
        }
      });
    }

    if (this.applyBtn) {
      this.applyBtn.addEventListener('click', () => {
        this.callbacks.onApplyPalette();
      });
    }

    if (this.exportBtn) {
      this.exportBtn.addEventListener('click', () => {
        this.callbacks.onExportPalette();
      });
    }

    if (this.importBtn && this.fileInput) {
      this.importBtn.addEventListener('click', () => {
        this.fileInput!.click();
      });
      this.fileInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          this.callbacks.onImportPalette(target.files[0]);
          target.value = '';
        }
      });
    }

    window.addEventListener('resize', () => {
      this.renderPaletteList();
    });
  }

  private subscribeManager(): void {
    this.manager.subscribe(() => {
      this.renderPaletteList();
      this.updateAddButtonState();
    });

    this.manager.subscribeLogs(() => {
      this.renderLogs();
    });
  }

  private renderAll(): void {
    this.renderPaletteList();
    this.renderLogs();
    this.updateAddButtonState();
  }

  private renderPaletteList(): void {
    if (!this.paletteList) return;

    const colors = this.manager.getColors();
    this.paletteList.innerHTML = '';

    colors.forEach((color, index) => {
      const item = this.createPaletteItem(color, index);
      this.paletteList!.appendChild(item);
    });
  }

  private createPaletteItem(color: PaletteColor, index: number): HTMLElement {
    const item = document.createElement('div');
    item.className = 'palette-item';
    item.draggable = true;
    item.dataset.index = String(index);

    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = color.hex;

    const info = document.createElement('div');
    info.className = 'color-info';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'color-name';
    nameSpan.textContent = color.name;
    nameSpan.title = '点击编辑名称';

    const hexSpan = document.createElement('div');
    hexSpan.className = 'color-hex';
    hexSpan.textContent = color.hex;

    info.appendChild(nameSpan);
    info.appendChild(hexSpan);

    const actions = document.createElement('div');
    actions.className = 'color-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = '删除颜色';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.manager.removeColor(index);
    });

    actions.appendChild(deleteBtn);

    item.appendChild(swatch);
    item.appendChild(info);
    item.appendChild(actions);

    nameSpan.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editColorName(item, nameSpan, index, color.name);
    });

    item.addEventListener('dragstart', (e) => {
      this.handleDragStart(e, index, item);
    });

    item.addEventListener('dragend', (e) => {
      this.handleDragEnd(e, item);
    });

    item.addEventListener('dragover', (e) => {
      this.handleDragOver(e, item);
    });

    item.addEventListener('dragleave', (e) => {
      this.handleDragLeave(e, item);
    });

    item.addEventListener('drop', (e) => {
      this.handleDrop(e, index, item);
    });

    return item;
  }

  private editColorName(
    item: HTMLElement,
    nameSpan: HTMLElement,
    index: number,
    currentName: string
  ): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'color-name-input';
    input.value = currentName;
    input.maxLength = 32;

    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
      const newName = input.value.trim() || currentName;
      this.manager.updateColorName(index, newName);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.manager.updateColorName(index, currentName);
      }
    });

    input.addEventListener('blur', () => {
      commit();
    });
  }

  private handleDragStart(e: DragEvent, index: number, item: HTMLElement): void {
    if (!e.dataTransfer) return;
    this.dragIndex = index;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }

  private handleDragEnd(e: DragEvent, item: HTMLElement): void {
    item.classList.remove('dragging');
    this.clearDragOver();
    this.dragIndex = null;
  }

  private handleDragOver(e: DragEvent, item: HTMLElement): void {
    e.preventDefault();
    if (!e.dataTransfer) return;
    e.dataTransfer.dropEffect = 'move';
    this.clearDragOver();
    item.classList.add('drag-over');
  }

  private handleDragLeave(e: DragEvent, item: HTMLElement): void {
    item.classList.remove('drag-over');
  }

  private handleDrop(e: DragEvent, toIndex: number, item: HTMLElement): void {
    e.preventDefault();
    e.stopPropagation();
    this.clearDragOver();

    if (this.dragIndex !== null && this.dragIndex !== toIndex) {
      this.manager.moveColor(this.dragIndex, toIndex);
    }
    this.dragIndex = null;
  }

  private clearDragOver(): void {
    if (!this.paletteList) return;
    const items = this.paletteList.querySelectorAll('.palette-item');
    items.forEach(item => item.classList.remove('drag-over'));
  }

  private renderLogs(): void {
    if (!this.operationLog) return;

    const logs = this.manager.getLogs();
    this.operationLog.innerHTML = '';

    if (logs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'log-item';
      empty.style.color = '#999';
      empty.textContent = '暂无操作记录';
      this.operationLog.appendChild(empty);
      return;
    }

    logs.forEach(log => {
      const logItem = document.createElement('div');
      logItem.className = 'log-item';
      logItem.textContent = log.action;
      this.operationLog!.appendChild(logItem);
    });
  }

  private updateAddButtonState(): void {
    if (this.addBtn) {
      this.addBtn.disabled = this.manager.isFull();
    }
  }

  setInteractionEnabled(enabled: boolean): void {
    if (this.paletteSection) {
      if (enabled) {
        this.paletteSection.classList.remove('disabled');
      } else {
        this.paletteSection.classList.add('disabled');
      }
    }

    if (this.applyBtn) {
      this.applyBtn.disabled = !enabled;
    }
    if (this.exportBtn) {
      this.exportBtn.disabled = !enabled;
    }
    if (this.importBtn) {
      this.importBtn.disabled = !enabled;
    }
  }

  showToast(message: string, type: 'error' | 'warning' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);
    this.toasts.push(toast);

    setTimeout(() => {
      toast.classList.add('fading');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        const idx = this.toasts.indexOf(toast);
        if (idx > -1) {
          this.toasts.splice(idx, 1);
        }
      }, 300);
    }, 2000);
  }

  getCanvasWrapper(): HTMLElement | null {
    return document.getElementById('canvasWrapper');
  }

  triggerPulseAnimation(): void {
    const wrapper = this.getCanvasWrapper();
    if (wrapper) {
      wrapper.classList.remove('pulsing');
      void wrapper.offsetWidth;
      wrapper.classList.add('pulsing');
      setTimeout(() => {
        wrapper.classList.remove('pulsing');
      }, 1000);
    }
  }
}
