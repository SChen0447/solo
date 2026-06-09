import * as L from 'leaflet';
import type { HistoricalEvent } from './data';

export class EventManager {
  private map: L.Map;
  private allEvents: HistoricalEvent[];
  private markers: L.Marker[] = [];
  private card: HTMLElement;
  private cardTitle: HTMLElement;
  private cardYear: HTMLElement;
  private cardDesc: HTMLElement;
  private cardImage: HTMLElement;
  private cardClose: HTMLButtonElement;

  constructor(map: L.Map, events: HistoricalEvent[]) {
    this.map = map;
    this.allEvents = events;
    this.card = document.getElementById('event-card') as HTMLElement;
    this.cardTitle = document.getElementById('event-card-title') as HTMLElement;
    this.cardYear = document.getElementById('event-card-year') as HTMLElement;
    this.cardDesc = document.getElementById('event-card-desc') as HTMLElement;
    this.cardImage = document.getElementById('event-card-image') as HTMLElement;
    this.cardClose = document.getElementById('event-card-close') as HTMLButtonElement;

    this.initCardListeners();
  }

  private initCardListeners(): void {
    this.cardClose.addEventListener('click', () => this.hideCard());

    document.addEventListener('click', (e) => {
      if (this.card.style.display === 'block' && this.card.classList.contains('visible')) {
        const target = e.target as Node;
        if (!this.card.contains(target) && !(target as Element).classList?.contains('event-marker')) {
          this.hideCard();
        }
      }
    });
  }

  public renderForYear(year: number): void {
    this.clearMarkers();

    const range = 100;
    const activeEvents = this.allEvents.filter(
      (evt) => Math.abs(evt.year - year) <= range
    );

    activeEvents.forEach((evt) => {
      const icon = L.divIcon({
        className: 'event-marker-wrapper',
        html: '<div class="event-marker"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      const marker = L.marker([evt.lat, evt.lng], { icon });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        this.showCard(evt, e.originalEvent as MouseEvent);
      });
      marker.addTo(this.map);
      this.markers.push(marker);
    });
  }

  private clearMarkers(): void {
    this.markers.forEach((m) => this.map.removeLayer(m));
    this.markers = [];
  }

  private showCard(evt: HistoricalEvent, mouseEvent: MouseEvent): void {
    this.cardTitle.textContent = evt.title;
    const prefix = evt.year >= 0 ? '公元 ' : '公元前 ';
    const displayYear = evt.year >= 0 ? evt.year : -evt.year;
    this.cardYear.textContent = `${prefix}${displayYear} 年`;
    this.cardDesc.textContent = evt.description;
    this.cardImage.textContent = `插图占位 · ${evt.title}`;

    const mapRect = this.map.getContainer().getBoundingClientRect();
    let x = mouseEvent.clientX - mapRect.left + 20;
    let y = mouseEvent.clientY - mapRect.top - 50;

    const cardWidth = 320;
    const cardHeight = 300;

    if (x + cardWidth > mapRect.width - 20) {
      x = mouseEvent.clientX - mapRect.left - cardWidth - 20;
    }
    if (y < 20) y = 20;
    if (y + cardHeight > mapRect.height - 20) {
      y = mapRect.height - cardHeight - 20;
    }

    this.card.style.left = `${x}px`;
    this.card.style.top = `${y}px`;
    this.card.style.display = 'block';

    requestAnimationFrame(() => {
      this.card.classList.add('visible');
    });
  }

  private hideCard(): void {
    this.card.classList.remove('visible');
    setTimeout(() => {
      this.card.style.display = 'none';
    }, 300);
  }
}
