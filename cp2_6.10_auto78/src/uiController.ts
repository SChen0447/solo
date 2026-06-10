import confetti from 'canvas-confetti';
import type { BlendMode } from './renderer';
import type { TextureInfo, TextureManager } from './textureManager';

export type SectionType = 'mix' | 'background';

export interface UIControllerCallbacks {
  onMixBlendModeChange: (mode: BlendMode) => void;
  onBgBlendModeChange: (mode: BlendMode) => void;
  onTextureApply: (texture: TextureInfo, section: SectionType) => void;
  onResize: () => void;
}

export class UIController {
  private mixBlendSelector: HTMLSelectElement;
  private bgBlendSelector: HTMLSelectElement;
  private mixBlendLabel: HTMLElement;
  private bgBlendLabel: HTMLElement;
  private textureLibrary: HTMLElement;
  private mainContainer: HTMLElement;
  private divider: HTMLElement;
  private mixSection: HTMLElement;
  private bgSection: HTMLElement;

  private activeSection: SectionType = 'mix';
  private selectedTextureId: string | null = null;
  private callbacks: UIControllerCallbacks;
  private isDragging: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private startMixWidth: number = 0;
  private startBgWidth: number = 0;
  private startMixHeight: number = 0;
  private startBgHeight: number = 0;
  private isMobile: boolean = false;

  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private mouseUpHandler: ((e: MouseEvent) => void) | null = null;
  private touchMoveHandler: ((e: TouchEvent) => void) | null = null;
  private touchEndHandler: ((e: TouchEvent) => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(textureManager: TextureManager, callbacks: UIControllerCallbacks) {
    this.mixBlendSelector = document.getElementById('mixBlendSelector') as HTMLSelectElement;
    this.bgBlendSelector = document.getElementById('bgBlendSelector') as HTMLSelectElement;
    this.mixBlendLabel = document.getElementById('mixBlendLabel') as HTMLElement;
    this.bgBlendLabel = document.getElementById('bgBlendLabel') as HTMLElement;
    this.textureLibrary = document.getElementById('textureLibrary') as HTMLElement;
    this.mainContainer = document.getElementById('mainContainer') as HTMLElement;
    this.divider = document.getElementById('divider') as HTMLElement;
    this.mixSection = document.getElementById('mixBlendSection') as HTMLElement;
    this.bgSection = document.getElementById('bgBlendSection') as HTMLElement;
    this.callbacks = callbacks;

    this.checkMobile();
    this.bindSelectorEvents();
    this.bindDividerEvents();
    this.bindSectionClickEvents();
    this.renderTextureLibrary(textureManager.getTextures());
    this.bindWindowResize();
  }

  public setMixBlendMode(mode: BlendMode): void {
    this.mixBlendSelector.value = mode;
    this.mixBlendLabel.textContent = `mix-blend-mode: ${mode}`;
  }

  public setBgBlendMode(mode: BlendMode): void {
    this.bgBlendSelector.value = mode;
    this.bgBlendLabel.textContent = `background-blend-mode: ${mode}`;
  }

  public setActiveSection(section: SectionType): void {
    this.activeSection = section;
    this.updateSectionHighlight();
  }

  public renderTextureLibrary(textures: TextureInfo[]): void {
    this.textureLibrary.innerHTML = '';
    textures.forEach((texture) => {
      const card = document.createElement('div');
      card.className = 'texture-card';
      card.dataset.textureId = texture.id;
      card.title = texture.name;

      card.appendChild(texture.thumbnail);

      const nameLabel = document.createElement('span');
      nameLabel.className = 'texture-name';
      nameLabel.textContent = texture.name;
      card.appendChild(nameLabel);

      card.addEventListener('click', () => {
        this.selectTexture(texture);
      });

      this.textureLibrary.appendChild(card);
    });
  }

  public destroy(): void {
    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.mouseUpHandler) {
      document.removeEventListener('mouseup', this.mouseUpHandler);
    }
    if (this.touchMoveHandler) {
      document.removeEventListener('touchmove', this.touchMoveHandler);
    }
    if (this.touchEndHandler) {
      document.removeEventListener('touchend', this.touchEndHandler);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private bindSelectorEvents(): void {
    this.mixBlendSelector.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as BlendMode;
      this.setMixBlendMode(mode);
      this.callbacks.onMixBlendModeChange(mode);
      this.fireConfetti(this.mixBlendSelector);
    });

    this.bgBlendSelector.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as BlendMode;
      this.setBgBlendMode(mode);
      this.callbacks.onBgBlendModeChange(mode);
      this.fireConfetti(this.bgBlendSelector);
    });
  }

  private bindDividerEvents(): void {
    this.divider.addEventListener('mousedown', (e) => {
      this.startDrag(e.clientX, e.clientY);
    });

    this.divider.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.startDrag(touch.clientX, touch.clientY);
      e.preventDefault();
    }, { passive: false });

    this.mouseMoveHandler = (e: MouseEvent) => {
      if (!this.isDragging) return;
      this.onDrag(e.clientX, e.clientY);
    };

    this.mouseUpHandler = () => {
      this.endDrag();
    };

    this.touchMoveHandler = (e: TouchEvent) => {
      if (!this.isDragging) return;
      const touch = e.touches[0];
      this.onDrag(touch.clientX, touch.clientY);
      e.preventDefault();
    };

    this.touchEndHandler = () => {
      this.endDrag();
    };

    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
    document.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    document.addEventListener('touchend', this.touchEndHandler);
  }

  private bindSectionClickEvents(): void {
    [this.mixSection, this.bgSection].forEach((section) => {
      section.addEventListener('click', () => {
        const sectionType = section.dataset.section as SectionType;
        this.setActiveSection(sectionType);
      });
    });

    this.updateSectionHighlight();
  }

  private bindWindowResize(): void {
    window.addEventListener('resize', () => {
      this.checkMobile();
      this.callbacks.onResize();
    });

    try {
      this.resizeObserver = new ResizeObserver(() => {
        this.callbacks.onResize();
      });
      this.resizeObserver.observe(this.mainContainer);
      this.resizeObserver.observe(this.mixSection);
      this.resizeObserver.observe(this.bgSection);
    } catch {
      // ResizeObserver not available in older browsers
    }
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  private startDrag(clientX: number, clientY: number): void {
    this.isDragging = true;
    this.divider.classList.add('dragging');
    this.startX = clientX;
    this.startY = clientY;
    this.startMixWidth = this.mixSection.getBoundingClientRect().width;
    this.startBgWidth = this.bgSection.getBoundingClientRect().width;
    this.startMixHeight = this.mixSection.getBoundingClientRect().height;
    this.startBgHeight = this.bgSection.getBoundingClientRect().height;

    this.mainContainer.style.transition = 'none';
    this.mixSection.style.transition = 'none';
    this.bgSection.style.transition = 'none';
  }

  private onDrag(clientX: number, clientY: number): void {
    if (this.isMobile) {
      const deltaY = clientY - this.startY;
      const total = this.startMixHeight + this.startBgHeight;
      let newMixHeight = Math.max(200, this.startMixHeight + deltaY);
      newMixHeight = Math.min(total - 200, newMixHeight);
      const newBgHeight = total - newMixHeight;

      this.mixSection.style.flex = `0 0 ${newMixHeight}px`;
      this.bgSection.style.flex = `0 0 ${newBgHeight}px`;
    } else {
      const deltaX = clientX - this.startX;
      const total = this.startMixWidth + this.startBgWidth;
      let newMixWidth = Math.max(200, this.startMixWidth + deltaX);
      newMixWidth = Math.min(total - 200, newMixWidth);
      const newBgWidth = total - newMixWidth;

      this.mixSection.style.flex = `0 0 ${newMixWidth}px`;
      this.bgSection.style.flex = `0 0 ${newBgWidth}px`;
    }
  }

  private endDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.divider.classList.remove('dragging');

    this.mainContainer.style.transition = '';
    this.mixSection.style.transition = 'flex 0.3s ease';
    this.bgSection.style.transition = 'flex 0.3s ease';

    this.callbacks.onResize();
  }

  private selectTexture(texture: TextureInfo): void {
    this.selectedTextureId = texture.id;
    this.updateTextureCardSelection();
    this.fireConfetti(
      this.textureLibrary.querySelector(`[data-texture-id="${texture.id}"]`) as HTMLElement
    );
    this.callbacks.onTextureApply(texture, this.activeSection);
  }

  private updateTextureCardSelection(): void {
    const cards = this.textureLibrary.querySelectorAll('.texture-card');
    cards.forEach((card) => {
      const el = card as HTMLElement;
      if (el.dataset.textureId === this.selectedTextureId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  private updateSectionHighlight(): void {
    const sections = [this.mixSection, this.bgSection];
    sections.forEach((section) => {
      const sectionType = section.dataset.section as SectionType;
      if (sectionType === this.activeSection) {
        section.style.outline = '2px solid rgba(79, 195, 247, 0.3)';
        section.style.outlineOffset = '-2px';
        section.style.borderRadius = '8px';
      } else {
        section.style.outline = 'none';
      }
    });
  }

  private fireConfetti(target: HTMLElement): void {
    try {
      const rect = target.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 12,
        spread: 50,
        origin: { x, y },
        colors: ['#4fc3f7', '#ff6b6b', '#4ecdc4', '#ffd60a', '#00ff88'],
        scalar: 0.6,
        gravity: 1.2,
        ticks: 60
      });
    } catch {
      // Confetti not available, silently ignore
    }
  }
}
