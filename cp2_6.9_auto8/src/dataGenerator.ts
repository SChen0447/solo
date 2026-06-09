export interface DataPoint {
  x: number;
  y: number;
  z: number;
  value: number;
}

export interface OceanDataset {
  width: number;
  height: number;
  points: DataPoint[];
  minValue: number;
  maxValue: number;
}

export function generateOceanData(width: number = 100, height: number = 100): OceanDataset {
  const points: DataPoint[] = [];
  let minValue = Infinity;
  let maxValue = -Infinity;

  const scaleX = 10;
  const scaleY = 10;
  const scaleZ = 5;

  for (let iy = 0; iy < height; iy++) {
    for (let ix = 0; ix < width; ix++) {
      const nx = ix / width;
      const ny = iy / height;

      const x = (nx - 0.5) * scaleX;
      const y = (ny - 0.5) * scaleY;

      const value =
        Math.sin(nx * Math.PI * 3) * Math.cos(ny * Math.PI * 2) * 0.4 +
        Math.sin(nx * Math.PI * 6 + ny * Math.PI * 4) * 0.2 +
        Math.cos(nx * Math.PI * 1.5 - ny * Math.PI * 2.5) * 0.3 +
        (Math.random() - 0.5) * 0.1;

      const z = value * scaleZ;

      if (value < minValue) minValue = value;
      if (value > maxValue) maxValue = value;

      points.push({ x, y, z, value });
    }
  }

  return { width, height, points, minValue, maxValue };
}
