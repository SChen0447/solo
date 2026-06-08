import { EarthquakeData } from './dataFetcher';

export interface HoverEvent {
  quake: EarthquakeData | null;
}

export class TextOverlay {
  private panel: HTMLElement;
  private locationEl: HTMLElement;
  private magnitudeEl: HTMLElement;
  private depthEl: HTMLElement;
  private timeEl: HTMLElement;

  private isVisible: boolean = false;

  constructor() {
    this.panel = document.getElementById('info-panel')!;
    this.locationEl = document.getElementById('info-location')!;
    this.magnitudeEl = document.getElementById('info-magnitude')!;
    this.depthEl = document.getElementById('info-depth')!;
    this.timeEl = document.getElementById('info-time')!;
  }

  public show(quake: EarthquakeData): void {
    this.locationEl.textContent = quake.place;

    const magValue = quake.magnitude.toFixed(1);
    this.magnitudeEl.textContent = `${magValue} 级`;
    this.magnitudeEl.classList.toggle('high-magnitude', quake.magnitude >= 6);

    this.depthEl.textContent = `${Math.round(quake.depth)} km`;

    const date = new Date(quake.time);
    this.timeEl.textContent = this.formatDate(date);

    if (!this.isVisible) {
      this.isVisible = true;
      this.panel.classList.add('visible');
    }
  }

  public hide(): void {
    if (this.isVisible) {
      this.isVisible = false;
      this.panel.classList.remove('visible');
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  public updateLastUpdate(date: Date): void {
    const el = document.getElementById('last-update');
    if (el) {
      el.textContent = date.toLocaleString('zh-CN');
    }
  }

  public updateEventCount(count: number): void {
    const el = document.getElementById('event-count');
    if (el) {
      el.textContent = String(count);
    }
  }

  public updateTimeline(date: Date | null, progress: number): void {
    const progressEl = document.getElementById('timeline-progress');
    const dateEl = document.getElementById('timeline-date');

    if (progressEl) {
      progressEl.style.width = `${progress * 100}%`;
    }

    if (dateEl) {
      if (date) {
        dateEl.textContent = date.toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
        });
      } else {
        dateEl.textContent = '--';
      }
    }
  }
}
