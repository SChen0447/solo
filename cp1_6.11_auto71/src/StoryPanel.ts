import type { StarData } from './types';

export class StoryPanel {
  private panel: HTMLElement;
  private closeButton: HTMLElement;
  private starNameEl: HTMLElement;
  private ancientNamesEl: HTMLElement;
  private constellationEl: HTMLElement;
  private storyEl: HTMLElement;
  private isVisible: boolean = false;
  private animationDuration: number = 400;

  constructor() {
    this.panel = document.createElement('div');
    this.panel.className = 'story-panel';
    this.panel.id = 'storyPanel';

    this.closeButton = document.createElement('button');
    this.closeButton.className = 'story-panel-close';
    this.closeButton.innerHTML = '&times;';
    this.closeButton.addEventListener('click', () => this.hide());

    const content = document.createElement('div');
    content.className = 'story-panel-content';

    this.starNameEl = document.createElement('h2');
    this.starNameEl.className = 'story-panel-title';

    this.constellationEl = document.createElement('div');
    this.constellationEl.className = 'story-panel-constellation';

    this.ancientNamesEl = document.createElement('div');
    this.ancientNamesEl.className = 'story-panel-ancient';

    this.storyEl = document.createElement('p');
    this.storyEl.className = 'story-panel-text';

    content.appendChild(this.starNameEl);
    content.appendChild(this.constellationEl);
    content.appendChild(this.ancientNamesEl);
    content.appendChild(this.storyEl);

    this.panel.appendChild(this.closeButton);
    this.panel.appendChild(content);

    document.body.appendChild(this.panel);
  }

  public show(star: StarData): void {
    if (this.isVisible) {
      this.updateContent(star);
      return;
    }

    this.updateContent(star);
    this.isVisible = true;
    this.panel.style.display = 'block';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.panel.classList.add('visible');
      });
    });
  }

  public hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.panel.classList.remove('visible');

    setTimeout(() => {
      if (!this.isVisible) {
        this.panel.style.display = 'none';
      }
    }, this.animationDuration);
  }

  private updateContent(star: StarData): void {
    this.starNameEl.textContent = star.name;
    this.constellationEl.textContent = `所属星座：${star.constellationName}`;
    this.ancientNamesEl.textContent = `历代星官：${star.ancientNames.join('、')}`;
    this.storyEl.textContent = star.story;
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  public dispose(): void {
    this.closeButton.removeEventListener('click', () => this.hide());
    if (this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
  }
}
