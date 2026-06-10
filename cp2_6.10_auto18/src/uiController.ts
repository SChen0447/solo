import { TRACKS, type FrequencyData } from './audioAnalyzer';

export interface UICallbacks {
  onTrackChange: (trackId: number) => void;
}

export class UIController {
  private trackCards: NodeListOf<HTMLElement>;
  private currentTitleEl: HTMLElement;
  private currentBpmEl: HTMLElement;
  private barLow: HTMLElement;
  private barMid: HTMLElement;
  private barHigh: HTMLElement;
  private appEl: HTMLElement;
  private currentTrackId: number = 0;
  private callbacks: UICallbacks;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.trackCards = document.querySelectorAll('.track-card');
    this.currentTitleEl = document.getElementById('current-title')!;
    this.currentBpmEl = document.getElementById('current-bpm')!;
    this.barLow = document.getElementById('bar-low')!;
    this.barMid = document.getElementById('bar-mid')!;
    this.barHigh = document.getElementById('bar-high')!;
    this.appEl = document.getElementById('app')!;

    this.bindEvents();
    this.setActiveTrack(0, false);
  }

  private bindEvents(): void {
    this.trackCards.forEach((card) => {
      card.addEventListener('click', () => {
        const trackId = parseInt(card.dataset.track || '0', 10);
        this.setActiveTrack(trackId, true);
      });
    });
  }

  private setActiveTrack(trackId: number, triggerCallback: boolean): void {
    this.currentTrackId = trackId;
    const track = TRACKS[trackId];

    this.trackCards.forEach((card, idx) => {
      if (idx === trackId) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    this.currentTitleEl.textContent = track.name;
    this.currentBpmEl.textContent = `BPM: ${track.bpm}`;
    this.appEl.style.background = track.bgColor;

    if (triggerCallback) {
      this.callbacks.onTrackChange(trackId);
    }
  }

  public updateSpectrumBars(data: FrequencyData): void {
    this.barLow.style.width = `${Math.round(data.low * 100)}%`;
    this.barMid.style.width = `${Math.round(data.mid * 100)}%`;
    this.barHigh.style.width = `${Math.round(data.high * 100)}%`;
  }
}
