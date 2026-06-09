export interface OceanVector {
  lat: number;
  lon: number;
  dx: number;
  dy: number;
  speed: number;
}

export interface TempGrid {
  latSteps: number;
  lonSteps: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  data: number[][];
}

const LAT_STEPS = 18;
const LON_STEPS = 36;
const LAT_MIN = -85;
const LAT_MAX = 85;
const LON_MIN = -180;
const LON_MAX = 180;

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function latIndexToValue(i: number): number {
  return LAT_MIN + (i / (LAT_STEPS - 1)) * (LAT_MAX - LAT_MIN);
}

function lonIndexToValue(j: number): number {
  return LON_MIN + (j / (LON_STEPS - 1)) * (LON_MAX - LON_MIN);
}

function generateBaseTemperature(lat: number, lon: number, month: number): number {
  const latAbs = Math.abs(lat);
  const monthIdx = month - 1;
  const seasonPhase = (monthIdx - 1) / 11 * Math.PI * 2;

  const hemisphereFactor = lat >= 0 ? Math.sin(seasonPhase) : -Math.sin(seasonPhase);

  let baseTemp = 30 - latAbs * 0.35;
  baseTemp += hemisphereFactor * (1 - latAbs / 90) * 6;

  const lonWave = Math.sin(lon * 0.05) * 2 + Math.cos(lon * 0.02) * 1.5;
  baseTemp += lonWave;

  if (latAbs < 15) {
    baseTemp += 3;
  } else if (latAbs > 60) {
    baseTemp -= 5;
  }

  const gulfStream = Math.max(0, 1 - Math.abs(lat - 35) / 20) * Math.max(0, 1 - Math.abs(lon - (-50)) / 30) * 8;
  baseTemp += gulfStream;

  const kuroshio = Math.max(0, 1 - Math.abs(lat - 30) / 15) * Math.max(0, 1 - Math.abs(lon - 140) / 25) * 7;
  baseTemp += kuroshio;

  const humboldt = Math.max(0, 1 - Math.abs(lat - (-15)) / 20) * Math.max(0, 1 - Math.abs(lon - (-85)) / 20) * -6;
  baseTemp += humboldt;

  const antarcticCircumpolar = latAbs > 50 && latAbs < 65 ? -3 : 0;
  baseTemp += antarcticCircumpolar;

  return Math.max(-2, Math.min(32, baseTemp));
}

function generateTempGrid(month: number): TempGrid {
  const data: number[][] = [];
  for (let i = 0; i < LAT_STEPS; i++) {
    const row: number[] = [];
    const lat = latIndexToValue(i);
    for (let j = 0; j < LON_STEPS; j++) {
      const lon = lonIndexToValue(j);
      row.push(generateBaseTemperature(lat, lon, month));
    }
    data.push(row);
  }
  return {
    latSteps: LAT_STEPS,
    lonSteps: LON_STEPS,
    latMin: LAT_MIN,
    latMax: LAT_MAX,
    lonMin: LON_MIN,
    lonMax: LON_MAX,
    data
  };
}

function generateOceanVectors(month: number): OceanVector[] {
  const vectors: OceanVector[] = [];
  const monthIdx = month - 1;
  const seasonPhase = (monthIdx - 1) / 11 * Math.PI * 2;

  const keyCurrents = [
    { lat: 0, lon: -20, dx: 0.8, dy: 0, base: 1.2 },
    { lat: 0, lon: 100, dx: 0.7, dy: 0, base: 1.0 },
    { lat: 35, lon: -60, dx: 0.3, dy: 0.6, base: 1.5 },
    { lat: 30, lon: 140, dx: 0.4, dy: 0.5, base: 1.4 },
    { lat: -15, lon: -85, dx: -0.3, dy: -0.5, base: 1.1 },
    { lat: 50, lon: -30, dx: -0.5, dy: 0.2, base: 0.9 },
    { lat: -55, lon: 0, dx: 0.9, dy: 0, base: 1.0 },
    { lat: 20, lon: -140, dx: -0.6, dy: -0.3, base: 1.0 },
    { lat: 10, lon: 60, dx: 0.5, dy: 0.4, base: 0.9 },
    { lat: -30, lon: 150, dx: -0.4, dy: -0.3, base: 0.8 },
  ];

  for (let i = 0; i < 80; i++) {
    const lat = latIndexToValue(Math.floor(i * LAT_STEPS / 80)) + (Math.random() - 0.5) * 10;
    for (let j = 0; j < 10; j++) {
      const lon = LON_MIN + (i * 10 + j) % 360 + (Math.random() - 0.5) * 15;

      let dx = Math.sin(lon * 0.02) * 0.3;
      let dy = Math.cos(lat * 0.03) * 0.2;

      for (const current of keyCurrents) {
        const distLat = Math.abs(lat - current.lat);
        const distLon = Math.min(Math.abs(lon - current.lon), 360 - Math.abs(lon - current.lon));
        const dist = Math.sqrt(distLat * distLat + distLon * distLon);
        const influence = Math.max(0, 1 - dist / 40);
        dx += current.dx * influence * current.base;
        dy += current.dy * influence * current.base;
      }

      const hemisphere = lat >= 0 ? 1 : -1;
      dy -= hemisphere * 0.15 * (1 - Math.abs(lat) / 90);

      dx *= 0.5 + 0.5 * Math.abs(Math.sin(seasonPhase + lat * 0.05));
      dy *= 0.5 + 0.5 * Math.abs(Math.cos(seasonPhase + lon * 0.03));

      if (Math.abs(lat) > 60 && Math.abs(lat) < 80) {
        const winterBoost = lat >= 0 ? (month >= 11 || month <= 2 ? 1.5 : 1.0) : (month >= 5 && month <= 8 ? 1.5 : 1.0);
        dx *= winterBoost;
        dy *= winterBoost;
      }

      if (Math.abs(lat) < 20) {
        const summerBoost = lat >= 0 ? (month >= 5 && month <= 8 ? 1.3 : 1.0) : (month >= 11 || month <= 2 ? 1.3 : 1.0);
        dx *= summerBoost;
        dy *= summerBoost;
      }

      const speed = 0.5 + Math.random() * 1.0;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;

      vectors.push({
        lat: Math.max(-85, Math.min(85, lat)),
        lon: ((lon + 180) % 360) - 180,
        dx: dx / mag,
        dy: dy / mag,
        speed
      });
    }
  }

  return vectors;
}

