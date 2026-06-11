import { KnotType } from './knot';

export interface UICallbacks {
  onKnotSelect: (type: KnotType) => void;
  onReset: () => void;
}

export class UIManager {
  private nodeCountEl: HTMLElement;
  private knotCountEl: HTMLElement;
  private ropeLengthEl: HTMLElement;
  private knotButtons: NodeListOf<HTMLButtonElement>;
  private resetBtn: HTMLButtonElement;
  private callbacks: UICallbacks;
  private activeKnot: KnotType = KnotType.NONE;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.nodeCountEl = document.getElementById('nodeCount')!;
    this.knotCountEl = document.getElementById('knotCount')!;
    this.ropeLengthEl = document.getElementById('ropeLength')!;
    this.knotButtons = document.querySelectorAll<HTMLButtonElement>('[data-knot]');
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.knotButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.knot as KnotType;
        this.handleKnotClick(type);
      });
    });

    this.resetBtn.addEventListener('click', () => {
      this.callbacks.onReset();
    });
  }

  private handleKnotClick(type: KnotType): void {
    if (this.activeKnot === type) {
      this.activeKnot = KnotType.NONE;
      this.updateKnotButtons();
      this.callbacks.onKnotSelect(KnotType.NONE);
    } else {
      this.activeKnot = type;
      this.updateKnotButtons();
      this.callbacks.onKnotSelect(type);
    }
  }

  private updateKnotButtons(): void {
    this.knotButtons.forEach(btn => {
      const type = btn.dataset.knot as KnotType;
      if (type === this.activeKnot) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public updateData(nodeCount: number, knotCount: number, ropeLength: number): void {
    this.nodeCountEl.textContent = nodeCount.toString();
    this.knotCountEl.textContent = knotCount.toString();
    this.ropeLengthEl.textContent = `${ropeLength.toFixed(0)} px`;
  }

  public clearActiveKnot(): void {
    this.activeKnot = KnotType.NONE;
    this.updateKnotButtons();
  }

  public setActiveKnot(type: KnotType): void {
    this.activeKnot = type;
    this.updateKnotButtons();
  }
}
