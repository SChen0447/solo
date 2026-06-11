export const GRID_SIZE = 50;
export const SIMULATION_INTERVAL = 50;
export const MAX_SIMULATION_TIME = 60;

export interface SimulationConfig {
  diffusionRate: number;
  growthRate: number;
  drugEffectiveness: number;
  drugDiffusionRate: number;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  diffusionRate: 0.15,
  growthRate: 0.02,
  drugEffectiveness: 0.8,
  drugDiffusionRate: 0.1,
};

export function createEmptyMatrix(size: number): number[][] {
  const matrix: number[][] = [];
  for (let i = 0; i < size; i++) {
    matrix.push(new Array(size).fill(0));
  }
  return matrix;
}

export function initInfection(size: number, centerRadius: number = 6): number[][] {
  const matrix = createEmptyMatrix(size);
  const center = size / 2;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const dx = i - center;
      const dy = j - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= centerRadius) {
        matrix[i][j] = 0.8 + Math.random() * 0.2;
      }
    }
  }

  return matrix;
}

export function simulateStep(
  infectionMatrix: number[][],
  drugMatrix: number[][],
  config: SimulationConfig = DEFAULT_CONFIG
): { infectionMatrix: number[][]; drugMatrix: number[][] } {
  const size = infectionMatrix.length;
  const newInfection = createEmptyMatrix(size);
  const newDrug = createEmptyMatrix(size);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let infectionSum = 0;
      let infectionCount = 0;
      let drugSum = 0;
      let drugCount = 0;

      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const ni = i + di;
          const nj = j + dj;
          if (ni >= 0 && ni < size && nj >= 0 && nj < size) {
            infectionSum += infectionMatrix[ni][nj];
            infectionCount++;
            drugSum += drugMatrix[ni][nj];
            drugCount++;
          }
        }
      }

      const avgInfection = infectionSum / infectionCount;
      const avgDrug = drugSum / drugCount;

      const diffusion = (avgInfection - infectionMatrix[i][j]) * config.diffusionRate;
      const growth = infectionMatrix[i][j] * config.growthRate * (1 - infectionMatrix[i][j]);
      const drugEffect = drugMatrix[i][j] * config.drugEffectiveness * infectionMatrix[i][j];

      newInfection[i][j] = Math.max(0, Math.min(1,
        infectionMatrix[i][j] + diffusion + growth - drugEffect
      ));

      const drugDiffusion = (avgDrug - drugMatrix[i][j]) * config.drugDiffusionRate;
      const drugDecay = drugMatrix[i][j] * 0.005;
      newDrug[i][j] = Math.max(0, drugMatrix[i][j] + drugDiffusion - drugDecay);
    }
  }

  return { infectionMatrix: newInfection, drugMatrix: newDrug };
}

export function injectDrug(
  drugMatrix: number[][],
  centerX: number,
  centerY: number,
  concentration: number,
  radius: number = 5
): number[][] {
  const size = drugMatrix.length;
  const newDrug = drugMatrix.map(row => [...row]);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const dx = i - centerY;
      const dy = j - centerX;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= radius) {
        const falloff = 1 - distance / radius;
        newDrug[i][j] = Math.min(1, newDrug[i][j] + concentration * falloff * falloff);
      }
    }
  }

  return newDrug;
}

export function calculateInfectionRate(infectionMatrix: number[][]): number {
  const size = infectionMatrix.length;
  let total = 0;
  let infected = 0;
  const center = size / 2;
  const maxRadius = size * 0.45;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const dx = i - center;
      const dy = j - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= maxRadius) {
        total++;
        if (infectionMatrix[i][j] > 0.1) {
          infected++;
        }
      }
    }
  }

  return total > 0 ? infected / total : 0;
}

export function predictNoDrugCurve(maxTime: number, interval: number): { time: number; infectionRate: number }[] {
  const data: { time: number; infectionRate: number }[] = [];
  const steps = Math.floor(maxTime * 1000 / interval);
  let matrix = initInfection(GRID_SIZE, 6);
  const emptyDrug = createEmptyMatrix(GRID_SIZE);

  for (let s = 0; s <= steps; s++) {
    const time = s * interval / 1000;
    const rate = calculateInfectionRate(matrix);
    data.push({ time, infectionRate: rate });

    if (s < steps) {
      const result = simulateStep(matrix, emptyDrug);
      matrix = result.infectionMatrix;
    }
  }

  return data;
}
