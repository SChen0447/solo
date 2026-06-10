import {
  AtomInfo,
  BondType,
  getElementColor,
  getElementName,
} from './moleculeBuilder';

type MoleculeChangeCallback = (moleculeKey: string) => void;
type DeselectCallback = () => void;

export class UIController {
  private select: HTMLSelectElement;
  private hamburger: HTMLButtonElement;
  private infoPanel: HTMLElement;
  private panelContent: HTMLElement;
  private tooltip: HTMLElement;
  private moleculeChangeCallbacks: MoleculeChangeCallback[] = [];
  private deselectCallbacks: DeselectCallback[] = [];

  constructor() {
    this.select = document.getElementById(
      'molecule-select'
    ) as HTMLSelectElement;
    this.hamburger = document.getElementById(
      'hamburger'
    ) as HTMLButtonElement;
    this.infoPanel = document.getElementById('info-panel') as HTMLElement;
    this.panelContent = document.getElementById(
      'panel-content'
    ) as HTMLElement;
    this.tooltip = document.getElementById('tooltip') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.select.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const value = target.value;
      this.moleculeChangeCallbacks.forEach((cb) => cb(value));
      if (window.innerWidth <= 768) {
        this.select.classList.remove('mobile-open');
      }
    });

    this.hamburger.addEventListener('click', () => {
      this.select.classList.toggle('mobile-open');
    });

    document.addEventListener('click', (e) => {
      const controls = document.getElementById('controls');
      if (controls && !controls.contains(e.target as Node)) {
        this.select.classList.remove('mobile-open');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.deselectCallbacks.forEach((cb) => cb());
        this.clearSelectedAtom();
      }
    });
  }

  public onMoleculeChange(callback: MoleculeChangeCallback): void {
    this.moleculeChangeCallbacks.push(callback);
  }

  public onDeselect(callback: DeselectCallback): void {
    this.deselectCallbacks.push(callback);
  }

  public getSelectedMolecule(): string {
    return this.select.value;
  }

  public setSelectedMolecule(key: string): void {
    this.select.value = key;
  }

  public showTooltip(
    x: number,
    y: number,
    element: string,
    colorHex: string
  ): void {
    this.tooltip.textContent = element;
    this.tooltip.style.left = `${x + 12}px`;
    this.tooltip.style.top = `${y + 12}px`;
    this.tooltip.style.borderLeft = `3px solid ${colorHex}`;
    this.tooltip.classList.add('visible');
  }

  public moveTooltip(x: number, y: number): void {
    this.tooltip.style.left = `${x + 12}px`;
    this.tooltip.style.top = `${y + 12}px`;
  }

  public hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  private getElementColorCss(element: string): string {
    const color = getElementColor(element as any);
    return '#' + color.toString(16).padStart(6, '0');
  }

  private bondTypeLabel(type: BondType): string {
    return type === 'single' ? '单键' : '双键';
  }

  public showSelectedAtom(atomInfo: AtomInfo): void {
    const colorCss = this.getElementColorCss(atomInfo.element);

    let bondsHtml = '';
    if (atomInfo.connectedAtoms.length > 0) {
      bondsHtml = `
        <div class="section-title">相连原子</div>
        ${atomInfo.connectedAtoms
          .map(
            (conn) => `
          <div class="bond-item">
            <span class="bond-info">
              <strong>${conn.elementName}</strong>
              <span style="color:${this.getElementColorCss(conn.element)};">
                (${conn.element})
              </span>
            </span>
            <span class="bond-type ${conn.bondType === 'double' ? 'double' : ''}">
              ${this.bondTypeLabel(conn.bondType)}
            </span>
          </div>
        `
          )
          .join('')}
      `;
    }

    this.panelContent.innerHTML = `
      <h3>选中原子</h3>
      <div class="atom-name">${atomInfo.elementName}</div>
      <div
        class="atom-symbol"
        style="background:${colorCss}33; color:${colorCss};"
      >
        ${atomInfo.element}
      </div>
      <div class="coord-row">
        <span class="coord-label">X</span>
        <span class="coord-value">${atomInfo.position.x.toFixed(2)}</span>
      </div>
      <div class="coord-row">
        <span class="coord-label">Y</span>
        <span class="coord-value">${atomInfo.position.y.toFixed(2)}</span>
      </div>
      <div class="coord-row">
        <span class="coord-label">Z</span>
        <span class="coord-value">${atomInfo.position.z.toFixed(2)}</span>
      </div>
      ${bondsHtml}
    `;

    this.infoPanel.classList.remove('panel-hidden');
  }

  public clearSelectedAtom(): void {
    this.panelContent.innerHTML =
      '<p class="empty-hint">点击原子查看详情</p>';
  }

  public hidePanel(): void {
    this.infoPanel.classList.add('panel-hidden');
  }

  public showPanel(): void {
    this.infoPanel.classList.remove('panel-hidden');
  }

  public blinkPanel(): void {
    this.infoPanel.classList.add('panel-hidden');
    setTimeout(() => {
      this.infoPanel.classList.remove('panel-hidden');
    }, 50);
  }
}