const tempGrids: TempGrid[] = [];
const oceanVectors: OceanVector[][] = [];

for (let m = 1; m <= 12; m++) {
  tempGrids.push(generateTempGrid(m));
  oceanVectors.push(generateOceanVectors(m));
}

export function getTemperatureGrid(month: number): TempGrid {
  const idx = Math.max(0, Math.min(11, month - 1));
  return tempGrids[idx];
}

export function getInterpolatedTemperature(month: number, lat: number, lon: number): number {
  const t = (month - 1) / 11;
  const prevIdx = Math.floor(t * 11);
  const nextIdx = Math.min(11, prevIdx + 1);
  const frac = t * 11 - prevIdx;

  const gridPrev = tempGrids[prevIdx];
  const gridNext = tempGrids[nextIdx];

  return sampleGrid(gridPrev, lat, lon) * (1 - frac) + sampleGrid(gridNext, lat, lon) * frac;
}

function sampleGrid(grid: TempGrid, lat: number, lon: number): number {
  const fi = ((lat - grid.latMin) / (grid.latMax - grid.latMin)) * (grid.latSteps - 1);
  const fj = ((lon - grid.lonMin) / (grid.lonMax - grid.lonMin)) * (grid.lonSteps - 1);

  const i0 = Math.max(0, Math.min(grid.latSteps - 1, Math.floor(fi)));
  const j0 = Math.max(0, Math.min(grid.lonSteps - 1, Math.floor(fj)));
  const i1 = Math.min(grid.latSteps - 1, i0 + 1);
  const j1 = Math.min(grid.lonSteps - 1, j0 + 1);

  const di = fi - i0;
  const dj = fj - j0;

  const t00 = grid.data[i0][j0];
  const t10 = grid.data[i1][j0];
  const t01 = grid.data[i0][j1];
  const t11 = grid.data[i1][j1];

  return t00 * (1 - di) * (1 - dj) + t10 * di * (1 - dj) + t01 * (1 - di) * dj + t11 * di * dj;
}

export function getOceanVectors(month: number): OceanVector[] {
  const idx = Math.max(0, Math.min(11, month - 1));
  return oceanVectors[idx];
}

export function getMonthAbbreviation(month: number): string {
  const idx = Math.max(0, Math.min(11, month - 1));
  return MONTH_ABBR[idx];
}

export function getAverageTemperature(month: number): number {
  const grid = getTemperatureGrid(month);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < grid.latSteps; i++) {
    const lat = latIndexToValue(i);
    const latWeight = Math.cos(lat * Math.PI / 180);
    for (let j = 0; j < grid.lonSteps; j++) {
      sum += grid.data[i][j] * latWeight;
      count += latWeight;
    }
  }
  return sum / count;
}

export function tempToColor(temp: number): { r: number; g: number; b: number } {
  const t = Math.max(0, Math.min(1, (temp + 2) / 34));

  const stops = [
    { p: 0.0, r: 0.42, g: 0.36, b: 1.0 },
    { p: 0.15, r: 0.29, g: 0.49, b: 1.0 },
    { p: 0.3, r: 0.0, g: 0.83, b: 1.0 },
    { p: 0.45, r: 0.0, g: 1.0, b: 0.53 },
    { p: 0.6, r: 1.0, g: 0.87, b: 0.0 },
    { p: 0.75, r: 1.0, g: 0.42, b: 0.21 },
    { p: 0.9, r: 1.0, g: 0.2, b: 0.4 },
    { p: 1.0, r: 0.8, g: 0.1, b: 0.1 },
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].p && t <= stops[i + 1].p) {
      const f = (t - stops[i].p) / (stops[i + 1].p - stops[i].p);
      return {
        r: stops[i].r + (stops[i + 1].r - stops[i].r) * f,
        g: stops[i].g + (stops[i + 1].g - stops[i].g) * f,
        b: stops[i].b + (stops[i + 1].b - stops[i].b) * f,
      };
    }
  }

  return { r: 1, g: 1, b: 1 };
}

export { LAT_STEPS, LON_STEPS, LAT_MIN, LAT_MAX, LON_MIN, LON_MAX };
