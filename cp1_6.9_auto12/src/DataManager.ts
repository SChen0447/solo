import * as d3 from 'd3';
import { buildingDataList, BuildingData, YearlyData, ViewMode } from './data/buildingData';

export interface ProcessedBuilding {
  id: string;
  name: string;
  type: BuildingData['type'];
  floors: number;
  area: number;
  pvArea: number;
  position: { x: number; z: number };
  width: number;
  depth: number;
  height: number;
  yearlyEnergy: number;
  yearlyCarbon: number;
  monthlyEnergy: number[];
  monthlyCarbon: number[];
  composite: number;
  value: number;
}

export type DataUpdateListener = (buildings: ProcessedBuilding[]) => void;
export type YearUpdateListener = (year: number, previousYear: number) => void;
export type ModeUpdateListener = (mode: ViewMode) => void;

export class DataManager {
  private rawData: BuildingData[] = [];
  private indexedData: Map<string, BuildingData> = new Map();
  private currentYear: number = 2025;
  private currentMode: ViewMode = 'energy';
  private compositeWeights = { energy: 0.5, carbon: 0.5 };

  private dataListeners: DataUpdateListener[] = [];
  private yearListeners: YearUpdateListener[] = [];
  private modeListeners: ModeUpdateListener[] = [];

  public async loadData(): Promise<void> {
    this.rawData = buildingDataList;
    this.indexedData.clear();
    this.rawData.forEach(b => this.indexedData.set(b.id, b));
  }

  public getBuildingById(id: string): BuildingData | undefined {
    return this.indexedData.get(id);
  }

  public getYearlyData(id: string, year: number): YearlyData | undefined {
    return this.indexedData.get(id)?.yearlyData[year];
  }

  public setYear(year: number): void {
    if (year < 2020 || year > 2025) return;
    const previousYear = this.currentYear;
    if (year === previousYear) return;
    this.currentYear = year;
    this.yearListeners.forEach(l => l(year, previousYear));
    this.emitDataUpdate();
  }

  public getYear(): number {
    return this.currentYear;
  }

  public setMode(mode: ViewMode): void {
    if (mode === this.currentMode) return;
    this.currentMode = mode;
    this.modeListeners.forEach(l => l(mode));
    this.emitDataUpdate();
  }

  public getMode(): ViewMode {
    return this.currentMode;
  }

  public setCompositeWeights(energy: number, carbon: number): void {
    const sum = energy + carbon;
    if (sum <= 0) return;
    this.compositeWeights = {
      energy: energy / sum,
      carbon: carbon / sum
    };
    this.emitDataUpdate();
  }

  public getCompositeWeights(): { energy: number; carbon: number } {
    return { ...this.compositeWeights };
  }

  public getProcessedData(): ProcessedBuilding[] {
    const energyScale = this.getNormalizedScale('energy');
    const carbonScale = this.getNormalizedScale('carbon');

    return this.rawData.map(b => {
      const yd = b.yearlyData[this.currentYear];
      const monthlyEnergy = yd.monthly.map(m => m.energy);
      const monthlyCarbon = yd.monthly.map(m => m.carbon);
      const normalizedEnergy = energyScale(yd.yearlyEnergy);
      const normalizedCarbon = carbonScale(yd.yearlyCarbon);
      const composite =
        normalizedEnergy * this.compositeWeights.energy +
        normalizedCarbon * this.compositeWeights.carbon;

      let value: number;
      switch (this.currentMode) {
        case 'energy': value = normalizedEnergy; break;
        case 'carbon': value = normalizedCarbon; break;
        case 'composite': value = composite; break;
      }

      return {
        id: b.id,
        name: b.name,
        type: b.type,
        floors: b.floors,
        area: b.area,
        pvArea: b.pvArea,
        position: b.position,
        width: b.width,
        depth: b.depth,
        height: b.height,
        yearlyEnergy: yd.yearlyEnergy,
        yearlyCarbon: yd.yearlyCarbon,
        monthlyEnergy,
        monthlyCarbon,
        composite,
        value
      };
    });
  }

  public getNormalizedScale(field: 'energy' | 'carbon'): d3.ScaleLinear<number, number> {
    const values: number[] = [];
    this.rawData.forEach(b => {
      for (let y = 2020; y <= 2025; y++) {
        const v = field === 'energy'
          ? b.yearlyData[y].yearlyEnergy
          : b.yearlyData[y].yearlyCarbon;
        values.push(v);
      }
    });
    return d3.scaleLinear()
      .domain([d3.min(values) as number, d3.max(values) as number])
      .range([0, 1])
      .clamp(true);
  }

  public getTotalCarbon(): number {
    return this.rawData.reduce((sum, b) => {
      return sum + (b.yearlyData[this.currentYear]?.yearlyCarbon || 0);
    }, 0);
  }

  public getPreviousYearTotalCarbon(): number {
    const prevYear = Math.max(2020, this.currentYear - 1);
    return this.rawData.reduce((sum, b) => {
      return sum + (b.yearlyData[prevYear]?.yearlyCarbon || 0);
    }, 0);
  }

  public onDataUpdate(listener: DataUpdateListener): () => void {
    this.dataListeners.push(listener);
    return () => {
      this.dataListeners = this.dataListeners.filter(l => l !== listener);
    };
  }

  public onYearChange(listener: YearUpdateListener): () => void {
    this.yearListeners.push(listener);
    return () => {
      this.yearListeners = this.yearListeners.filter(l => l !== listener);
    };
  }

  public onModeChange(listener: ModeUpdateListener): () => void {
    this.modeListeners.push(listener);
    return () => {
      this.modeListeners = this.modeListeners.filter(l => l !== listener);
    };
  }

  private emitDataUpdate(): void {
    const processed = this.getProcessedData();
    this.dataListeners.forEach(l => l(processed));
  }
}
