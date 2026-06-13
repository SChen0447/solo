export interface GalaxyParams {
  starCount: number;
  armCount: number;
  radius: number;
  armSpread: number;
  coreStarCount: number;
}

export interface StarData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  distances: Float32Array;
  armIndices: Float32Array;
  angles: Float32Array;
}

export function generateGalaxy(params: GalaxyParams): StarData {
  const { starCount, armCount, radius, armSpread, coreStarCount } = params;
  const totalStars = starCount * armCount + coreStarCount;

  const positions = new Float32Array(totalStars * 3);
  const colors = new Float32Array(totalStars * 3);
  const sizes = new Float32Array(totalStars);
  const distances = new Float32Array(totalStars);
  const armIndices = new Float32Array(totalStars);
  const angles = new Float32Array(totalStars);

  let idx = 0;

  for (let arm = 0; arm < armCount; arm++) {
    const armAngle = (arm / armCount) * Math.PI * 2;

    for (let i = 0; i < starCount; i++) {
      const t = i / starCount;
      const distance = Math.pow(t, 0.6) * radius;

      const spiralAngle = armAngle + distance * 0.5;

      const spreadX = (Math.random() - 0.5) * armSpread * (distance / radius + 0.1);
      const spreadY = (Math.random() - 0.5) * armSpread * 0.15 * (distance / radius + 0.05);
      const spreadZ = (Math.random() - 0.5) * armSpread * (distance / radius + 0.1);

      const x = Math.cos(spiralAngle) * distance + spreadX;
      const y = spreadY;
      const z = Math.sin(spiralAngle) * distance + spreadZ;

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      distances[idx] = distance;
      armIndices[idx] = arm;
      angles[idx] = spiralAngle;

      const centerWeight = 1 - distance / radius;
      const r = 0.6 + centerWeight * 0.4 + Math.random() * 0.1;
      const g = 0.7 + centerWeight * 0.3 + Math.random() * 0.1;
      const b = 1.0 - centerWeight * 0.3 + Math.random() * 0.15;

      if (distance / radius < 0.15) {
        colors[idx * 3] = 1.0;
        colors[idx * 3 + 1] = 0.95;
        colors[idx * 3 + 2] = 0.8;
      } else if (distance / radius < 0.4) {
        colors[idx * 3] = 0.7 + Math.random() * 0.3;
        colors[idx * 3 + 1] = 0.85 + Math.random() * 0.15;
        colors[idx * 3 + 2] = 1.0;
      } else {
        const outerT = (distance / radius - 0.4) / 0.6;
        if (Math.random() > 0.5) {
          colors[idx * 3] = 0.4 + Math.random() * 0.2;
          colors[idx * 3 + 1] = 0.6 + Math.random() * 0.2;
          colors[idx * 3 + 2] = 1.0;
        } else {
          colors[idx * 3] = 1.0;
          colors[idx * 3 + 1] = 0.3 + Math.random() * 0.3;
          colors[idx * 3 + 2] = 0.2 + Math.random() * 0.2;
        }
      }

      sizes[idx] = (1.0 - centerWeight * 0.3) * (0.8 + Math.random() * 1.5);
      idx++;
    }
  }

  for (let i = 0; i < coreStarCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius * 0.08;

    const x = Math.cos(angle) * distance;
    const y = (Math.random() - 0.5) * radius * 0.02;
    const z = Math.sin(angle) * distance;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    distances[idx] = distance;
    armIndices[idx] = -1;
    angles[idx] = angle;

    colors[idx * 3] = 1.0;
    colors[idx * 3 + 1] = 0.95 + Math.random() * 0.05;
    colors[idx * 3 + 2] = 0.75 + Math.random() * 0.15;

    sizes[idx] = 2.5 + Math.random() * 2.0;
    idx++;
  }

  return { positions, colors, sizes, distances, armIndices, angles };
}

export function getArmEndPosition(armIndex: number, armCount: number, radius: number): { x: number; y: number; z: number } {
  const armAngle = (armIndex / armCount) * Math.PI * 2;
  const distance = radius * 0.9;
  const spiralAngle = armAngle + distance * 0.5;
  return {
    x: Math.cos(spiralAngle) * distance,
    y: 0,
    z: Math.sin(spiralAngle) * distance,
  };
}
