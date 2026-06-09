import type { FossilPiece } from './fossilPuzzle';

export interface UIControllerEvents {
  onReset?: () => void;
}

export class UIController {
  private progressFill: HTMLElement;
  private progressText: HTMLElement;
  private resetBtn: HTMLElement;
  private hintBtn: HTMLElement;
  private hintOverlay: HTMLElement;
  private hintClose: HTMLElement;
  private hintList: HTMLElement;
  private successOverlay: HTMLElement;
  private events: UIControllerEvents;

  constructor(events: UIControllerEvents = {}) {
    this.events = events;

    this.progressFill = document.getElementById('progress-fill')!;
    this.progressText = document.getElementById('progress-text')!;
    this.resetBtn = document.getElementById('reset-btn')!;
    this.hintBtn = document.getElementById('hint-btn')!;
    this.hintOverlay = document.getElementById('hint-overlay')!;
    this.hintClose = document.getElementById('hint-close')!;
    this.hintList = document.getElementById('hint-list')!;
    this.successOverlay = document.getElementById('success-overlay')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.resetBtn.addEventListener('click', () => {
      this.events.onReset?.();
      this.hideSuccess();
    });

    this.hintBtn.addEventListener('click', () => {
      this.hintOverlay.classList.add('visible');
    });

    this.hintClose.addEventListener('click', () => {
      this.hintOverlay.classList.remove('visible');
    });

    this.hintOverlay.addEventListener('click', (e) => {
      if (e.target === this.hintOverlay) {
        this.hintOverlay.classList.remove('visible');
      }
    });
  }

  updateProgress(placed: number, total: number): void {
    const percent = (placed / total) * 100;
    this.progressFill.style.width = `${percent}%`;
    this.progressText.textContent = `${placed} / ${total}`;
  }

  setHints(pieces: FossilPiece[]): void {
    this.hintList.innerHTML = '';
    pieces.forEach((piece) => {
      const li = document.createElement('li');
      li.textContent = piece.hint;
      this.hintList.appendChild(li);
    });
  }

  showSuccess(): void {
    this.successOverlay.classList.add('visible');
  }

  hideSuccess(): void {
    this.successOverlay.classList.remove('visible');
  }
}
