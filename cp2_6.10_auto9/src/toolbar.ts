import { store, type Tool, PEN_COLORS } from './store';

interface ToolDef {
  id: Tool;
  icon: string;
  label: string;
}

const TOOLS: ToolDef[] = [
  { id: 'select', icon: 'fa-mouse-pointer', label: '选择' },
  { id: 'sticky', icon: 'fa-sticky-note', label: '便签' },
  { id: 'marquee', icon: 'fa-vector-square', label: '框选' },
  { id: 'pen', icon: 'fa-pen', label: '画笔' },
  { id: 'line', icon: 'fa-minus', label: '直线' },
  { id: 'eraser', icon: 'fa-eraser', label: '橡皮擦' }
];

export class Toolbar {
  private container: HTMLElement;
  private state = store.getState();

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    store.subscribe((state) => {
      this.state = state;
      this.updateActiveState();
      this.updateZoomDisplay();
    });
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.gap = '4px';
    this.container.style.padding = '8px 12px';
    this.container.style.backgroundColor = '#ffffff';
    this.container.style.borderBottom = '1px solid #e5e5e5';
    this.container.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
    this.container.style.flexWrap = 'wrap';
    this.container.style.position = 'relative';
    this.container.style.zIndex = '100';

    const toolsWrap = document.createElement('div');
    toolsWrap.style.display = 'flex';
    toolsWrap.style.alignItems = 'center';
    toolsWrap.style.gap = '2px';
    toolsWrap.style.paddingRight = '12px';
    toolsWrap.style.borderRight = '1px solid #eee';
    for (const tool of TOOLS) {
      toolsWrap.appendChild(this.createToolButton(tool));
    }
    this.container.appendChild(toolsWrap);

    const colorWrap = document.createElement('div');
    colorWrap.style.display = 'flex';
    colorWrap.style.alignItems = 'center';
    colorWrap.style.gap = '4px';
    colorWrap.style.padding = '0 12px';
    colorWrap.style.borderRight = '1px solid #eee';
    const colorLabel = document.createElement('span');
    colorLabel.innerHTML = '<i class="fa-solid fa-palette"></i>';
    colorLabel.style.fontSize = '13px';
    colorLabel.style.color = '#666';
    colorLabel.style.marginRight = '4px';
    colorWrap.appendChild(colorLabel);
    for (const color of PEN_COLORS) {
      colorWrap.appendChild(this.createColorButton(color));
    }
    this.container.appendChild(colorWrap);

    const thickWrap = document.createElement('div');
    thickWrap.style.display = 'flex';
    thickWrap.style.alignItems = 'center';
    thickWrap.style.gap = '8px';
    thickWrap.style.padding = '0 12px';
    thickWrap.style.borderRight = '1px solid #eee';
    const thickLabel = document.createElement('span');
    thickLabel.innerHTML = '<i class="fa-solid fa-swatchbook"></i>';
    thickLabel.style.fontSize = '13px';
    thickLabel.style.color = '#666';
    thickWrap.appendChild(thickLabel);
    const thickSlider = document.createElement('input');
    thickSlider.type = 'range';
    thickSlider.min = '1';
    thickSlider.max = '20';
    thickSlider.value = String(this.state.penThickness);
    thickSlider.style.width = '80px';
    thickSlider.style.accentColor = '#87CEEB';
    thickSlider.addEventListener('input', () => {
      store.setPenThickness(parseInt(thickSlider.value, 10));
    });
    thickWrap.appendChild(thickSlider);
    this.container.appendChild(thickWrap);

    const zoomWrap = document.createElement('div');
    zoomWrap.style.display = 'flex';
    zoomWrap.style.alignItems = 'center';
    zoomWrap.style.gap = '4px';
    zoomWrap.style.padding = '0 12px';
    zoomWrap.style.borderRight = '1px solid #eee';
    const zoomOut = this.createIconBtn('fa-search-minus', '缩小', () => {
      store.setZoom(Math.max(0.1, this.state.zoom - 0.1));
    });
    const zoomDisplay = document.createElement('span');
    zoomDisplay.className = 'zoom-display';
    zoomDisplay.textContent = Math.round(this.state.zoom * 100) + '%';
    zoomDisplay.style.fontSize = '12px';
    zoomDisplay.style.color = '#333';
    zoomDisplay.style.minWidth = '42px';
    zoomDisplay.style.textAlign = 'center';
    zoomDisplay.style.fontWeight = '500';
    const zoomIn = this.createIconBtn('fa-search-plus', '放大', () => {
      store.setZoom(Math.min(2, this.state.zoom + 0.1));
    });
    const zoomReset = this.createIconBtn('fa-expand', '重置视图', () => {
      store.setZoom(1);
      store.setPanOffset(0, 0);
    });
    zoomWrap.appendChild(zoomOut);
    zoomWrap.appendChild(zoomDisplay);
    zoomWrap.appendChild(zoomIn);
    zoomWrap.appendChild(zoomReset);
    this.container.appendChild(zoomWrap);

    const actionsWrap = document.createElement('div');
    actionsWrap.style.display = 'flex';
    actionsWrap.style.alignItems = 'center';
    actionsWrap.style.gap = '4px';
    actionsWrap.style.padding = '0 12px';
    actionsWrap.style.borderRight = '1px solid #eee';
    const groupBtn = this.createActionBtn('fa-layer-group', '一键分组', () => {
      store.groupSelectedNotes();
    }, '#FFD700');
    actionsWrap.appendChild(groupBtn);
    this.container.appendChild(actionsWrap);

