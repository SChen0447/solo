import { StarData, searchStars, getStarByName } from './starData';

export interface UIEvents {
  onSearch: (star: StarData) => void;
  onMagnitudeChange: (value: number) => void;
}

export class UIManager {
  private searchInput: HTMLInputElement;
  private searchSuggestions: HTMLDivElement;
  private magnitudeSlider: HTMLInputElement;
  private magnitudeCurrent: HTMLSpanElement;
  private sliderGlow: HTMLDivElement;
  private tooltip: HTMLDivElement;
  private tooltipName: HTMLDivElement;
  private tooltipMagnitude: HTMLDivElement;

  private events: UIEvents;
  private currentSuggestions: StarData[] = [];

  constructor(events: UIEvents) {
    this.events = events;

    this.searchInput = document.getElementById('star-search') as HTMLInputElement;
    this.searchSuggestions = document.getElementById('search-suggestions') as HTMLDivElement;
    this.magnitudeSlider = document.getElementById('magnitude-slider') as HTMLInputElement;
    this.magnitudeCurrent = document.getElementById('mag-current') as HTMLSpanElement;
    this.sliderGlow = document.getElementById('slider-glow') as HTMLDivElement;
    this.tooltip = document.getElementById('star-tooltip') as HTMLDivElement;
    this.tooltipName = document.getElementById('tooltip-name') as HTMLDivElement;
    this.tooltipMagnitude = document.getElementById('tooltip-magnitude') as HTMLDivElement;

    this.setupSearch();
    this.setupMagnitudeSlider();
  }

  private setupSearch(): void {
    this.searchInput.addEventListener('input', () => {
      const query = this.searchInput.value.trim();
      this.updateSuggestions(query);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.currentSuggestions.length > 0) {
        this.selectStar(this.currentSuggestions[0]);
      }
    });

    this.searchInput.addEventListener('focus', () => {
      if (this.searchInput.value.trim() && this.currentSuggestions.length > 0) {
        this.searchSuggestions.classList.add('active');
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target || !(e.target instanceof HTMLElement)) return;
      if (!e.target.closest('.search-container')) {
        this.searchSuggestions.classList.remove('active');
      }
    });
  }

  private updateSuggestions(query: string): void {
    this.currentSuggestions = searchStars(query);

    if (this.currentSuggestions.length === 0 || !query) {
      this.searchSuggestions.classList.remove('active');
      this.searchSuggestions.innerHTML = '';
      return;
    }

    this.searchSuggestions.innerHTML = '';
    this.currentSuggestions.forEach((star) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.innerHTML = `
        <span>${star.name}</span>
        <span class="mag">视星等: ${star.magnitude.toFixed(1)}</span>
      `;
      item.addEventListener('click', () => this.selectStar(star));
      this.searchSuggestions.appendChild(item);
    });

    this.searchSuggestions.classList.add('active');
  }

  private selectStar(star: StarData): void {
    this.searchInput.value = star.name;
    this.searchSuggestions.classList.remove('active');
    this.events.onSearch(star);
  }

  private setupMagnitudeSlider(): void {
    this.magnitudeSlider.addEventListener('input', () => {
      const value = parseFloat(this.magnitudeSlider.value);
      this.magnitudeCurrent.textContent = value.toFixed(1);
      this.updateSliderGlow();
    });

    this.magnitudeSlider.addEventListener('change', () => {
      const value = parseFloat(this.magnitudeSlider.value);
      this.events.onMagnitudeChange(value);
    });

    this.updateSliderGlow();
  }

  private updateSliderGlow(): void {
    const min = parseFloat(this.magnitudeSlider.min);
    const max = parseFloat(this.magnitudeSlider.max);
    const value = parseFloat(this.magnitudeSlider.value);
    const percentage = ((value - min) / (max - min)) * 100;

    this.sliderGlow.style.width = `${percentage}%`;
    this.sliderGlow.style.opacity = '1';
  }

  public showTooltip(x: number, y: number, name: string, magnitude: number): void {
    this.tooltipName.textContent = name;
    this.tooltipMagnitude.textContent = `视星等: ${magnitude.toFixed(2)}`;

    const tooltipWidth = this.tooltip.offsetWidth;
    const tooltipHeight = this.tooltip.offsetHeight;

    let posX = x + 15;
    let posY = y - tooltipHeight / 2;

    if (posX + tooltipWidth > window.innerWidth - 10) {
      posX = x - tooltipWidth - 15;
    }
    if (posY < 10) posY = 10;
    if (posY + tooltipHeight > window.innerHeight - 10) {
      posY = window.innerHeight - tooltipHeight - 10;
    }

    this.tooltip.style.left = `${posX}px`;
    this.tooltip.style.top = `${posY}px`;
    this.tooltip.classList.add('visible');
  }

  public hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  public getMagnitudeValue(): number {
    return parseFloat(this.magnitudeSlider.value);
  }

  public searchStarByName(name: string): StarData | undefined {
    return getStarByName(name);
  }
}
