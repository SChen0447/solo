import * as THREE from 'three';

export interface ParticleData {
  position: THREE.Vector3;
  color: THREE.Color;
  alpha: number;
  probability: number;
  radius: number;
}

export interface OrbitParams {
  n: number;
  l: number;
  m: number;
  particleCount: number;
}

const factorial = (n: number): number => {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
};

const doubleFactorial = (n: number): number => {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = n; i > 0; i -= 2) result *= i;
  return result;
};

const associatedLegendre = (l: number, m: number, x: number): number => {
  const absM = Math.abs(m);
  if (absM > l) return 0;
  if (l === 0) return 1;

  let pmm = 1;
  if (absM > 0) {
    const somx2 = Math.sqrt(Math.max(0, 1 - x * x));
    let fact = 1;
    for (let i = 1; i <= absM; i++) {
      pmm *= (-fact) * somx2;
      fact += 2;
    }
  }
  if (l === absM) return pmm;

  let pmmp1 = x * (2 * absM + 1) * pmm;
  if (l === absM + 1) return pmmp1;

  let pll = 0;
  for (let ll = absM + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + absM - 1) * pmm) / (ll - absM);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
};

const sphericalHarmonic = (l: number, m: number, theta: number, phi: number): number => {
  const absM = Math.abs(m);
  const norm = Math.sqrt(((2 * l + 1) * factorial(l - absM)) / (4 * Math.PI * factorial(l + absM)));
  const plm = associatedLegendre(l, absM, Math.cos(theta));

  if (m > 0) {
    return norm * plm * Math.cos(m * phi) * Math.SQRT2;
  } else if (m < 0) {
    return norm * plm * Math.sin(absM * phi) * Math.SQRT2;
  } else {
    return norm * plm;
  }
};

const laguerre = (n: number, alpha: number, x: number): number => {
  if (n === 0) return 1;
  if (n === 1) return 1 + alpha - x;

  let lk_2 = 1;
  let lk_1 = 1 + alpha - x;
  let lk = 0;

  for (let k = 2; k <= n; k++) {
    lk = ((2 * k - 1 + alpha - x) * lk_1 - (k - 1 + alpha) * lk_2) / k;
    lk_2 = lk_1;
    lk_1 = lk;
  }
  return lk;
};

const radialWaveFunction = (n: number, l: number, r: number): number => {
  const a0 = 0.529;
  const rho = (2 * r) / (n * a0);
  const normalization = Math.sqrt(
    Math.pow(2 / (n * a0), 3) *
      factorial(n - l - 1) /
      (2 * n * factorial(n + l))
  );
  const exponential = Math.exp(-rho / 2);
  const polynomial = laguerre(n - l - 1, 2 * l + 1, rho);
  return normalization * exponential * Math.pow(rho, l) * polynomial;
};

const getOrbitScale = (n: number): number => {
  return n * n * 1.2;
};

const sampleRandomPoint = (scale: number): { r: number; theta: number; phi: number } => {
  const r = Math.pow(Math.random(), 1 / 3) * scale;
  const theta = Math.acos(2 * Math.random() - 1);
  const phi = Math.random() * 2 * Math.PI;
  return { r, theta, phi };
};

export const generateOrbitParticles = (params: OrbitParams): ParticleData[] => {
  const { n, l, m, particleCount } = params;
  const particles: ParticleData[] = [];
  const scale = getOrbitScale(n);

  let maxProbability = 0;
  const preSampleCount = 5000;
  for (let i = 0; i < preSampleCount; i++) {
    const { r, theta, phi } = sampleRandomPoint(scale);
    const radial = radialWaveFunction(n, l, r);
    const angular = sphericalHarmonic(l, m, theta, phi);
    const psi = radial * angular;
    const prob = psi * psi * r * r;
    if (prob > maxProbability) maxProbability = prob;
  }

  if (maxProbability <= 0) maxProbability = 1;

  let attempts = 0;
  const maxAttempts = particleCount * 50;

  while (particles.length < particleCount && attempts < maxAttempts) {
    attempts++;
    const { r, theta, phi } = sampleRandomPoint(scale);

    const radial = radialWaveFunction(n, l, r);
    const angular = sphericalHarmonic(l, m, theta, phi);
    const psi = radial * angular;
    const prob = psi * psi * r * r;
    const normalizedProb = prob / maxProbability;

    if (Math.random() < normalizedProb) {
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);

      const normalizedR = Math.min(r / scale, 1);
      const alpha = 0.9 - normalizedR * 0.7;

      particles.push({
        position: new THREE.Vector3(x, y, z),
        color: new THREE.Color(),
        alpha: Math.max(0.2, alpha),
        probability: normalizedProb,
        radius: r
      });
    }
  }

  while (particles.length < particleCount) {
    const { r, theta, phi } = sampleRandomPoint(scale * 0.5);
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);
    const normalizedR = Math.min(r / scale, 1);
    particles.push({
      position: new THREE.Vector3(x, y, z),
      color: new THREE.Color(),
      alpha: 0.5,
      probability: 0.5,
      radius: r
    });
  }

  return particles;
};

export type DisplayMode = 'pointcloud' | 'density' | 'slice';

export interface OrbitColors {
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  emissiveIntensity: number;
}

export const getOrbitColors = (l: number): OrbitColors => {
  switch (l) {
    case 0:
      return {
        colorStart: new THREE.Color('#4488FF'),
        colorEnd: new THREE.Color('#FFFFFF'),
        emissiveIntensity: 0.2
      };
    case 1:
      return {
        colorStart: new THREE.Color('#FF4444'),
        colorEnd: new THREE.Color('#FF8800'),
        emissiveIntensity: 0.2
      };
    case 2:
      return {
        colorStart: new THREE.Color('#44FF44'),
        colorEnd: new THREE.Color('#8844FF'),
        emissiveIntensity: 0.2
      };
    default:
      return {
        colorStart: new THREE.Color('#FFFFFF'),
        colorEnd: new THREE.Color('#AAAAAA'),
        emissiveIntensity: 0.2
      };
  }
};
