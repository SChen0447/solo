import type { AnalyzedImage } from './imageAnalyzer';
import { extractTitle } from './imageAnalyzer';

export class Lightbox {
  private root: HTMLElement;
  private overlay: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private currentImage: AnalyzedImage | null = null;
  private originRect: DOMRect | null = null;
  private onClose: (() => void) | null = null;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  open(image: AnalyzedImage, originElement: HTMLElement, onClose?: () => void): void {
    this.currentImage = image;
    this.originRect = originElement.getBoundingClientRect();
    this.onClose = onClose || null;
    this.render();
    this.bindEvents();
    requestAnimationFrame(() => this.animateIn());
  }

  private render(): void {
    if (!this.currentImage) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'lightbox-overlay';

    this.content = document.createElement('div');
    this.content.className = 'lightbox-content';

    const leftPanel = document.createElement('div');
    leftPanel.className = 'lightbox-left';

    const imgContainer = document.createElement('div');
    imgContainer.className = 'lightbox-image-container';

    const img = document.createElement('img');
    img.src = this.currentImage.url;
    img.alt = extractTitle(this.currentImage.name);
    img.className = 'lightbox-image';

    imgContainer.appendChild(img);
    leftPanel.appendChild(imgContainer);

    const rightPanel = document.createElement('div');
    rightPanel.className = 'lightbox-right';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.close());

    const title = document.createElement('h2');
    title.className = 'lightbox-title';
    title.textContent = extractTitle(this.currentImage.name);

    const infoList = document.createElement('div');
    infoList.className = 'lightbox-info';

    infoList.appendChild(this.createInfoRow('文件名', this.currentImage.name));
    infoList.appendChild(this.createInfoRow('尺寸', `${this.currentImage.width} × ${this.currentImage.height} px`));

    const colorsRow = document.createElement('div');
    colorsRow.className = 'info-row';
    const colorsLabel = document.createElement('span');
    colorsLabel.className = 'info-label';
    colorsLabel.textContent = '主色调';
    const colorsValue = document.createElement('span');
    colorsValue.className = 'info-value';
    const colorSwatches = document.createElement('div');
    colorSwatches.className = 'color-swatches';
    for (const color of this.currentImage.dominantColors) {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      swatch.title = color;
      colorSwatches.appendChild(swatch);
    }
    colorsValue.appendChild(colorSwatches);
    colorsRow.appendChild(colorsLabel);
    colorsRow.appendChild(colorsValue);
    infoList.appendChild(colorsRow);

    infoList.appendChild(this.createInfoRow('权重分', `${this.currentImage.weight} / 100`));
    infoList.appendChild(this.createInfoRow('平均饱和度', `${this.currentImage.avgSaturation}%`));
    infoList.appendChild(this.createInfoRow('构图密度', `${this.currentImage.compositionDensity}%`));

    const weightBar = document.createElement('div');
    weightBar.className = 'weight-bar';
    const weightFill = document.createElement('div');
    weightFill.className = 'weight-fill';
    weightFill.style.width = `${this.currentImage.weight}%`;
    weightBar.appendChild(weightFill);

    rightPanel.appendChild(closeBtn);
    rightPanel.appendChild(title);
    rightPanel.appendChild(infoList);
    rightPanel.appendChild(weightBar);

    this.content.appendChild(leftPanel);
    this.content.appendChild(rightPanel);
    this.overlay.appendChild(this.content);
    this.root.appendChild(this.overlay);
  }

  private createInfoRow(label: string, value: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'info-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'info-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'info-value';
    valueEl.textContent = value;
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    return row;
  }

  private bindEvents(): void {
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this.escapeHandler);

    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
    }
  }

  private animateIn(): void {
    if (!this.overlay || !this.content || !this.originRect) return;

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const originCenterX = this.originRect.left + this.originRect.width / 2;
    const originCenterY = this.originRect.top + this.originRect.height / 2;

    const offsetX = originCenterX - screenCenterX;
    const offsetY = originCenterY - screenCenterY;
    const scale = Math.min(this.originRect.width / window.innerWidth, this.originRect.height / window.innerHeight);

    this.content.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    this.content.style.opacity = '0';

    requestAnimationFrame(() => {
      if (this.overlay && this.content) {
        this.overlay.style.transition = 'background-color 0.3s ease-out';
        this.overlay.style.backgroundColor = '#1A1A1AE6';
        this.content.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        this.content.style.transform = 'translate(0, 0) scale(1)';
        this.content.style.opacity = '1';
      }
    });
  }

  close(): void {
    if (!this.overlay || !this.content) return;

    this.content.style.transition = 'transform 0.2s ease-in, opacity 0.2s ease-in';
    this.overlay.style.transition = 'background-color 0.2s ease-in';

    if (this.originRect) {
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;
      const originCenterX = this.originRect.left + this.originRect.width / 2;
      const originCenterY = this.originRect.top + this.originRect.height / 2;
      const offsetX = originCenterX - screenCenterX;
      const offsetY = originCenterY - screenCenterY;
      const scale = Math.min(this.originRect.width / window.innerWidth, this.originRect.height / window.innerHeight);

      this.content.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }
    this.content.style.opacity = '0';
    this.overlay.style.backgroundColor = 'transparent';

    const cleanup = () => {
      this.destroy();
      if (this.onClose) this.onClose();
    };
    setTimeout(cleanup, 200);
  }

  private destroy(): void {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.content = null;
    this.currentImage = null;
    this.originRect = null;
    this.onClose = null;
  }
}
