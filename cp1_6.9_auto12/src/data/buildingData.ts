export type BuildingType = 'cube' | 'L' | 'tower';
export type ViewMode = 'energy' | 'carbon' | 'composite';

export interface MonthlyData {
  energy: number;
  carbon: number;
}

export interface YearlyData {
  yearlyEnergy: number;
  yearlyCarbon: number;
  monthly: MonthlyData[];
}

export interface BuildingData {
  id: string;
  name: string;
  type: BuildingType;
  floors: number;
  area: number;
  pvArea: number;
  position: { x: number; z: number };
  width: number;
  depth: number;
  height: number;
  yearlyData: Record<number, YearlyData>;
}

interface BuildingMeta {
  name: string;
  type: BuildingType;
  floors: number;
  area: number;
  pvArea: number;
  position: { x: number; z: number };
  width: number;
  depth: number;
  height: number;
}

const buildingMetas: BuildingMeta[] = [
  { name: '中央商务区大厦', type: 'tower', floors: 48, area: 48000, pvArea: 1800, position: { x: 0, z: 0 }, width: 14, depth: 14, height: 4.8 },
  { name: '科技研发中心', type: 'cube', floors: 18, area: 27000, pvArea: 1500, position: { x: -35, z: -20 }, width: 22, depth: 18, height: 1.8 },
  { name: '绿色生态住宅A', type: 'cube', floors: 25, area: 22000, pvArea: 2200, position: { x: 35, z: -25 }, width: 16, depth: 16, height: 2.5 },
  { name: '城市商业综合体', type: 'L', floors: 12, area: 32000, pvArea: 800, position: { x: -25, z: 30 }, width: 20, depth: 20, height: 1.2 },
  { name: '金融贸易中心', type: 'tower', floors: 56, area: 52000, pvArea: 2000, position: { x: 28, z: 25 }, width: 16, depth: 16, height: 5.6 },
  { name: '文化艺术中心', type: 'cube', floors: 8, area: 18000, pvArea: 1200, position: { x: -55, z: 5 }, width: 24, depth: 18, height: 0.8 },
  { name: '会展中心', type: 'cube', floors: 6, area: 25000, pvArea: 3000, position: { x: 55, z: 5 }, width: 28, depth: 20, height: 0.6 },
  { name: '行政办公大楼', type: 'tower', floors: 32, area: 28000, pvArea: 1000, position: { x: 5, z: -45 }, width: 14, depth: 14, height: 3.2 },
  { name: '酒店公寓', type: 'L', floors: 22, area: 24000, pvArea: 1500, position: { x: -5, z: 48 }, width: 18, depth: 16, height: 2.2 },
  { name: '数据中心', type: 'cube', floors: 10, area: 20000, pvArea: 500, position: { x: 50, z: -45 }, width: 20, depth: 16, height: 1.0 },
  { name: '绿色生态住宅B', type: 'cube', floors: 20, area: 18000, pvArea: 2000, position: { x: -50, z: -45 }, width: 16, depth: 16, height: 2.0 },
  { name: '医院综合楼', type: 'L', floors: 15, area: 30000, pvArea: 1000, position: { x: 45, z: 50 }, width: 22, depth: 18, height: 1.5 },
  { name: '学校教学楼群', type: 'cube', floors: 10, area: 16000, pvArea: 2500, position: { x: -45, z: 50 }, width: 20, depth: 16, height: 1.0 },
  { name: '物流仓储中心', type: 'cube', floors: 5, area: 22000, pvArea: 3500, position: { x: 0, z: 55 }, width: 24, depth: 24, height: 0.5 },
  { name: '创新科技园', type: 'tower', floors: 36, area: 30000, pvArea: 1500, position: { x: 0, z: -55 }, width: 16, depth: 16, height: 3.6 },
  { name: '运动健身中心', type: 'cube', floors: 7, area: 14000, pvArea: 2000, position: { x: 65, z: 30 }, width: 18, depth: 14, height: 0.7 }
];

const energyBasePerM2: Record<BuildingType, number> = {
  tower: 220,
  cube: 180,
  L: 200
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateYearlyData(seed: number, meta: BuildingMeta): Record<number, YearlyData> {
  const rand = seededRandom(seed);
  const result: Record<number, YearlyData> = {};

  for (let year = 2020; year <= 2025; year++) {
    const yearlyFactor = 1 - (year - 2020) * 0.035 + (rand() - 0.5) * 0.04;
    const yearlyEnergyEstimate = meta.area * energyBasePerM2[meta.type] * yearlyFactor;
    const yearlyCarbonEstimate = yearlyEnergyEstimate * 0.00058 * (1 + rand() * 0.2);

    const monthly: MonthlyData[] = [];
    for (let m = 0; m < 12; m++) {
      const seasonFactor = 0.7 + 0.6 * (0.5 + 0.5 * Math.sin(((m + 6) / 12) * Math.PI * 2));
      const monthlyEnergy = Math.round(
        (yearlyEnergyEstimate / 12) * seasonFactor * (0.85 + rand() * 0.3)
      );
      const monthlyCarbon = Math.round(
        monthlyEnergy * 0.00058 * (1 + rand() * 0.15)
      );
      monthly.push({ energy: monthlyEnergy, carbon: monthlyCarbon });
    }

    result[year] = {
      yearlyEnergy: monthly.reduce((s, m) => s + m.energy, 0),
      yearlyCarbon: monthly.reduce((s, m) => s + m.carbon, 0),
      monthly
    };
  }
  return result;
}

export const buildingDataList: BuildingData[] = buildingMetas.map((meta, i) => ({
  id: `B${String(i + 1).padStart(3, '0')}`,
  name: meta.name,
  type: meta.type,
  floors: meta.floors,
  area: meta.area,
  pvArea: meta.pvArea,
  position: meta.position,
  width: meta.width,
  depth: meta.depth,
  height: meta.height,
  yearlyData: generateYearlyData(i + 1, meta)
}));
