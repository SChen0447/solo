import type { NodeData, CallChainNode, GraphConfig } from './networkGraph';

type ConfigChangeCallback = (config: Partial<GraphConfig>) => void;
type FocusNodeCallback = (nodeId: string) => void;

export class ControlsUI {
  private container: HTMLElement;
  private onConfigChange: ConfigChangeCallback;
  private onFocusNode: FocusNodeCallback;
  private controlPanel: HTMLElement | null = null;
  private infoDrawer: HTMLElement | null = null;
  private infoContent: HTMLElement | null = null;
  private infoExpanded = false;
  private nodePanel: HTMLElement | null = null;
  private mobileMenuBtn: HTMLElement | null = null;
  private mobileMenuOverlay: HTMLElement | null = null;
  private mobileTab: HTMLElement | null = null;
  private isMobile = window.innerWidth < 768;

  constructor(
    container: HTMLElement,
    onConfigChange: ConfigChangeCallback,
    onFocusNode: FocusNodeCallback
  ) {
    this.container = container;
    this.onConfigChange = onConfigChange;
    this.onFocusNode = onFocusNode;
    this.buildUI();
    window.addEventListener('resize', () => this.handleResize());
  }

  private buildUI(): void {
    this.createControlPanel();
    this.createInfoDrawer();
    this.createNodePanel();
    
    if (this.isMobile) {
      this.createMobileMenu();
      this.createMobileTab();
      this.applyMobileStyles();
    }
  }

  private createControlPanel(): void {
    this.controlPanel = document.createElement('div');
    this.controlPanel.id = 'control-panel';
    Object.assign(this.controlPanel.style, {
      position: 'absolute',
      left: '20px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '240px',
      padding: '20px',
      background: 'rgba(10, 10, 30, 0.85)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      boxShadow: '0 0 8px rgba(255, 255, 255, 0.15)',
      color: '#fff',
      fontFamily: 'inherit',
      zIndex: '100',
      transition: 'all 0.3s ease'
    } as CSSStyleDeclaration);

    const title = document.createElement('div');
    title.textContent = '控制面板';
    Object.assign(title.style, {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '16px',
      color: '#a0a0ff',
      letterSpacing: '1px'
    });
    this.controlPanel.appendChild(title);

    this.controlPanel.appendChild(this.createSlider(
      '节点尺寸缩放',
      'nodeScale',
      0.5, 2, 1, 0.1,
      (val) => val.toFixed(1)
    ));

    this.controlPanel.appendChild(this.createSlider(
      '连接线透明度',
      'lineOpacity',
      0.1, 1.0, 0.4, 0.05,
      (val) => val.toFixed(2)
    ));

    this.controlPanel.appendChild(this.createSlider(
      '旋转速度 (秒/圈)',
      'rotationSpeed',
      0, 90, 45, 5,
      (val) => val.toFixed(0) + 's'
    ));

    this.container.appendChild(this.controlPanel);
  }

  private createSlider(
    label: string,
    key: keyof GraphConfig,
    min: number,
    max: number,
    defaultValue: number,
    step: number,
    format: (v: number) => string
  ): HTMLElement {
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      marginBottom: '16px'
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px'
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    Object.assign(labelEl.style, {
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.7)'
    });

    const valueEl = document.createElement('span');
    valueEl.textContent = format(defaultValue);
    Object.assign(valueEl.style, {
      fontSize: '12px',
      color: '#f1c40f',
      fontWeight: '600',
      minWidth: '40px',
      textAlign: 'right'
    });

    header.appendChild(labelEl);
    header.appendChild(valueEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(defaultValue);
    Object.assign(input.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'linear-gradient(to right, #3498db, #9b59b6)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    });

    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      valueEl.textContent = format(val);
      this.onConfigChange({ [key]: val } as Partial<GraphConfig>);
    });

    wrapper.appendChild(header);
    wrapper.appendChild(input);