    const utilWrap = document.createElement('div');
    utilWrap.style.display = 'flex';
    utilWrap.style.alignItems = 'center';
    utilWrap.style.gap = '4px';
    utilWrap.style.padding = '0 12px';
    utilWrap.style.marginLeft = 'auto';
    const clearBtn = this.createIconBtn('fa-trash-can', '清空画布', () => {
      if (confirm('确定要清空画布吗？此操作不可恢复。')) {
        store.clearAll();
      }
    });
    clearBtn.style.color = '#e74c3c';
    utilWrap.appendChild(clearBtn);
    this.container.appendChild(utilWrap);

    const statusWrap = document.createElement('div');
    statusWrap.className = 'online-status';
    statusWrap.style.display = 'flex';
    statusWrap.style.alignItems = 'center';
    statusWrap.style.gap = '6px';
    statusWrap.style.paddingLeft = '12px';
    statusWrap.style.marginLeft = '12px';
    statusWrap.style.borderLeft = '1px solid #eee';
    const dot = document.createElement('span');
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = '#4CAF50';
    dot.style.animation = 'pulse 2s infinite';
    const statusText = document.createElement('span');
    statusText.className = 'online-count';
    statusText.style.fontSize = '12px';
    statusText.style.color = '#666';
    statusText.textContent = '在线: 1 人';
    statusWrap.appendChild(dot);
    statusWrap.appendChild(statusText);
    this.container.appendChild(statusWrap);
  }

  private createToolButton(tool: ToolDef): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'toolbar-btn tool-btn';
    btn.dataset.tool = tool.id;
    btn.title = tool.label;
    btn.innerHTML = `<i class="fa-solid ${tool.icon}"></i>`;
    this.applyBtnStyle(btn);
    btn.addEventListener('click', (e) => {
      this.addRipple(btn, e);
      store.setActiveTool(tool.id);
    });
    return btn;
  }

  private createColorButton(color: string): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'toolbar-btn color-btn';
    btn.dataset.color = color;
    btn.title = color;
    btn.style.width = '24px';
    btn.style.height = '24px';
    btn.style.padding = '0';
    btn.style.backgroundColor = color;
    btn.style.borderRadius = '50%';
    btn.style.border = '2px solid transparent';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.15s';
    btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
    });
    btn.addEventListener('mouseleave', () => {
      if (btn.dataset.color !== this.state.penColor) {
        btn.style.transform = 'scale(1)';
      }
    });
    btn.addEventListener('click', (e) => {
      this.addRipple(btn, e);
      store.setPenColor(color);
    });
    return btn;
  }

  private createIconBtn(icon: string, title: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'toolbar-btn';
    btn.title = title;
    btn.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    this.applyBtnStyle(btn);
    btn.addEventListener('click', (e) => {
      this.addRipple(btn, e);
      onClick();
    });
    return btn;
  }

  private createActionBtn(icon: string, title: string, onClick: () => void, accent: string): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'toolbar-btn action-btn';
    btn.title = title;
    btn.innerHTML = `<i class="fa-solid ${icon}"></i> <span style="font-size:12px;margin-left:4px">${title}</span>`;
    this.applyBtnStyle(btn);
    btn.style.backgroundColor = accent + '22';
    btn.style.color = '#333';
    btn.addEventListener('click', (e) => {
      this.addRipple(btn, e);
      onClick();
    });
    return btn;
  }

  private applyBtnStyle(btn: HTMLButtonElement): void {
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.width = '34px';
    btn.style.height = '34px';
    btn.style.padding = '0';
    btn.style.border = 'none';
    btn.style.backgroundColor = 'transparent';
    btn.style.color = '#555';
    btn.style.fontSize = '14px';
    btn.style.borderRadius = '8px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.15s';
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.addEventListener('mouseenter', () => {
      if (!btn.classList.contains('active')) {
        btn.style.backgroundColor = '#f0f0f0';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (!btn.classList.contains('active')) {
        btn.style.backgroundColor = 'transparent';
      }
    });
  }

  private addRipple(btn: HTMLElement, e: MouseEvent): void {
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.backgroundColor = 'rgba(135, 206, 235, 0.4)';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple 0.5s ease-out';
    ripple.style.pointerEvents = 'none';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  private updateActiveState(): void {
    const toolBtns = this.container.querySelectorAll('.tool-btn');
    toolBtns.forEach((el) => {
      const btn = el as HTMLButtonElement;
      if (btn.dataset.tool === this.state.activeTool) {
        btn.classList.add('active');
        btn.style.backgroundColor = '#87CEEB';
        btn.style.color = '#fff';
        btn.style.boxShadow = '0 2px 6px rgba(135, 206, 235, 0.4)';
      } else {
        btn.classList.remove('active');
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '#555';
        btn.style.boxShadow = 'none';
      }
    });

    const colorBtns = this.container.querySelectorAll('.color-btn');
    colorBtns.forEach((el) => {
      const btn = el as HTMLButtonElement;
      if (btn.dataset.color === this.state.penColor) {
        btn.style.border = '2px solid #333';
        btn.style.transform = 'scale(1.1)';
      } else {
        btn.style.border = '2px solid transparent';
        btn.style.transform = 'scale(1)';
      }
    });
  }

  private updateZoomDisplay(): void {
    const display = this.container.querySelector('.zoom-display');
    if (display) {
      display.textContent = Math.round(this.state.zoom * 100) + '%';
    }
  }

  setOnlineCount(count: number): void {
    const el = this.container.querySelector('.online-count');
    if (el) {
      el.textContent = `在线: ${count} 人`;
    }
  }
}
