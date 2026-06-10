export interface TimeControllerOptions {
  minYear: number;
  maxYear: number;
  tickInterval: number;
  onYearChange: (year: number, isSmooth: boolean) => void;
  onDragEnd?: () => void;
}

export class TimeController {
  private minYear: number;
  private maxYear: number;
  private tickInterval: number;
  private currentYear: number;
  private trackEl!: HTMLElement;
  private thumbEl!: HTMLElement;
  private fillEl!: HTMLElement;
  private ticksEl!: HTMLElement;
  private yearLabelEl!: HTMLElement;
  private isDragging: boolean = false;
  private stopTimer: number | null = null;
  private onYearChange: (year: number, isSmooth: boolean) => void;
  private onDragEnd?: () => void;
  private lastChangeTime: number = 0;

  constructor(options: TimeControllerOptions) {
    this.minYear = options.minYear;
    this.maxYear = options.maxYear;
    this.tickInterval = options.tickInterval;
    this.currentYear = options.minYear;
    this.onYearChange = options.onYearChange;
    this.onDragEnd = options.onDragEnd;

    this.cacheElements();
    this.generateTicks();
    this.bindEvents();
    this.updateUI();
  }

  private cacheElements(): void {
    this.trackEl = document.getElementById('timeline-track')!;
    this.thumbEl = document.getElementById('timeline-thumb')!;
    this.fillEl = document.getElementById('timeline-fill')!;
    this.ticksEl = document.getElementById('timeline-ticks')!;
    this.yearLabelEl = document.getElementById('current-year-label')!;
  }

  private generateTicks(): void {
    this.ticksEl.innerHTML = '';
    for (let year = this.minYear; year <= this.maxYear; year += this.tickInterval) {
      const progress = this.yearToProgress(year);
      const tickEl = document.createElement('div');
      tickEl.className = 'timeline-tick';
      tickEl.style.left = `${progress * 100}%`;

      const lineEl = document.createElement('div');
      lineEl.className = 'tick-line';
      tickEl.appendChild(lineEl);

      const labelEl = document.createElement('div');
      labelEl.className = 'tick-label';
      labelEl.textContent = this.formatYear(year);
      tickEl.appendChild(labelEl);

      this.ticksEl.appendChild(tickEl);
    }
  }

  private bindEvents(): void {
    this.thumbEl.addEventListener('mousedown', this.onThumbMouseDown.bind(this));
    this.thumbEl.addEventListener('touchstart', this.onThumbTouchStart.bind(this), { passive: false });
    this.trackEl.addEventListener('mousedown', this.onTrackMouseDown.bind(this));
    this.trackEl.addEventListener('touchstart', this.onTrackTouchStart.bind(this), { passive: false });
    document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this));
    document.addEventListener('touchmove', this.onDocumentTouchMove.bind(this), { passive: false });
    document.addEventListener('mouseup', this.onDocumentMouseUp.bind(this));
    document.addEventListener('touchend', this.onDocumentTouchEnd.bind(this));
  }

  private onThumbMouseDown(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.startDragging();
  }

  private onThumbTouchStart(e: TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.startDragging();
  }

  private onTrackMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const rect = this.trackEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    this.setProgress(progress, false);
    this.startDragging();
  }

  private onTrackTouchStart(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const rect = this.trackEl.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    this.setProgress(progress, false);
    this.startDragging();
  }

  private onDocumentMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const rect = this.trackEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    this.setProgress(progress, false);
  }

  private onDocumentTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length === 0) return;
    e.preventDefault();
    const rect = this.trackEl.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    this.setProgress(progress, false);
  }

  private onDocumentMouseUp(): void {
    if (this.isDragging) {
      this.stopDragging();
    }
  }

  private onDocumentTouchEnd(): void {
    if (this.isDragging) {
      this.stopDragging();
    }
  }

  private startDragging(): void {
    this.isDragging = true;
    this.clearStopTimer();
    document.body.style.userSelect = 'none';
  }

  private stopDragging(): void {
    this.isDragging = false;
    document.body.style.userSelect = '';
    this.scheduleSmoothAnimation();
    if (this.onDragEnd) {
      this.onDragEnd();
    }
  }

  private clearStopTimer(): void {
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
  }

  private scheduleSmoothAnimation(): void {
    this.clearStopTimer();
    this.stopTimer = window.setTimeout(() => {
      this.onYearChange(this.currentYear, true);
      this.stopTimer = null;
    }, 500);
  }

  private yearToProgress(year: number): number {
    return (year - this.minYear) / (this.maxYear - this.minYear);
  }

  private progressToYear(progress: number): number {
    return this.minYear + progress * (this.maxYear - this.minYear);
  }

  private formatYear(year: number): string {
    if (year < 0) {
      return `公元前 ${Math.abs(year)} 年`;
    } else if (year === 0) {
      return `公元元年`;
    } else {
      return `公元 ${year} 年`;
    }
  }

  private setProgress(progress: number, isSmooth: boolean): void {
    const year = Math.round(this.progressToYear(progress));
    if (year !== this.currentYear) {
      this.currentYear = year;
      this.lastChangeTime = performance.now();
      this.updateUI();
      this.onYearChange(year, isSmooth);
    }
  }

  private updateUI(): void {
    const progress = this.yearToProgress(this.currentYear);
    this.thumbEl.style.left = `${progress * 100}%`;
    this.fillEl.style.width = `${progress * 100}%`;
    this.yearLabelEl.textContent = this.formatYear(this.currentYear);
  }

  public setYear(year: number, isSmooth: boolean = false): void {
    const clampedYear = Math.max(this.minYear, Math.min(this.maxYear, year));
    if (clampedYear !== this.currentYear) {
      this.currentYear = clampedYear;
      this.updateUI();
      this.onYearChange(clampedYear, isSmooth);
    }
  }

  public getYear(): number {
    return this.currentYear;
  }

  public dispose(): void {
    this.clearStopTimer();
    this.thumbEl.removeEventListener('mousedown', this.onThumbMouseDown.bind(this));
    this.thumbEl.removeEventListener('touchstart', this.onThumbTouchStart.bind(this));
    this.trackEl.removeEventListener('mousedown', this.onTrackMouseDown.bind(this));
    this.trackEl.removeEventListener('touchstart', this.onTrackTouchStart.bind(this));
    document.removeEventListener('mousemove', this.onDocumentMouseMove.bind(this));
    document.removeEventListener('touchmove', this.onDocumentTouchMove.bind(this));
    document.removeEventListener('mouseup', this.onDocumentMouseUp.bind(this));
    document.removeEventListener('touchend', this.onDocumentTouchEnd.bind(this));
  }
}
