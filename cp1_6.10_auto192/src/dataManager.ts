export interface SamplingPoint {
  id: number;
  lat: number;
  lng: number;
  pollutionIndex: number;
  microplasticRatio: number;
  chemicalTypes: string[];
  monthlyData: number[];
}

const CHEMICAL_TYPES = ['重金属', '农药', '工业溶剂'];
const STORAGE_KEY = 'clean_blue_deep_sampling_data';

export class DataManager {
  private data: SamplingPoint[] = [];

  constructor() {
    this.data = this.loadData() || this.generateData();
    this.saveData();
  }

  private generateData(): SamplingPoint[] {
    const points: SamplingPoint[] = [];
    for (let i = 0; i < 80; i++) {
      const lat = parseFloat((18 + Math.random() * 15).toFixed(2));
      const lng = parseFloat((108 + Math.random() * 18).toFixed(2));
      const basePollution = Math.random() * 100;
      const monthlyData: number[] = [];
      for (let m = 0; m < 12; m++) {
        const seasonalVariation = Math.sin((m / 12) * Math.PI * 2) * 15;
        const randomVariation = (Math.random() - 0.5) * 20;
        const value = Math.max(0, Math.min(100, basePollution + seasonalVariation + randomVariation));
        monthlyData.push(parseFloat(value.toFixed(1)));
      }
      const chemicalCount = Math.floor(Math.random() * 3);
      const shuffled = [...CHEMICAL_TYPES].sort(() => Math.random() - 0.5);
      const chemicalTypes = shuffled.slice(0, chemicalCount);

      points.push({
        id: i + 1,
        lat,
        lng,
        pollutionIndex: monthlyData[0],
        microplasticRatio: parseFloat((0.3 + Math.random() * 0.6).toFixed(2)),
        chemicalTypes,
        monthlyData,
      });
    }
    return points;
  }

  private loadData(): SamplingPoint[] | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as SamplingPoint[];
      }
    } catch (e) {
      console.error('Failed to load data from localStorage', e);
    }
    return null;
  }

  private saveData(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save data to localStorage', e);
    }
  }

  getData(): SamplingPoint[] {
    return this.data;
  }

  getDataByMonth(monthIndex: number): SamplingPoint[] {
    const safeIndex = Math.max(0, Math.min(11, monthIndex));
    return this.data.map((point) => ({
      ...point,
      pollutionIndex: point.monthlyData[safeIndex],
    }));
  }

  getStats(monthIndex: number): { avg: number; max: number } {
    const monthData = this.getDataByMonth(monthIndex);
    const values = monthData.map((p) => p.pollutionIndex);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    return { avg: parseFloat(avg.toFixed(1)), max: parseFloat(max.toFixed(1)) };
  }
}
