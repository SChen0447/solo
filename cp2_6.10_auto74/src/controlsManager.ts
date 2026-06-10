import type { DataGroup } from './types';

export interface ControlsManagerCallbacks {
  onGroupsChange: (groups: DataGroup[]) => void;
  onModeChange: (mode: 'pie' | 'donut') => void;
  onCenterTextChange: (text: string) => void;
  onExport: () => void;
}

export class ControlsManager {
  private container: HTMLElement;
  private groups: DataGroup[] = [];
  private callbacks: ControlsManagerCallbacks;
  private warningBar: HTMLElement | null = null;
  private editingId: string | null = null;

  constructor(container: HTMLElement, callbacks: ControlsManagerCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  setGroups(groups: DataGroup[]): void {
    this.groups = groups;
    this.render();
    this.updateWarning();
  }

  private generateId(): string {
    return 'group_' + Math.random().toString(36).substr(2, 9);
  }

  private randomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8B500', '#FF6F61',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  addGroup(): void {
    const newGroup: DataGroup = {
      id: this.generateId(),
      label: '新分组',
      percentage: 0,
      color: this.randomColor(),
    };
    this.groups = [...this.groups, newGroup];
    this.callbacks.onGroupsChange(this.groups);
    this.render();
    this.updateWarning();
  }

  removeGroup(id: string): void {
    if (this.groups.length <= 1) return;
    this.groups = this.groups.filter((g) => g.id !== id);
    this.normalizePercentages(id);
    this.callbacks.onGroupsChange(this.groups);
    this.render();
    this.updateWarning();
  }

  private normalizePercentages(excludeId?: string): void {
    const otherGroups = this.groups.filter((g) => g.id !== excludeId);
    const total = otherGroups.reduce((sum, g) => sum + g.percentage, 0);

    if (total > 0) {
      const scale = 100 / total;
      otherGroups.forEach((g) => {
        g.percentage = Math.round(g.percentage * scale);
      });
    }

    const newTotal = this.groups.reduce((sum, g) => sum + g.percentage, 0);
    if (newTotal !== 100 && otherGroups.length > 0) {
      const diff = 100 - newTotal;
      otherGroups[0].percentage += diff;
    }
  }

  updatePercentage(id: string, value: number): void {
    const group = this.groups.find((g) => g.id === id);
    if (!group) return;

    const oldValue = group.percentage;
    group.percentage = Math.max(0, Math.min(100, value));
    const delta = group.percentage - oldValue;

    if (delta !== 0) {
      const otherGroups = this.groups.filter((g) => g.id !== id);
      const otherTotal = otherGroups.reduce((sum, g) => sum + g.percentage, 0);

      if (otherTotal > 0) {
        const adjustment = -delta;
        let remaining = adjustment;

        for (let i = 0; i < otherGroups.length && remaining !== 0; i++) {
          const g = otherGroups[i];
          if (remaining > 0) {
            const canTake = Math.min(g.percentage, remaining);
            g.percentage -= canTake;
            remaining -= canTake;
          } else {
            g.percentage -= remaining;
            remaining = 0;
          }
        }
      }
    }

    this.callbacks.onGroupsChange([...this.groups]);
    this.updateSliderValues(id);
    this.updateWarning();
  }

  updateLabel(id: string, label: string): void {
    const group = this.groups.find((g) => g.id === id);
    if (!group) return;
    group.label = label || '未命名';
    this.callbacks.onGroupsChange([...this.groups]);
  }

  updateColor(id: string, color: string): void {
    const group = this.groups.find((g) => g.id === id);
    if (!group) return;
    group.color = color;
    this.callbacks.onGroupsChange([...this.groups]);
  }

  private updateSliderValues(changedId: string): void {
    this.groups.forEach((g) => {
      const slider = document.getElementById(`slider-${g.id}`) as HTMLInputElement;
      const number = document.getElementById(`number-${g.id}`) as HTMLInputElement;
      if (slider) slider.value = String(g.percentage);
      if (number) number.value = String(g.percentage);
    });
  }

  private updateWarning(): void {
    const total = this.groups.reduce((sum, g) => sum + g.percentage, 0);
    if (!this.warningBar) return;

    if (Math.abs(total - 100) > 0.01) {
      this.warningBar.style.display = 'flex';
      this.warningBar.textContent = `当前比例之和为${total.toFixed(1)}%，请调整至100%`;
    } else {
      this.warningBar.style.display = 'none';
    }
  }

