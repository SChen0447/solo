import { analyzeImage, type AnalyzedImage } from './imageAnalyzer';
import { GridManager } from './gridManager';
import { Lightbox } from './lightbox';

const MAX_IMAGES = 20;

class App {
  private uploadZone: HTMLElement;
  private fileInput: HTMLInputElement;
  private uploadProgress: HTMLElement;
  private progressFill: HTMLElement;
  private progressCount: HTMLElement;
  private progressTotal: HTMLElement;
  private gridContainer: HTMLElement;
  private gridWrapper: HTMLElement;
  private resetBtn: HTMLElement;
  private lightboxRoot: HTMLElement;

  private gridManager: GridManager | null = null;
  private lightbox: Lightbox | null = null;
  private images: AnalyzedImage[] = [];
  private isDragging: boolean = false;

  constructor() {
    this.uploadZone = document.getElementById('upload-zone')!;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.uploadProgress = document.getElementById('upload-progress')!;
    this.progressFill = this.uploadProgress.querySelector('.progress-fill')!;
    this.progressCount = document.getElementById('progress-count')!;
    this.progressTotal = document.getElementById('progress-total')!;
    this.gridContainer = document.getElementById('grid-container')!;
    this.gridWrapper = document.querySelector('.grid-container') as HTMLElement;
    this.resetBtn = document.getElementById('reset-btn')!;
    this.lightboxRoot = document.getElementById('lightbox-root')!;

    this.init();
  }

  private init(): void {
    this.gridManager = new GridManager(this.gridWrapper, document.getElementById('photo-grid') as HTMLElement);
    this.lightbox = new Lightbox(this.lightboxRoot);

    this.gridManager.setOnItemClick((image, el) => {
      this.lightbox?.open(image, el);
    });

    this.bindEvents();
  }

  private bindEvents(): void {
    this.uploadZone.addEventListener('click', () => this.fileInput.click());

    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.handleFiles(target.files);
      }
      target.value = '';
    });

    this.uploadZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = true;
      this.uploadZone.classList.add('drag-active');
    });

    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.uploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.uploadZone.contains(e.relatedTarget as Node)) return;
      this.isDragging = false;
      this.uploadZone.classList.remove('drag-active');
    });

    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = false;
      this.uploadZone.classList.remove('drag-active');
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        this.handleFiles(e.dataTransfer.files);
      }
    });

    this.resetBtn.addEventListener('click', () => this.reset());
  }

  private handleFiles(fileList: FileList): void {
    const files = Array.from(fileList).filter(f =>
      f.type === 'image/jpeg' || f.type === 'image/png'
    );

    if (files.length === 0) return;

    const availableSlots = MAX_IMAGES - this.images.length;
    if (availableSlots <= 0) {
      alert(`最多只能上传 ${MAX_IMAGES} 张图片`);
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    this.showProgress(filesToProcess.length);
    this.processFiles(filesToProcess);
  }

  private showProgress(total: number): void {
    this.uploadProgress.classList.remove('hidden');
    this.progressTotal.textContent = String(total);
    this.progressCount.textContent = '0';
    this.progressFill.style.width = '0%';
  }

  private updateProgress(current: number, total: number): void {
    this.progressCount.textContent = String(current);
    const percent = (current / total) * 100;
    this.progressFill.style.width = `${percent}%`;
  }

  private hideProgress(): void {
    setTimeout(() => {
      this.uploadProgress.classList.add('hidden');
    }, 500);
  }

  private async processFiles(files: File[]): Promise<void> {
    const total = files.length;
    let processed = 0;

    for (const file of files) {
      try {
        const analyzed = await analyzeImage(file);
        this.images.push(analyzed);
      } catch (err) {
        console.error('Failed to analyze image:', file.name, err);
      }
      processed++;
      this.updateProgress(processed, total);
    }

    this.hideProgress();
    this.renderGrid();
  }

  private renderGrid(): void {
    if (this.images.length === 0) {
      this.gridContainer.classList.add('hidden');
      this.uploadZone.classList.remove('hidden');
      this.resetBtn.classList.add('hidden');
      return;
    }

    this.uploadZone.classList.add('hidden');
    this.gridContainer.classList.remove('hidden');
    this.resetBtn.classList.remove('hidden');
    this.gridManager?.setImages(this.images);
  }

  private reset(): void {
    this.images = [];
    this.gridManager?.clear();
    this.gridContainer.classList.add('hidden');
    this.uploadZone.classList.remove('hidden');
    this.resetBtn.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
