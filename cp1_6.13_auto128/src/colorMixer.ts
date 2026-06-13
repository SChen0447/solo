export interface MixResult {
  r: number;
  g: number;
  b: number;
  sizeDelta: number;
  haloIntensity: number;
}

export function mixColors(
  r1: number, g1: number, b1: number, weight1: number,
  r2: number, g2: number, b2: number, weight2: number
): MixResult {
  const totalWeight = weight1 + weight2;
  const wr1 = weight1 / totalWeight;
  const wr2 = weight2 / totalWeight;

  const mixedR = Math.round(r1 * wr1 + r2 * wr2);
  const mixedG = Math.round(g1 * wr1 + g2 * wr2);
  const mixedB = Math.round(b1 * wr1 + b2 * wr2);

  const dr = Math.abs(r1 - r2);
  const dg = Math.abs(g1 - g2);
  const db = Math.abs(b1 - b2);
  const colorDiff = (dr + dg + db) / (255 * 3);

  const sizeDelta = 5 + colorDiff * 3;
  const haloIntensity = 0.15 + colorDiff * 0.25;

  return {
    r: Math.min(255, Math.max(0, mixedR)),
    g: Math.min(255, Math.max(0, mixedG)),
    b: Math.min(255, Math.max(0, mixedB)),
    sizeDelta,
    haloIntensity,
  };
}
