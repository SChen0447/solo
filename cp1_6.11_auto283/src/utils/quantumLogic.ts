export interface MeasurementRecord {
  id: string;
  aliceAngle: number;
  bobAngle: number;
  aliceResult: number;
  bobResult: number;
  timestamp: number;
}

export interface CHSHOptions {
  a: number;
  aPrime: number;
  b: number;
  bPrime: number;
}

export interface StatsData {
  total: number;
  aliceUp: number;
  aliceDown: number;
  bobUp: number;
  bobDown: number;
  same: number;
  different: number;
  sValue: number;
  eValues: {
    ab: number;
    abPrime: number;
    aPrimeB: number;
    aPrimeBPrime: number;
  };
}

export function generateSpinResult(aliceAngle: number, bobAngle: number): { alice: number; bob: number } {
  const angleDiff = Math.abs(aliceAngle - bobAngle) * (Math.PI / 180);
  const aliceResult = Math.random() < 0.5 ? 1 : -1;
  const correlationProbability = Math.pow(Math.cos(angleDiff), 2);
  const bobResult = Math.random() < correlationProbability ? aliceResult : -aliceResult;
  return { alice: aliceResult, bob: bobResult };
}

export function calculateCorrelation(records: MeasurementRecord[], aliceAngle: number, bobAngle: number, tolerance: number = 5): number {
  const filtered = records.filter(
    (r) =>
      Math.abs(r.aliceAngle - aliceAngle) < tolerance &&
      Math.abs(r.bobAngle - bobAngle) < tolerance
  );
  if (filtered.length === 0) return 0;
  const same = filtered.filter((r) => r.aliceResult === r.bobResult).length;
  const different = filtered.length - same;
  return (same - different) / filtered.length;
}

export function calculateCHSH(records: MeasurementRecord[], options: CHSHOptions): number {
  const { a, aPrime, b, bPrime } = options;
  const Eab = calculateCorrelation(records, a, b);
  const EabPrime = calculateCorrelation(records, a, bPrime);
  const EaPrimeB = calculateCorrelation(records, aPrime, b);
  const EaPrimeBPrime = calculateCorrelation(records, aPrime, bPrime);
  return Math.abs(Eab - EabPrime) + Math.abs(EaPrimeB + EaPrimeBPrime);
}

export function calculateStats(records: MeasurementRecord[], chshOptions: CHSHOptions): StatsData {
  const total = records.length;
  const aliceUp = records.filter((r) => r.aliceResult === 1).length;
  const aliceDown = total - aliceUp;
  const bobUp = records.filter((r) => r.bobResult === 1).length;
  const bobDown = total - bobUp;
  const same = records.filter((r) => r.aliceResult === r.bobResult).length;
  const different = total - same;
  const sValue = total > 0 ? calculateCHSH(records, chshOptions) : 0;

  const eValues = {
    ab: calculateCorrelation(records, chshOptions.a, chshOptions.b),
    abPrime: calculateCorrelation(records, chshOptions.a, chshOptions.bPrime),
    aPrimeB: calculateCorrelation(records, chshOptions.aPrime, chshOptions.b),
    aPrimeBPrime: calculateCorrelation(records, chshOptions.aPrime, chshOptions.bPrime),
  };

  return {
    total,
    aliceUp,
    aliceDown,
    bobUp,
    bobDown,
    same,
    different,
    sValue,
    eValues,
  };
}

export function theoreticalCorrelation(angleDiff: number): number {
  return Math.cos((2 * angleDiff * Math.PI) / 180);
}

export function generateScatterData(records: MeasurementRecord[]): Array<{ x: number; y: number }> {
  const angleGroups = new Map<string, { same: number; total: number }>();
  records.forEach((record) => {
    const angleDiff = Math.abs(record.aliceAngle - record.bobAngle) % 180;
    const bucket = Math.round(angleDiff / 5) * 5;
    const key = bucket.toString();
    const existing = angleGroups.get(key) || { same: 0, total: 0 };
    angleGroups.set(key, {
      same: existing.same + (record.aliceResult === record.bobResult ? 1 : 0),
      total: existing.total + 1,
    });
  });
  const result: Array<{ x: number; y: number }> = [];
  angleGroups.forEach((value, key) => {
    if (value.total > 0) {
      result.push({
        x: parseFloat(key),
        y: (value.same - (value.total - value.same)) / value.total,
      });
    }
  });
  return result.sort((a, b) => a.x - b.x);
}