  render(): void {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'controls-header';
    header.innerHTML = `
      <h2>数据分组</h2>
      <div class="mode-toggle">
        <button id="mode-pie" class="toggle-btn active">饼图</button>
        <button id="mode-donut" class="toggle-btn">环形图</button>
      </div>
    `;
    this.container.appendChild(header);

    const centerTextRow = document.createElement('div');
    centerTextRow.className = 'center-text-row';
    centerTextRow.innerHTML = `
      <label for="center-text-input">中心文本：</label>
      <input type="text" id="center-text-input" value="总计100%" />
    `;
    this.container.appendChild(centerTextRow);

    const groupsList = document.createElement('div');
    groupsList.className = 'groups-list';

    this.groups.forEach((group) => {
      const item = this.createGroupItem(group);
      groupsList.appendChild(item);
    });

    this.container.appendChild(groupsList);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-group-btn';
    addBtn.textContent = '+ 添加分组';
    addBtn.onclick = () => this.addGroup();
    this.container.appendChild(addBtn);

    this.warningBar = document.createElement('div');
    this.warningBar.className = 'warning-bar';
    this.container.appendChild(this.warningBar);

    this.bindEvents();
    this.updateWarning();
  }

  private createGroupItem(group: DataGroup): HTMLElement {
    const item = document.createElement('div');
    item.className = 'group-item';
    item.innerHTML = `
      <div class="group-item-row">
        <div class="color-wrapper">
          <div class="color-swatch" style="background-color: ${group.color}"></div>
          <input type="color" id="color-${group.id}" value="${group.color}" class="color-input" />
        </div>
        <span class="group-label" id="label-${group.id}" title="双击编辑">${group.label}</span>
        <button class="delete-btn" id="delete-${group.id}" title="删除分组">×</button>
      </div>
      <div class="group-item-row">
        <input type="range" id="slider-${group.id}" min="0" max="100" step="1" value="${group.percentage}" class="group-slider" />
        <input type="number" id="number-${group.id}" min="0" max="100" step="1" value="${group.percentage}" class="group-number" />
        <span class="percent-sign">%</span>
      </div>
    `;
    return item;
  }

  private bindEvents(): void {
    this.groups.forEach((group) => {
      const slider = document.getElementById(`slider-${group.id}`) as HTMLInputElement;
      const number = document.getElementById(`number-${group.id}`) as HTMLInputElement;
      const colorInput = document.getElementById(`color-${group.id}`) as HTMLInputElement;
      const labelEl = document.getElementById(`label-${group.id}`);
      const deleteBtn = document.getElementById(`delete-${group.id}`);

      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseInt((e.target as HTMLInputElement).value, 10);
          this.updatePercentage(group.id, val);
        });
      }

      if (number) {
        number.addEventListener('change', (e) => {
          const val = parseInt((e.target as HTMLInputElement).value, 10);
          this.updatePercentage(group.id, isNaN(val) ? 0 : val);
        });
      }

      if (colorInput) {
        colorInput.addEventListener('input', (e) => {
          const color = (e.target as HTMLInputElement).value;
          this.updateColor(group.id, color);
          const swatch = (colorInput.previousElementSibling as HTMLElement);
          if (swatch) swatch.style.backgroundColor = color;
        });
      }

      if (labelEl) {
        labelEl.addEventListener('dblclick', () => {
          this.startEditingLabel(group.id, labelEl);
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.removeGroup(group.id);
        });
      }
    });

    const pieBtn = document.getElementById('mode-pie');
    const donutBtn = document.getElementById('mode-donut');

    if (pieBtn) {
      pieBtn.addEventListener('click', () => {
        pieBtn.classList.add('active');
        donutBtn?.classList.remove('active');
        this.callbacks.onModeChange('pie');
      });
    }

    if (donutBtn) {
      donutBtn.addEventListener('click', () => {
        donutBtn.classList.add('active');
        pieBtn?.classList.remove('active');
        this.callbacks.onModeChange('donut');
      });
    }

    const centerTextInput = document.getElementById('center-text-input') as HTMLInputElement;
    if (centerTextInput) {
      centerTextInput.addEventListener('input', (e) => {
        this.callbacks.onCenterTextChange((e.target as HTMLInputElement).value);
      });
    }
  }

  private startEditingLabel(id: string, labelEl: HTMLElement): void {
    if (this.editingId) return;
    this.editingId = id;

    const currentText = labelEl.textContent || '';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'label-edit-input';

    labelEl.style.display = 'none';
    labelEl.parentNode?.insertBefore(input, labelEl.nextSibling);
    input.focus();
    input.select();

    const finishEditing = () => {
      const newLabel = input.value.trim();
      if (newLabel) {
        labelEl.textContent = newLabel;
        this.updateLabel(id, newLabel);
      }
      labelEl.style.display = '';
      input.remove();
      this.editingId = null;
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEditing();
      } else if (e.key === 'Escape') {
        labelEl.style.display = '';
        input.remove();
        this.editingId = null;
      }
    });

    input.addEventListener('blur', finishEditing);
  }
}
