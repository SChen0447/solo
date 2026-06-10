import type { LatticeNode } from './NetworkManager';

type RecombineRequestCallback = () => void;
type EscapeCallback = () => void;

export class UIOverlay {
  private infoCard: HTMLElement;
  private memoryTextEl: HTMLElement;
  private recombineBtn: HTMLElement;
  private onRecombineRequest: RecombineRequestCallback | null = null;
  private onEscape: EscapeCallback | null = null;

  constructor(root: HTMLElement) {
    const card = root.querySelector('#info-card');
    const textEl = root.querySelector('#memory-text');
    const btn = root.querySelector('#recombine-btn');

    if (!card || !textEl || !btn) {
      throw new Error('UIOverlay: required DOM elements not found');
    }

    this.infoCard = card as HTMLElement;
    this.memoryTextEl = textEl as HTMLElement;
    this.recombineBtn = btn as HTMLElement;

    this.recombineBtn.addEventListener('click', () => {
      if (this.onRecombineRequest) {
        this.onRecombineRequest();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.onEscape) {
          this.onEscape();
        }
      }
    });
  }

  public setOnRecombineRequest(callback: RecombineRequestCallback): void {
    this.onRecombineRequest = callback;
  }

  public setOnEscape(callback: EscapeCallback): void {
    this.onEscape = callback;
  }

  public showMemory(node: LatticeNode): void {
    this.memoryTextEl.textContent = node.memoryText;
    this.infoCard.classList.add('visible');
  }

  public hideMemory(): void {
    this.infoCard.classList.remove('visible');
  }
}
