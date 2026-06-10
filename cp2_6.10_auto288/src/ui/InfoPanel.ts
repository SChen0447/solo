import { InfoData, VentInfo, SpeciesInfo } from '../types';

export class InfoPanel {
  private panel: HTMLElement;
  private isVisible: boolean = false;
  private currentInfo: InfoData | null = null;

  constructor(container: HTMLElement) {
    this.panel = container;
  }

  public show(info: InfoData): void {
    this.currentInfo = info;
    const content = this.renderContent(info);
    this.panel.innerHTML = '';

    const fadeContent = document.createElement('div');
    fadeContent.className = 'cross-fade';
    fadeContent.innerHTML = content;
    this.panel.appendChild(fadeContent);

    this.panel.classList.add('visible');
    this.isVisible = true;
  }

  public hide(): void {
    this.panel.classList.remove('visible');
    this.isVisible = false;
    this.currentInfo = null;
  }

  private renderContent(info: InfoData): string {
    const isVent = 'temperature' in info && typeof (info as VentInfo).temperature === 'number';

    if (isVent) {
      const vent = info as VentInfo;
      return `
        <h2>${this.escapeHtml(vent.name)}</h2>
        <div class="meta">
          <div class="meta-item">深度：<span>${vent.depth}米</span></div>
          <div class="meta-item">温度：<span>${vent.temperature}℃</span></div>
        </div>
        <p class="desc">${this.escapeHtml(vent.description)}</p>
      `;
    } else {
      const species = info as SpeciesInfo;
      return `
        <h2>${this.escapeHtml(species.name)}</h2>
        <div class="meta">
          <div class="meta-item">栖息深度：<span>${this.escapeHtml(species.depth)}</span></div>
          <div class="meta-item">适应温度：<span>${this.escapeHtml(species.temperature)}</span></div>
        </div>
        <p class="desc">${this.escapeHtml(species.description)}</p>
      `;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  public getCurrentInfo(): InfoData | null {
    return this.currentInfo;
  }
}
