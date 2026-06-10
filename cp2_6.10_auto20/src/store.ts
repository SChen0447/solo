import { CarbonEmission, YEAR_RANGE, CONTINENTS } from './utils/data';

export interface AppState {
  selectedYear: number;
  selectedCountry: string | null;
  selectedContinents: string[];
  allData: CarbonEmission[];
}

export type StateEvent = 'yearChange' | 'countryChange' | 'continentChange' | 'reset';

type EventCallback = () => void;

export class StateManager {
  private state: AppState;
  private listeners: Map<StateEvent, Set<EventCallback>> = new Map();

  constructor(initialData: CarbonEmission[]) {
    this.state = {
      selectedYear: YEAR_RANGE.max,
      selectedCountry: null,
      selectedContinents: [...CONTINENTS],
      allData: initialData,
    };
  }

  getState(): AppState {
    return { ...this.state };
  }

  setYear(year: number): void {
    if (year >= YEAR_RANGE.min && year <= YEAR_RANGE.max && year !== this.state.selectedYear) {
      this.state.selectedYear = year;
      this.emit('yearChange');
    }
  }

  setCountry(country: string | null): void {
    if (country !== this.state.selectedCountry) {
      this.state.selectedCountry = country;
      this.emit('countryChange');
    }
  }

  toggleContinent(continent: string): void {
    const idx = this.state.selectedContinents.indexOf(continent);
    if (idx >= 0) {
      this.state.selectedContinents = this.state.selectedContinents.filter((c) => c !== continent);
    } else {
      this.state.selectedContinents = [...this.state.selectedContinents, continent];
    }
    this.emit('continentChange');
  }

  setContinents(continents: string[]): void {
    this.state.selectedContinents = [...continents];
    this.emit('continentChange');
  }

  reset(): void {
    this.state.selectedYear = YEAR_RANGE.max;
    this.state.selectedCountry = null;
    this.state.selectedContinents = [...CONTINENTS];
    this.emit('reset');
  }

  subscribe(event: StateEvent, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: StateEvent): void {
    this.listeners.get(event)?.forEach((cb) => cb());
  }
}
