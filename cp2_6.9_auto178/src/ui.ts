import { ElementInfo } from './molecules';

export type OnMoleculeSelectCallback = (key: string) => void;
export type OnResetViewCallback = () => void;

export class UIManager {
  private container: HTMLElement;
  private buttonGroup: HTMLElement;
  private infoPanel: HTMLElement;
  private resetButton: HTMLElement;
  private onMoleculeSelect: OnMoleculeSelectCallback | null = null;
  private onResetView: OnResetViewCallback | null = null;
  private currentSelected: string = 'caffeine';

  private molecules = [
    { key: 'caffeine', label: '咖啡因', formula: 'C8H10N4O2' },
    { key: 'aspirin', label: '阿司匹林', formula: 'C9H8O4' },
    { key: 'glucose', label: '葡萄糖', formula: 'C6H12O6' },
  ];

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);
    this.container = container;

    this.buttonGroup = this.createButtonGroup();
    this.infoPanel = this.createInfoPanel();
    this.resetButton = this.createResetButton();

    this.container.appendChild(this.buttonGroup);
    this.container.appendChild(this.infoPanel);
    this.container.appendChild(this.resetButton);

    this.selectButton(this.currentSelected);
  }

  setOnMoleculeSelect(callback: OnMoleculeSelectCallback): void {
    this.onMoleculeSelect = callback;
  }

  setOnResetView(callback: OnResetViewCallback): void {
    this.onResetView = callback;
  }

  updateElementInfo(info: ElementInfo | null): void {
    const nameEl = this.infoPanel.querySelector('[data-info="name"]') as HTMLElement;
    const symbolEl = this.infoPanel.querySelector('[data-info="symbol"]') as HTMLElement;
    const numberEl = this.infoPanel.querySelector('[data-info="number"]') as HTMLElement;
    const massEl = this.infoPanel.querySelector('[data-info="mass"]') as HTMLElement;
    const enEl = this.infoPanel.querySelector('[data-info="electronegativity"]') as HTMLElement;

    if (info) {
      nameEl.textContent = info.name;
      symbolEl.textContent = info.symbol;
      numberEl.textContent = String(info.atomicNumber);
      massEl.textContent = info.mass.toFixed(3);
      enEl.textContent = info.electronegativity.toFixed(2);
      this.infoPanel.style.opacity = '1';
      this.infoPanel.style.transform = 'translateY(0)';
    } else {
      this.infoPanel.style.opacity = '0';
      this.infoPanel.style.transform = 'translateY(-10px)';
    }
  }

  private createButtonGroup(): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = `
      position: absolute;
      top: 24px;
      left: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: auto;
    `;

    this.molecules.forEach((mol) => {
      const btn = document.createElement('button');
      btn.dataset.molecule = mol.key;
      btn.innerHTML = `<div style="font-size:14px;font-weight:500">${mol.label}</div><div style="font-size:11px;opacity:0.7;margin-top:2px">${mol.formula}</div>`;
      btn.style.cssText = `
        width: 120px;
        height: 40px;
        border: none;
        border-radius: 8px;
        background: #2A2D3E;
        color: #AAAAAA;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        line-height: 1.2;
        padding: 4px 8px;
      `;

      btn.addEventListener('mouseenter', () => {
        if (btn.dataset.molecule !== this.currentSelected) {
          btn.style.background = '#3A3D4E';
        }
      });

      btn.addEventListener('mouseleave', () => {
        if (btn.dataset.molecule !== this.currentSelected) {
          btn.style.background = '#2A2D3E';
        }
      });

      btn.addEventListener('click', () => {
        const key = btn.dataset.molecule!;
        this.selectButton(key);
        if (this.onMoleculeSelect) {
          this.onMoleculeSelect(key);
        }
      });

      group.appendChild(btn);
    });

    return group;
  }

  private selectButton(key: string): void {
    this.currentSelected = key;
    const buttons = this.buttonGroup.querySelectorAll('button');
    buttons.forEach((btn) => {
      if (btn.dataset.molecule === key) {
        btn.style.background = '#4A6CF7';
        btn.style.color = '#FFFFFF';
      } else {
        btn.style.background = '#2A2D3E';
        btn.style.color = '#AAAAAA';
      }
    });
  }

  private createInfoPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      top: 24px;
      right: 24px;
      width: 200px;
      padding: 16px;
      border-radius: 12px;
      background: rgba(42, 45, 62, 0.9);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.08);
      color: #FFFFFF;
      pointer-events: none;
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.3s ease-out, transform 0.3s ease-out;
    `;

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div data-info="symbol" style="font-size:28px;font-weight:700;color:#4A6CF7">--</div>
        <div>
          <div data-info="name" style="font-size:16px;font-weight:600">--</div>
          <div style="font-size:11px;color:#888888">Element</div>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;font-size:13px">
          <span style="color:#888888">原子序数</span>
          <span data-info="number" style="color:#FFFFFF;font-weight:500">--</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px">
          <span style="color:#888888">质量数</span>
          <span data-info="mass" style="color:#FFFFFF;font-weight:500">--</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px">
          <span style="color:#888888">电负性</span>
          <span data-info="electronegativity" style="color:#FFFFFF;font-weight:500">--</span>
        </div>
      </div>
    `;

    return panel;
  }

  private createResetButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    btn.title = '重置视角';
    btn.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 24px;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: #2A2D3E;
      color: #AAAAAA;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease-out;
      pointer-events: auto;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#3A3D4E';
      btn.style.transform = 'scale(1.1)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#2A2D3E';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', () => {
      if (this.onResetView) {
        this.onResetView();
      }
    });

    return btn;
  }
}
