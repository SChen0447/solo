export type SpectralType = 'C' | 'S' | 'V' | 'B';

export interface AsteroidData {
  id: string;
  name: string;
  nameCn: string;
  spectralType: SpectralType;
  diameter: number;
  mass: string;
  orbitalPeriod: number;
  discoveryDate: string;
  description: string;
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  ascendingNode: number;
  perihelionArg: number;
  meanAnomaly0: number;
}

export const SPECTRAL_COLORS: Record<SpectralType, number> = {
  C: 0x888888,
  S: 0xb5651d,
  V: 0xd4c9a0,
  B: 0x6a8599
};

export const SPECTRAL_NAMES: Record<SpectralType, string> = {
  C: 'C型（碳质）',
  S: 'S型（石质）',
  V: 'V型（玄武岩质）',
  B: 'B型（碳质变种）'
};

export const MAJOR_ASTEROIDS: AsteroidData[] = [
  {
    id: 'ceres',
    name: 'Ceres',
    nameCn: '谷神星',
    spectralType: 'C',
    diameter: 939.4,
    mass: '9.39 × 10²⁰ kg',
    orbitalPeriod: 4.60,
    discoveryDate: '1801-01-01',
    description: '谷神星是小行星带中最大的天体，也是唯一被归类为矮行星的小行星。它约占小行星带总质量的25%，表面可能存在水冰。',
    semiMajorAxis: 2.7675,
    eccentricity: 0.0785,
    inclination: 10.59,
    ascendingNode: 80.32,
    perihelionArg: 73.59,
    meanAnomaly0: 95.40
  },
  {
    id: 'vesta',
    name: 'Vesta',
    nameCn: '灶神星',
    spectralType: 'V',
    diameter: 525.4,
    mass: '2.59 × 10²⁰ kg',
    orbitalPeriod: 3.63,
    discoveryDate: '1807-03-29',
    description: '灶神星是小行星带中质量第二大的天体，占小行星带总质量的约9%。它是一颗分化的原行星，具有铁镍内核。',
    semiMajorAxis: 2.3615,
    eccentricity: 0.0887,
    inclination: 7.14,
    ascendingNode: 103.81,
    perihelionArg: 151.20,
    meanAnomaly0: 38.76
  },
  {
    id: 'pallas',
    name: 'Pallas',
    nameCn: '智神星',
    spectralType: 'B',
    diameter: 512,
    mass: '2.04 × 10²⁰ kg',
    orbitalPeriod: 4.62,
    discoveryDate: '1802-03-28',
    description: '智神星是第三颗被发现的小行星，轨道倾角异常大（约34.8度），使其轨道远远超出主小行星带的平面。',
    semiMajorAxis: 2.7727,
    eccentricity: 0.2313,
    inclination: 34.84,
    ascendingNode: 173.01,
    perihelionArg: 309.78,
    meanAnomaly0: 78.36
  },
  {
    id: 'hygiea',
    name: 'Hygiea',
    nameCn: '健神星',
    spectralType: 'C',
    diameter: 434,
    mass: '8.67 × 10¹⁹ kg',
    orbitalPeriod: 5.56,
    discoveryDate: '1849-04-12',
    description: '健神星是小行星带中第四大的天体，位于主带外缘。它是C型小行星家族的代表，表面富含碳质物质。',
    semiMajorAxis: 3.1423,
    eccentricity: 0.1172,
    inclination: 3.84,
    ascendingNode: 283.23,
    perihelionArg: 311.85,
    meanAnomaly0: 258.92
  },
  {
    id: 'europa',
    name: 'Europa',
    nameCn: '欧女星',
    spectralType: 'C',
    diameter: 312.2,
    mass: '5.56 × 10¹⁹ kg',
    orbitalPeriod: 5.46,
    discoveryDate: '1858-02-04',
    description: '欧女星是一颗大型C型小行星，位于主带外缘区域。它的表面光谱显示存在水合矿物，表明其可能含有水冰。',
    semiMajorAxis: 3.0996,
    eccentricity: 0.1023,
    inclination: 7.48,
    ascendingNode: 130.19,
    perihelionArg: 197.60,
    meanAnomaly0: 172.52
  }
];

export const BACKGROUND_PARTICLE_COUNT = 2000;

export interface ParticleData {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  ascendingNode: number;
  perihelionArg: number;
  meanAnomaly0: number;
}

export function generateBackgroundParticles(count: number): ParticleData[] {
  const particles: ParticleData[] = [];
  const innerRadius = 2.1;
  const outerRadius = 3.3;

  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const a = innerRadius + (outerRadius - innerRadius) * t;
    const e = Math.random() * 0.2;
    const inc = (Math.random() - 0.5) * 20;
    const node = Math.random() * 360;
    const peri = Math.random() * 360;
    const m0 = Math.random() * 360;

    particles.push({
      semiMajorAxis: a,
      eccentricity: e,
      inclination: inc,
      ascendingNode: node,
      perihelionArg: peri,
      meanAnomaly0: m0
    });
  }

  return particles;
}