    return wrapper;
  }

  private createInfoDrawer(): void {
    this.infoDrawer = document.createElement('div');
    this.infoDrawer.id = 'info-drawer';
    Object.assign(this.infoDrawer.style, {
      position: 'absolute',
      right: '20px',
      bottom: '0',
      width: '360px',
      height: '40px',
      background: 'rgba(15, 15, 35, 0.9)',
      borderTopLeftRadius: '12px',
      borderTopRightRadius: '12px',
      borderBottomLeftRadius: '0',
      borderBottomRightRadius: '0',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderBottom: 'none',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      boxShadow: '0 0 8px rgba(255, 255, 255, 0.15)',
      color: '#fff',
      zIndex: '100',
      transition: 'height 0.3s ease, all 0.3s ease',
      overflow: 'hidden',
      fontFamily: 'inherit'
    } as CSSStyleDeclaration);

    const header = document.createElement('div');
    Object.assign(header.style, {
      height: '40px',
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    });

    const title = document.createElement('span');
    title.textContent = '调用链';
    title.id = 'drawer-title';
    Object.assign(title.style, {
      fontSize: '13px',
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.8)'
    });

    const expandIcon = document.createElement('span');
    expandIcon.textContent = '▲';
    expandIcon.id = 'expand-icon';
    Object.assign(expandIcon.style, {
      fontSize: '10px',
      color: 'rgba(255, 255, 255, 0.6)',
      transition: 'transform 0.3s ease'
    });

    header.appendChild(title);
    header.appendChild(expandIcon);

    this.infoContent = document.createElement('div');
    this.infoContent.id = 'info-content';
    Object.assign(this.infoContent.style, {
      padding: '12px 16px',
      height: 'calc(100% - 40px)',
      overflowY: 'auto',
      fontSize: '12px',
      lineHeight: '1.8'
    });
    this.infoContent.innerHTML = '<span style="color:rgba(255,255,255,0.4)">点击节点查看调用链...</span>';

    header.addEventListener('click', () => this.toggleDrawer());

    this.infoDrawer.appendChild(header);
    this.infoDrawer.appendChild(this.infoContent);
    this.container.appendChild(this.infoDrawer);
  }

  private toggleDrawer(): void {
    if (!this.infoDrawer) return;
    this.infoExpanded = !this.infoExpanded;
    const icon = document.getElementById('expand-icon');
    
    if (this.isMobile) {
      this.infoDrawer.style.height = this.infoExpanded ? '250px' : '50px';
    } else {
      this.infoDrawer.style.height = this.infoExpanded ? '200px' : '40px';
    }
    
    if (icon) {
      icon.style.transform = this.infoExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }

  private createNodePanel(): void {
    this.nodePanel = document.createElement('div');
    this.nodePanel.id = 'node-panel';
    Object.assign(this.nodePanel.style, {
      position: 'absolute',
      display: 'none',
      width: '200px',
      minHeight: '120px',
      padding: '12px',
      background: 'rgba(20, 20, 40, 0.9)',
      borderRadius: '8px',
      border: '1px solid #ffffff',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      boxShadow: '0 0 8px rgba(255, 255, 255, 0.15)',
      color: '#fff',
      zIndex: '200',
      pointerEvents: 'none',
      fontFamily: 'inherit',
      transition: 'all 0.3s ease'
    } as CSSStyleDeclaration);

    this.container.appendChild(this.nodePanel);
  }

  showNodePanel(data: NodeData, screenX: number, screenY: number): void {
    if (!this.nodePanel) return;

    this.nodePanel.innerHTML = `
      <div style="font-size:13px;font-weight:600;color:${data.color};margin-bottom:8px;word-break:break-all">${data.name}</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:4px">调用次数: <span style="color:#2ecc71;font-weight:600">${data.callCount.toLocaleString()}</span></div>
      <div style="font-size:11px;color:rgba(255,255,255,0.6)">平均耗时: <span style="color:#f1c40f;font-weight:600">${data.avgDuration}ms</span></div>
    `;

    const panelW = 200;
    const panelH = 120;
    let x = screenX + 15;
    let y = screenY + 15;
    
    if (x + panelW > window.innerWidth) x = screenX - panelW - 15;
    if (y + panelH > window.innerHeight) y = screenY - panelH - 15;
    if (x < 0) x = 10;
    if (y < 0) y = 10;

    this.nodePanel.style.left = x + 'px';
    this.nodePanel.style.top = y + 'px';
    this.nodePanel.style.display = 'block';

    if (this.isMobile) {
      this.nodePanel.style.backdropFilter = 'none';
      this.nodePanel.style.webkitBackdropFilter = 'none';
    }
  }

  hideNodePanel(): void {
    if (this.nodePanel) {
      this.nodePanel.style.display = 'none';
    }
  }

  updateCallChain(nodeData: NodeData): void {
    if (!this.infoContent) return;

    const titleEl = document.getElementById('drawer-title');
    if (titleEl) {
      titleEl.textContent = `调用链 - ${nodeData.name}`;
      titleEl.style.color = nodeData.color;
    }

    this.infoContent.innerHTML = '';
    this.renderCallChain(nodeData.callChain, 0, this.infoContent);

    if (!this.infoExpanded) {
      this.toggleDrawer();
    }
  }

  private renderCallChain(chain: CallChainNode[], level: number, parent: HTMLElement): void {
    chain.forEach(node => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        paddingLeft: (level * 16) + 'px',
        padding: '2px 0',
        paddingLeft: (level * 16) + 'px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      });

      const t = level / 3;
      const r = Math.round(160 + (255 - 160) * t);
      const g = Math.round(160 - 160 * t);
      const b = Math.round(255 - 160 * t);
      const color = `rgb(${r},${g},${b})`;

      row.innerHTML = `<span style="color:${color}">${level > 0 ? '└ ' : ''}${node.name}</span>`;

      row.addEventListener('mouseenter', () => {
        row.style.background = 'rgba(255,255,255,0.05)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = 'transparent';
      });
      row.addEventListener('click', () => {
        const actualId = node.id.includes('chain-') ? null : node.id;
        this.onFocusNode(actualId || '');
      });

      parent.appendChild(row);

      if (node.children && node.children.length > 0 && level < 2) {
        this.renderCallChain(node.children, level + 1, parent);
      }
    });
  }

  private createMobileMenu(): void {
    this.mobileMenuBtn = document.createElement('div');
    Object.assign(this.mobileMenuBtn.style, {
      position: 'absolute',
      left: '16px',
      bottom: '80px',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      background: 'rgba(10, 10, 30, 0.9)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      boxShadow: '0 0 8px rgba(255, 255, 255, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '20px',
      cursor: 'pointer',
      zIndex: '150',
      transition: 'all 0.3s ease'
    } as CSSStyleDeclaration);
    this.mobileMenuBtn.textContent = '⚙';

    this.mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
    this.container.appendChild(this.mobileMenuBtn);

    this.mobileMenuOverlay = document.createElement('div');
    Object.assign(this.mobileMenuOverlay.style, {
      position: 'absolute',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '149'
    } as CSSStyleDeclaration);

    this.mobileMenuOverlay.addEventListener('click', (e) => {
      if (e.target === this.mobileMenuOverlay) {
        this.toggleMobileMenu();
      }
    });

    this.container.appendChild(this.mobileMenuOverlay);
  }

  private toggleMobileMenu(): void {
    if (!this.mobileMenuOverlay || !this.controlPanel) return;
    
    const isOpen = this.mobileMenuOverlay.style.display === 'flex';
    
    if (isOpen) {
      this.mobileMenuOverlay.style.display = 'none';
      this.controlPanel.style.display = 'none';
    } else {
      this.mobileMenuOverlay.style.display = 'flex';
      this.controlPanel.style.display = 'block';
      this.controlPanel.style.position = 'relative';
      this.controlPanel.style.left = 'auto';
      this.controlPanel.style.top = 'auto';
      this.controlPanel.style.transform = 'none';
      this.controlPanel.style.width = '280px';
      this.mobileMenuOverlay.innerHTML = '';
      this.mobileMenuOverlay.appendChild(this.controlPanel);
    }
  }

  private createMobileTab(): void {
    if (!this.infoDrawer) return;
    
    this.mobileTab = document.createElement('div');
    this.infoDrawer.style.right = '0';
    this.infoDrawer.style.left = '0';
    this.infoDrawer.style.width = '100%';
    this.infoDrawer.style.height = '50px';
    this.infoDrawer.style.borderRadius = '0';
    this.infoDrawer.style.borderTopLeftRadius = '12px';
    this.infoDrawer.style.borderTopRightRadius = '12px';
    
    const header = this.infoDrawer.firstChild as HTMLElement;
    if (header) {
      header.style.height = '50px';
    }
  }

  private applyMobileStyles(): void {
    if (this.controlPanel && !this.mobileMenuOverlay?.contains(this.controlPanel)) {
      this.controlPanel.style.display = 'none';
    }
    if (this.nodePanel) {
      this.nodePanel.style.backdropFilter = 'none';
      this.nodePanel.style.webkitBackdropFilter = 'none';
    }
  }

  private handleResize(): void {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;

    if (wasMobile !== this.isMobile) {
      this.clearAllUI();
      this.buildUI();
    }
  }

  private clearAllUI(): void {
    if (this.controlPanel) this.controlPanel.remove();
    if (this.infoDrawer) this.infoDrawer.remove();
    if (this.nodePanel) this.nodePanel.remove();
    if (this.mobileMenuBtn) this.mobileMenuBtn.remove();
    if (this.mobileMenuOverlay) this.mobileMenuOverlay.remove();
    this.controlPanel = null;
    this.infoDrawer = null;
    this.infoContent = null;
    this.nodePanel = null;
    this.mobileMenuBtn = null;
    this.mobileMenuOverlay = null;
    this.mobileTab = null;
    this.infoExpanded = false;
  }

  isMobileMode(): boolean {
    return this.isMobile;
  }
}
