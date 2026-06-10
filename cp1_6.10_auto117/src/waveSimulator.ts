export interface WaveSource {
  x: number;
  y: number;
  z: number;
  frequency: number;
  amplitude: number;
  phase: number;
}

const COS_TABLE_SIZE = 4096;
const COS_TABLE = new Float32Array(COS_TABLE_SIZE);
for (let i = 0; i < COS_TABLE_SIZE; i++) {
  COS_TABLE[i] = Math.cos((i / COS_TABLE_SIZE) * Math.PI * 2);
}

function fastCos(angle: number): number {
  let normalized = angle % (Math.PI * 2);
  if (normalized < 0) normalized += Math.PI * 2;
  const index = Math.floor((normalized / (Math.PI * 2)) * COS_TABLE_SIZE) % COS_TABLE_SIZE;
  return COS_TABLE[index];
}

const SOUND_SPEED = 343;

export function computeInterference(
  x: number,
  y: number,
  z: number,
  sources: WaveSource[],
  time: number
): number {
  let totalPressure = 0;

  for (const source of sources) {
    const dx = x - source.x;
    const dy = y - source.y;
    const dz = z - source.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < 0.01) {
      totalPressure += source.amplitude;
      continue;
    }

    const wavelength = SOUND_SPEED / source.frequency;
    const k = (2 * Math.PI) / wavelength;
    const omega = 2 * Math.PI * source.frequency;
    const attenuation = 1 / (1 + distance * 0.05);
    const phase = k * distance - omega * time + source.phase;

    totalPressure += source.amplitude * attenuation * fastCos(phase);
  }

  const maxAmplitude = sources.reduce((sum, s) => sum + s.amplitude, 0);
  const normalized = (totalPressure + maxAmplitude) / (2 * maxAmplitude);
  return Math.max(0, Math.min(1, normalized));
}

export function getInterferenceType(
  sources: WaveSource[],
  midpoint: { x: number; y: number; z: number }
): 'constructive' | 'destructive' | 'mixed' {
  if (sources.length < 2) return 'mixed';

  const [s1, s2] = sources;
  const d1 = Math.sqrt(
    Math.pow(midpoint.x - s1.x, 2) +
    Math.pow(midpoint.y - s1.y, 2) +
    Math.pow(midpoint.z - s1.z, 2)
  );
  const d2 = Math.sqrt(
    Math.pow(midpoint.x - s2.x, 2) +
    Math.pow(midpoint.y - s2.y, 2) +
    Math.pow(midpoint.z - s2.z, 2)
  );

  const wavelength = SOUND_SPEED / s1.frequency;
  const pathDiff = Math.abs(d1 - d2);
  const ratio = pathDiff / wavelength;
  const fractional = ratio - Math.floor(ratio);

  if (fractional < 0.15 || fractional > 0.85) {
    return 'constructive';
  } else if (fractional > 0.35 && fractional < 0.65) {
    return 'destructive';
  }
  return 'mixed';
}
