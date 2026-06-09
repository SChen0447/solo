import gsap from 'gsap';
import { Artwork } from './galleryData';

export class ArtDetailPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private closeBtn: HTMLElement;
  private titleEl: HTMLElement;
  private artistEl: HTMLElement;
  private yearEl: HTMLElement;
  private descEl: HTMLElement;
  private imageEl: HTMLImageElement;
  private isVisible: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.panel = document.createElement('div');
    this.closeBtn = document.createElement('button');
    this.titleEl = document.createElement('h2');
    this.artistEl = document.createElement('p');
    this.yearEl = document.createElement('span');
    this.descEl = document.createElement('p');
    this.imageEl = document.createElement('img');

    this.setupStyles();
    this.setupStructure();
    this.setupEvents();
    this.hide(true);
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000;
      pointer-events: none;
    `;

    this.panel.style.cssText = `
      width: 360px;
      max-width: calc(100vw - 48px);
      background: rgba(20, 20, 30, 0.8);
      backdrop-filter: blur(15px);
      -webkit-backdrop-filter: blur(15px);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
      padding: 24px;
      color: #F5F0E8;
      font-family: Georgia, 'Times New Roman', serif;
      pointer-events: auto;
      overflow: hidden;
    `;

    this.closeBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      width: 28px;
      height: 28px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      color: #F5F0E8;
      font-size: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
      font-family: inherit;
    `;
    this.closeBtn.textContent = '×';
    this.closeBtn.title = '关闭';

    this.titleEl.style.cssText = `
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #F5F0E8;
      letter-spacing: 0.5px;
      padding-right: 32px;
      line-height: 1.3;
    `;

    this.artistEl.style.cssText = `
      font-size: 15px;
      margin: 0 0 4px 0;
      color: rgba(245, 240, 232, 0.85);
      font-style: italic;
    `;

    this.yearEl.style.cssText = `
      font-size: 13px;
      color: rgba(245, 240, 232, 0.6);
      display: inline-block;
      margin-bottom: 16px;
    `;

    this.imageEl.style.cssText = `
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: block;
    `;

    this.descEl.style.cssText = `
      font-size: 14px;
      line-height: 1.7;
      color: rgba(245, 240, 232, 0.8);
      margin: 0;
      letter-spacing: 0.3px;
    `;
  }

  private setupStructure(): void {
    const metaContainer = document.createElement('div');
    metaContainer.style.cssText = `margin-bottom: 16px;`;
    metaContainer.appendChild(this.artistEl);
    metaContainer.appendChild(this.yearEl);

    this.panel.appendChild(this.closeBtn);
    this.panel.appendChild(this.titleEl);
    this.panel.appendChild(metaContainer);
    this.panel.appendChild(this.imageEl);
    this.panel.appendChild(this.descEl);
    this.container.appendChild(this.panel);

    document.body.appendChild(this.container);
  }

  private setupEvents(): void {
    this.closeBtn.addEventListener('click', () => {
      this.hide();
    });

    this.closeBtn.addEventListener('mouseenter', () => {
      this.closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    this.closeBtn.addEventListener('mouseleave', () => {
      this.closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    });
  }

  public show(artwork: Artwork): void {
    this.titleEl.textContent = artwork.title;
    this.artistEl.textContent = artwork.artist;
    this.yearEl.textContent = artwork.year;
    this.descEl.textContent = artwork.description;
    this.imageEl.src = artwork.imageUrl;
    this.imageEl.alt = artwork.title;

    if (!this.isVisible) {
      this.isVisible = true;
      this.panel.style.display = 'block';

      gsap.fromTo(
        this.panel,
        {
          x: 100,
          opacity: 0,
          scale: 0.95
        },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: 'power3.out'
        }
      );

      gsap.fromTo(
        [this.titleEl, this.artistEl, this.yearEl, this.imageEl, this.descEl],
        {
          y: 15,
          opacity: 0
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
          stagger: 0.06,
          delay: 0.1
        }
      );
    } else {
      gsap.fromTo(
        this.panel,
        { scale: 0.98 },
        { scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    }
  }

  public hide(immediate: boolean = false): void {
    if (!this.isVisible && !immediate) return;

    if (immediate) {
      this.panel.style.display = 'none';
      this.isVisible = false;
      return;
    }

    this.isVisible = false;

    gsap.to(this.panel, {
      x: 100,
      opacity: 0,
      scale: 0.95,
      duration: 0.4,
      ease: 'power3.in',
      onComplete: () => {
        this.panel.style.display = 'none';
      }
    });
  }

  public dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
