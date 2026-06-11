export interface BandEnergy {
  low: number;
  mid: number;
  high: number;
}

export function calculateBandEnergy(frequencyData: Uint8Array, sampleRate: number): BandEnergy {
  const binCount = frequencyData.length;
  const nyquist = sampleRate / 2;
  const binWidth = nyquist / binCount;

  let lowSum = 0;
  let lowCount = 0;
  let midSum = 0;
  let midCount = 0;
  let highSum = 0;
  let highCount = 0;

  for (let i = 0; i < binCount; i++) {
    const freq = i * binWidth;
    const value = frequencyData[i] / 255;

    if (freq <= 250) {
      lowSum += value;
      lowCount++;
    } else if (freq <= 4000) {
      midSum += value;
      midCount++;
    } else if (freq <= 20000) {
      highSum += value;
      highCount++;
    }
  }

  return {
    low: lowCount > 0 ? lowSum / lowCount : 0,
    mid: midCount > 0 ? midSum / midCount : 0,
    high: highCount > 0 ? highSum / highCount : 0,
  };
}

export function generateFingerprint(frequencyData: Uint8Array, points: number = 32): number[] {
  const result: number[] = [];
  const step = Math.floor(frequencyData.length / points);
  for (let i = 0; i < points; i++) {
    const idx = i * step;
    result.push(frequencyData[idx] / 255);
  }
  return result;
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function gainToDb(gain: number): number {
  if (gain <= 0) return -Infinity;
  return 20 * Math.log10(gain);
}
