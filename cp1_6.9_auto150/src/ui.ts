import type { StrokeManager } from './stroke';
import type { Exporter } from './exporter';

export class UI {
  private manager: StrokeManager;
  private exporter: Exporter;
  private btnUndo: HTMLButtonElement;
  private btnRedo: HTMLButtonElement;
  private btnClear: HTMLButtonElement;
  private btnGif: HTMLButtonElement;
  private btnPng: HTMLButtonElement;
  private strokeCountEl: HTMLElement;
  private colorIndicator: HTMLElement;
  private widthHint: HTMLElement;
  private confirmModal: HTMLElement;
  private modalCancel: HTMLButtonElement;
  private modalConfirm: HTMLButtonElement;

  constructor(manager: StrokeManager, exporter: Exporter) {
    this.manager = manager;
    this.exporter = exporter;

    this.btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
    this.btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;
    this.btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
    this.btnGif = document.getElementById('btn-gif') as HTMLButtonElement;
    this.btnPng = document.getElementById('btn-png') as HTMLButtonElement;
    this.strokeCountEl = document.getElementById('stroke-count') as HTMLElement;
    this.colorIndicator = document.getElementById('color-indicator') as HTMLElement;
    this.widthHint = document.getElementById('width-hint') as HTMLElement;
    this.confirmModal = document.getElementById('confirm-modal') as HTMLElement;
    this.modalCancel = document.getElementById('modal-cancel') as HTMLButtonElement;
    this.modalConfirm = document.getElementById('modal-confirm') as HTMLButtonElement;

    this.bindEvents();
    this.update();
  }

  private bindEvents() {
    this.btnUndo.addEventListener('click', () => this.manager.undo());
    this.btnRedo.addEventListener('click', () => this.manager.redo());
    this.btnClear.addEventListener('click', () => this.showConfirmModal());
    this.btnGif.addEventListener('click', () => this.exporter.exportGIF());
    this.btnPng.addEventListener('click', () => this.exporter.exportPNG());
    this.modalCancel.addEventListener('click', () => this.hideConfirmModal());
    this.modalConfirm.addEventListener('click', () => {
      this.manager.clearAll();
      this.hideConfirmModal();
    });
  }

  private showConfirmModal() {
    this.confirmModal.classList.add('show');
  }

  private hideConfirmModal() {
    this.confirmModal.classList.remove('show');
  }

  update() {
    this.strokeCountEl.textContent = `${this.manager.getStrokeCount()} 笔画`;
    this.btnUndo.disabled = this.manager.getStrokeCount() === 0;
    this.btnRedo.disabled = this.manager.getUndoneCount() === 0;
    this.colorIndicator.style.background = this.manager.currentColor;
    this.widthHint.textContent = `宽度: ${this.manager.currentWidth}px | 模糊: ${this.manager.currentBlurRadius}px`;
  }
}
