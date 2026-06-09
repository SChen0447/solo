import type { Page, CharacterData } from './page';

interface ScatterState {
  character: CharacterData;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  startTime: number;
  duration: number;
}

export class Interaction {
  private page: Page;
  private container: HTMLElement;
  private hoverRadius: number = 3;
  private scatterRadius: number = 60;
  private affectedSet: Set<number> = new Set();
  private scatterStates: Map<number, ScatterState> = new Map();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private lastMoveTime: number = 0;
  private mouseActive: boolean = false;
  private onMoveCallback: ((x: number, y: number) => void) | null = null;
  private lastTapTime: number = 0;
  private lastTapX: number = 0;
  private lastTapY: number = 0;

  constructor(page: Page, container: HTMLElement) {
    this.page = page;
    this.container = container;

    this.container.addEventListener('mousemove', this.handleMouseMove);
    this.container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.container.addEventListener('mouseleave', this.handleMouseLeave);
    this.container.addEventListener('dblclick', this.handleDoubleClick);
    this.container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd);
  }

  private getPaperCoords(clientX: number, clientY: number): { x: number; y: number } {
    const paperEl = this.page.getPaperElement();
    const rect = paperEl.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const coords = this.getPaperCoords(e.clientX, e.clientY);
    this.mouseX = coords.x;
    this.mouseY = coords.y;
    this.mouseActive = true;
    this.lastMoveTime = performance.now();

    if (this.onMoveCallback) {
      this.onMoveCallback(e.clientX, e.clientY);
    }

    this.handleHover();
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const coords = this.getPaperCoords(touch.clientX, touch.clientY);
    this.mouseX = coords.x;
    this.mouseY = coords.y;
    this.mouseActive = true;
    this.lastMoveTime = performance.now();

    if (this.onMoveCallback) {
      this.onMoveCallback(touch.clientX, touch.clientY);
    }

    this.handleHover();
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const coords = this.getPaperCoords(touch.clientX, touch.clientY);
    this.mouseX = coords.x;
    this.mouseY = coords.y;
    this.mouseActive = true;

    if (this.onMoveCallback) {
      this.onMoveCallback(touch.clientX, touch.clientY);
    }

    this.handleHover();
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    this.mouseActive = false;
    if (e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const now = performance.now();
    const dx = touch.clientX - this.lastTapX;
    const dy = touch.clientY - this.lastTapY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (now - this.lastTapTime < 400 && dist < 50) {
      this.handleDoubleClick();
    }

    this.lastTapTime = now;
    this.lastTapX = touch.clientX;
    this.lastTapY = touch.clientY;
  };

  private handleMouseLeave = (): void => {
    this.mouseActive = false;
  };

  handleHover(): void {
    const now = performance.now();
    const chars = this.page.getCharacters();
    const paperW = this.page.getWidth();
    const paperH = this.page.getHeight();

    if (this.mouseX < 0 || this.mouseX > paperW || this.mouseY < 0 || this.mouseY > paperH) {
      return;
    }

    for (const c of chars) {
      const dx = c.x + c.offsetX - this.mouseX;
      const dy = c.y + c.offsetY - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.scatterRadius && !this.scatterStates.has(c.id)) {
        if (dist < this.hoverRadius) {
          c.targetGlow = 1;
          c.glowStartTime = now;
          this.affectedSet.add(c.id);
        }

        const angle = Math.atan2(dy, dx);
        const scatterDist = 10 + Math.random() * 10;
        const scatterX = Math.cos(angle) * scatterDist;
        const scatterY = Math.sin(angle) * scatterDist;

        this.scatterStates.set(c.id, {
          character: c,
          startX: c.offsetX,
          startY: c.offsetY,
          offsetX: scatterX,
          offsetY: scatterY,
          startTime: now,
          duration: 600,
        });
      }
    }
  }

  handleDoubleClick = (): void => {
    const mode = this.page.getLayoutMode();
    if (mode === 'cloud') {
      this.page.layoutAsParagraph();
    } else {
      this.page.scatter();
    }
  };

  update(deltaTime: number): void {
    const now = performance.now();

    for (const [id, state] of this.scatterStates) {
      const elapsed = now - state.startTime;
      if (elapsed >= state.duration) {
        state.character.offsetX = 0;
        state.character.offsetY = 0;
        this.scatterStates.delete(id);
      } else {
        const t = elapsed / state.duration;
        const ease = 1 - Math.pow(1 - t, 3);
        state.character.offsetX = state.startX + (0 - state.startX) * ease;
        state.character.offsetY = state.startY + (0 - state.startY) * ease;
      }
    }

    if (!this.mouseActive || now - this.lastMoveTime > 200) {
      return;
    }
  }

  setMouseMoveCallback(cb: (x: number, y: number) => void): void {
    this.onMoveCallback = cb;
  }

  getMousePos(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  destroy(): void {
    this.container.removeEventListener('mousemove', this.handleMouseMove);
    this.container.removeEventListener('touchmove', this.handleTouchMove);
    this.container.removeEventListener('mouseleave', this.handleMouseLeave);
    this.container.removeEventListener('dblclick', this.handleDoubleClick);
    this.container.removeEventListener('touchstart', this.handleTouchStart);
    this.container.removeEventListener('touchend', this.handleTouchEnd);
  }
}
