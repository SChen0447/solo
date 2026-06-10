import type { PlanetData } from './planetSystem';

const ICONS = {
  mass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l-2 3h4l-2 3"/><path d="M18 6l2 3h-4l2 3"/><path d="M6 14h12"/><circle cx="12" cy="17" r="2"/></svg>`,
  diameter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3l2 3"/></svg>`,
  period: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  distance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>`
};

export class DataPanel {
  private container: HTMLDivElement;
  private cardInner: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private subTitleEl: HTMLDivElement;
  private dataRows: HTMLDivElement;
  private closeBtn: HTMLButtonElement;
  private isOpen = false;
  private onCloseCallback: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'data-panel-container';
    this.container.style.cssText = `
      position: fixed;
      top: 80px;
      right: 24px;
      width: 350px;
      perspective: 1200px;
      z-index: 100;
      pointer-events: none;
      opacity: 0;
      transform: translateY(-20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    this.cardInner = document.createElement('div');
    this.cardInner.className = 'data-panel-card';
    this.cardInner.style.cssText = `
      position: relative;
      width: 100%;
      transform-style: preserve-3d;
      transform: rotateY(-90deg);
      transform-origin: right center;
      transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      border-radius: 14px;
      padding: 24px;
      background: linear-gradient(145deg, rgba(13, 27, 77, 0.85) 0%, rgba(26, 10, 51, 0.92) 100%;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(120, 150, 255, 0.18);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 60px rgba(80, 120, 255, 0.1);
      pointer-events: auto;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;';

    const titles = document.createElement('div');
    this.titleEl = document.createElement('h2');
    this.titleEl.style.cssText = `
      font-size:24px;
      font-weight:700;
      color:#e8e8ff;
      margin:0;
      letter-spacing:1px;
    `;
    this.subTitleEl = document.createElement('div');
    this.subTitleEl.style.cssText = `
      font-size:13px;
      color:#8899cc;
      margin-top:2px;
      letter-spacing:2px;
      text-transform:uppercase;
    `;
    titles.appendChild(this.titleEl);
    titles.appendChild(this.subTitleEl);

    this.closeBtn = document.createElement('button');
    this.closeBtn.innerHTML = ICONS.close;
    this.closeBtn.style.cssText = `
      width:32px;
      height:32px;
      border-radius:50%;
      background:rgba(255,255,255,0.08);
      border:1px solid rgba(255,255,255,0.15);
      color:#aabbdd;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:6px;
      transition:all 0.2s ease;
    `;
    this.closeBtn.addEventListener('mouseenter', () => {
      this.closeBtn.style.background = 'rgba(102, 204, 255, 0.25)';
      this.closeBtn.style.color = '#66ccff';
      this.closeBtn.style.borderColor = 'rgba(102, 204, 255, 0.5)';
    });
    this.closeBtn.addEventListener('mouseleave', () => {
      this.closeBtn.style.background = 'rgba(255,255,255,0.08)';
      this.closeBtn.style.color = '#aabbdd';
      this.closeBtn.style.borderColor = 'rgba(255,255,255,0.15)';
    });
    this.closeBtn.addEventListener('click', () => this.close());

    header.appendChild(titles);
    header.appendChild(this.closeBtn);

    this.dataRows = document.createElement('div');
    this.dataRows.style.cssText = 'display:flex;flex-direction:column;gap:14px;';

    const divider = document.createElement('div');
    divider.style.cssText = 'height:1px;background:linear-gradient(90deg,transparent,rgba(120,150,255,0.3),transparent;margin:4px 0 18px;';

    this.cardInner.appendChild(header);
    this.cardInner.appendChild(divider);
    this.cardInner.appendChild(this.dataRows);
    this.container.appendChild(this.cardInner);
    parent.appendChild(this.container);
  }

  private createRow(iconSvg: string, label: string, value: string, unit: string): HTMLDivElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:14px;';

    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = `
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      border-radius: 10px;
      background: rgba(102, 204, 255, 0.1);
      border: 1px solid rgba(102, 204, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #66ccff;
    `;
    iconWrap.innerHTML = iconSvg;
    const svgEl = iconWrap.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('width', '20');
      svgEl.setAttribute('height', '20');
    }

    const textWrap = document.createElement('div');
    textWrap.style.cssText = 'flex:1;min-width:0;';

    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = 'font-size:12px;color:#8899cc;letter-spacing:0.5px;margin-bottom:2px;';

    const valueEl = document.createElement('div');
    valueEl.textContent = value;
    valueEl.style.cssText = 'font-size:16px;color:#e8e8ff;font-weight:600;';

    const unitEl = document.createElement('span');
    unitEl.textContent = ' ' + unit;
    unitEl.style.cssText = 'font-size:12px;color:#8899cc;font-weight:400;margin-left:4px;';

    textWrap.appendChild(labelEl);
    textWrap.appendChild(valueEl);
    valueEl.appendChild(unitEl);

    row.appendChild(iconWrap);
    row.appendChild(textWrap);

    return row;
  }

  public show(data: PlanetData): void {
    this.titleEl.textContent = data.name;
    this.subTitleEl.textContent = data.nameEn;

    this.dataRows.innerHTML = '';
    this.dataRows.appendChild(this.createRow(ICONS.mass, '质量', data.mass.toFixed(data.mass < 1 ? 3 : 1), '地球质量'));
    this.dataRows.appendChild(this.createRow(ICONS.diameter, '直径', data.diameter.toLocaleString(), '公里'));
    this.dataRows.appendChild(this.createRow(ICONS.period, '公转周期', data.orbitalPeriod.toLocaleString(), '地球日'));
    this.dataRows.appendChild(this.createRow(ICONS.distance, '与太阳距离', data.distance.toFixed(2), '天文单位'));

    if (!this.isOpen) {
      this.isOpen = true;
      this.container.style.opacity = '1';
      this.container.style.transform = 'translateY(0)';
      this.container.style.pointerEvents = 'auto';
      requestAnimationFrame(() => {
        this.cardInner.style.transform = 'rotateY(0deg)';
      });
    }
  }

  public close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.cardInner.style.transform = 'rotateY(-90deg)';
    this.container.style.opacity = '0';
    this.container.style.transform = 'translateY(40px)';
    this.container.style.pointerEvents = 'none';
    setTimeout(() => {
      if (this.onCloseCallback) this.onCloseCallback();
    }, 300);
  }

  public onClose(cb: () => void): void {
    this.onCloseCallback = cb;
  }
}
