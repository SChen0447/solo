import { DNAHelix, SlotInfo } from './DNAHelix';

const BASE_TYPES = ['A', 'T', 'C', 'G'] as const;
const BASE_COLORS: Record<string, string> = {
  A: '#FF4757',
  T: '#FFA502',
  C: '#2ED573',
  G: '#1E90FF',
};
const BASE_GLOW: Record<string, string> = {
  A: 'rgba(255,71,87,0.5)',
  T: 'rgba(255,165,2,0.5)',
  C: 'rgba(46,213,115,0.5)',
  G: 'rgba(30,144,255,0.5)',
};

export interface BaseCard {
  type: string;
  element: HTMLDivElement;
  rackIndex: number;
}

export type PlacementResult =
  | { success: true; slotIndex: number }
  | { success: false; reason: 'wrong_base' | 'no_slot' };

type OnPlaceCallback = (result: PlacementResult) => void;

export class BasesManager {
  private rackEl: HTMLDivElement;
  private helix: DNAHelix;
  private cards: BaseCard[] = [];
  private dragging: BaseCard | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private onPlace: OnPlaceCallback | null = null;
  private snapThreshold: number = 50;

  constructor(rackEl: HTMLDivElement, helix: DNAHelix) {
    this.rackEl = rackEl;
    this.helix = helix;
    this.bindEvents();
  }

  setOnPlaceCallback(cb: OnPlaceCallback): void {
    this.onPlace = cb;
  }

  generateBases(count: number = 4): void {
    this.clearCards();
    for (let i = 0; i < count; i++) {
      const type = BASE_TYPES[Math.floor(Math.random() * BASE_TYPES.length)];
      this.createCard(type, i);
    }
  }

  private clearCards(): void {
    this.cards.forEach((c) => c.element.remove());
    this.cards = [];
    this.dragging = null;
  }

  private createCard(type: string, index: number): void {
    const el = document.createElement('div');
    el.className = 'base-card';
    el.textContent = type;
    el.style.background = BASE_COLORS[type];
    el.style.color = '#fff';
    el.style.boxShadow = `0 0 12px ${BASE_GLOW[type]}, 0 0 4px ${BASE_GLOW[type]}`;
    el.style.border = '2px solid rgba(255,255,255,0.2)';
    el.dataset.type = type;
    el.dataset.rackIndex = String(index);

    const card: BaseCard = { type, element: el, rackIndex: index };
    this.cards.push(card);
    this.rackEl.appendChild(el);

    el.addEventListener('mousedown', (e) => this.startDrag(card, e));
    el.addEventListener('touchstart', (e) => this.startDragTouch(card, e), { passive: false });
  }

  private bindEvents(): void {
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', () => this.onTouchEnd());
  }

  private startDrag(card: BaseCard, e: MouseEvent): void {
    e.preventDefault();
    this.dragging = card;
    this.dragOffsetX = 25;
    this.dragOffsetY = 25;
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    card.element.classList.add('dragging');
    card.element.style.left = `${e.clientX - this.dragOffsetX}px`;
    card.element.style.top = `${e.clientY - this.dragOffsetY}px`;
  }

  private startDragTouch(card: BaseCard, e: TouchEvent): void {
    e.preventDefault();
    const t = e.touches[0];
    this.dragging = card;
    this.dragOffsetX = 25;
    this.dragOffsetY = 25;
    this.mouseX = t.clientX;
    this.mouseY = t.clientY;

    card.element.classList.add('dragging');
    card.element.style.left = `${t.clientX - this.dragOffsetX}px`;
    card.element.style.top = `${t.clientY - this.dragOffsetY}px`;
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.updateDrag();
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const t = e.touches[0];
    this.mouseX = t.clientX;
    this.mouseY = t.clientY;
    this.updateDrag();
  }

  private updateDrag(): void {
    if (!this.dragging) return;
    this.dragging.element.style.left = `${this.mouseX - this.dragOffsetX}px`;
    this.dragging.element.style.top = `${this.mouseY - this.dragOffsetY}px`;

    const nearest = this.findNearestSlot(this.mouseX, this.mouseY);
    if (nearest !== null) {
      this.helix.setHighlightSlot(nearest.index);
    } else {
      this.helix.setHighlightSlot(-1);
    }
  }

  private onMouseUp(): void {
    this.endDrag();
  }

  private onTouchEnd(): void {
    this.endDrag();
  }

  private endDrag(): void {
    if (!this.dragging) return;
    const card = this.dragging;
    this.dragging = null;
    this.helix.setHighlightSlot(-1);

    const nearest = this.findNearestSlot(this.mouseX, this.mouseY);

    if (nearest) {
      if (nearest.baseType === card.type && !nearest.filled) {
        card.element.remove();
        this.cards = this.cards.filter((c) => c !== card);
        if (this.onPlace) {
          this.onPlace({ success: true, slotIndex: nearest.index });
        }
        this.ensureMinCards();
        return;
      } else if (!nearest.filled) {
        this.bounceBack(card);
        if (this.onPlace) {
          this.onPlace({ success: false, reason: 'wrong_base' });
        }
        return;
      }
    }

    this.bounceBack(card);
    if (this.onPlace) {
      this.onPlace({ success: false, reason: 'no_slot' });
    }
  }

  private bounceBack(card: BaseCard): void {
    card.element.classList.remove('dragging');
    card.element.style.left = '';
    card.element.style.top = '';
    card.element.style.transition = 'transform 0.35s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
    card.element.style.transform = 'scale(0.8)';
    requestAnimationFrame(() => {
      card.element.style.transform = 'scale(1)';
    });
  }

  private findNearestSlot(
    mx: number,
    my: number,
  ): { index: number; baseType: string; filled: boolean } | null {
    const slots = this.helix.getSlotPositions();
    let bestDist = this.snapThreshold;
    let bestSlot: { index: number; baseType: string; filled: boolean } | null = null;

    for (const s of slots) {
      if (s.filled) continue;
      const dx = mx - s.x;
      const dy = my - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestSlot = s;
      }
    }
    return bestSlot;
  }

  private ensureMinCards(): void {
    const activeCards = this.cards.filter((c) => c !== this.dragging);
    if (activeCards.length < 4) {
      const needed = 4 - activeCards.length;
      const startIdx = this.cards.length;
      for (let i = 0; i < needed; i++) {
        const type = BASE_TYPES[Math.floor(Math.random() * BASE_TYPES.length)];
        this.createCard(type, startIdx + i);
      }
    }
  }

  update(): void {}
}
