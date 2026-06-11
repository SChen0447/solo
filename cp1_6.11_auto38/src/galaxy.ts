import * as THREE from 'three';

export interface GalaxyOptions {
  particleCount: number;
  armCount: number;
  radius: number;
  colorInner: THREE.ColorRepresentation;
  colorOuter: THREE.ColorRepresentation;
  spinSpeed: number;
  armTwist: number;
  thickness: number;
  bulgeSize: number;
}

export interface GalaxyObject {
  group: THREE.Group;
  points: THREE.Points;
  positions: Float32Array;
  colors: Float32Array;
  originalPositions: Float32Array;
  originalColors: Float32Array;
  radii: Float32Array;
  angles: Float32Array;
  armOffsets: Float32Array;
  heightOffsets: Float32Array;
  options: GalaxyOptions;
  rotationOffset: number;
  velocity: THREE.Vector3;
}

const tmpColor = new THREE.Color();

export function createGalaxy(options: GalaxyOptions): GalaxyObject {
  const {
    particleCount,
    armCount,
    radius,
    colorInner,
    colorOuter,
    armTwist,
    thickness,
    bulgeSize
  } = options;

  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const originalPositions = new Float32Array(particleCount * 3);
  const originalColors = new Float32Array(particleCount * 3);
  const radii = new Float32Array(particleCount);
  const angles = new Float32Array(particleCount);
  const armOffsets = new Float32Array(particleCount);
  const heightOffsets = new Float32Array(particleCount);

  const innerColor = new THREE.Color(colorInner);
  const outerColor = new THREE.Color(colorOuter);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    const bulgeFactor = Math.random();
    const bulgeRadius = bulgeSize * Math.pow(bulgeFactor, 3);

    const t = Math.pow(Math.random(), 0.6);
    const r = bulgeRadius + t * (radius - bulgeSize);
    const armIndex = Math.floor(Math.random() * armCount);
    const baseAngle = (armIndex / armCount) * Math.PI * 2;
    const twist = r * armTwist;

    const armSpread = (1.0 - Math.pow(t, 1.5)) * 0.35 + 0.05;
    const armJitter = (Math.random() - 0.5) * armSpread;
    const angle = baseAngle + twist + armJitter;

    const bulgeRandomAngle = Math.random() * Math.PI * 2;
    const bulgeJitter = bulgeFactor < 0.6 ? (Math.random() - 0.5) * (1.0 - bulgeFactor) * 0.8 : 0;

    const finalAngle = bulgeFactor < 0.5 ? bulgeRandomAngle * bulgeFactor + angle * (1 - bulgeFactor) : angle;
    const finalR = bulgeFactor < 0.5 ? bulgeRadius * 0.7 + r * 0.3 : r;

    const x = Math.cos(finalAngle) * finalR + bulgeJitter * finalR * 0.3;
    const z = Math.sin(finalAngle) * finalR + bulgeJitter * finalR * 0.3;

    const heightDecay = Math.exp(-Math.pow(r / (radius * 0.4), 2));
    const heightFactor = (1 - heightDecay) * 0.15 + heightDecay * 1.0;
    const y = (Math.random() - 0.5) * thickness * heightFactor * (1 + (1 - t) * 2.5);

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    originalPositions[i3] = x;
    originalPositions[i3 + 1] = y;
    originalPositions[i3 + 2] = z;

    const distFactor = Math.min(r / radius, 1.0);
    const brightnessBoost = 1.0 - distFactor * 0.5;

    tmpColor.copy(innerColor).lerp(outerColor, Math.pow(distFactor, 0.8));
    tmpColor.multiplyScalar(0.6 + brightnessBoost * 0.5);

    const centerBrightness = Math.exp(-Math.pow(r / (radius * 0.12), 2));
    const haloBoost = centerBrightness * 0.5;
    tmpColor.r = Math.min(1, tmpColor.r + haloBoost * innerColor.r);
    tmpColor.g = Math.min(1, tmpColor.g + haloBoost * innerColor.g);
    tmpColor.b = Math.min(1, tmpColor.b + haloBoost * innerColor.b);

    const colorJitter = 0.85 + Math.random() * 0.25;
    colors[i3] = Math.min(1, tmpColor.r * colorJitter);
    colors[i3 + 1] = Math.min(1, tmpColor.g * colorJitter);
    colors[i3 + 2] = Math.min(1, tmpColor.b * colorJitter);

    originalColors[i3] = colors[i3];
    originalColors[i3 + 1] = colors[i3 + 1];
    originalColors[i3 + 2] = colors[i3 + 2];

    radii[i] = r;
    angles[i] = finalAngle;
    armOffsets[i] = armJitter;
    heightOffsets[i] = y;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.022,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  const group = new THREE.Group();
  group.add(points);

  return {
    group,
    points,
    positions,
    colors,
    originalPositions,
    originalColors,
    radii,
    angles,
    armOffsets,
    heightOffsets,
    options,
    rotationOffset: 0,
    velocity: new THREE.Vector3()
  };
}

export function updateGalaxy(
  galaxy: GalaxyObject,
  delta: number,
  elapsed: number,
  timeScale: number
): void {
  const {
    positions,
    colors,
    originalColors,
    radii,
    angles,
    armOffsets,
    heightOffsets,
    options,
    points
  } = galaxy;

  const { radius, spinSpeed, armTwist, particleCount } = options;

  galaxy.rotationOffset += delta * spinSpeed * timeScale * 0.4;

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    const r = radii[i];
    const t = r / radius;

    const angularVel = 1.0 / (0.4 + t * 0.9);
    const driftFactor = 0.0008 * (1 - Math.pow(t, 0.4));

    radii[i] = Math.min(radius * 1.08, r + driftFactor * delta * timeScale * radius);
    const newR = radii[i];
    const newT = newR / radius;

    const angle = angles[i] + galaxy.rotationOffset * angularVel + armOffsets[i] * (1 + (1 - newT) * 0.5);

    const newTwist = newR * armTwist;
    const finalAngle = angle + (newTwist - r * armTwist) * 0.3;

    const x = Math.cos(finalAngle) * newR;
    const z = Math.sin(finalAngle) * newR;

    const heightDecay = Math.exp(-Math.pow(newR / (radius * 0.4), 2));
    const heightFactor = (1 - heightDecay) * 0.15 + heightDecay * 1.0;
    const y = heightOffsets[i] * (1 + (1 - newT) * 0.3) + Math.sin(elapsed * 1.5 + i * 0.001) * 0.004 * heightFactor;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    const distFactor = Math.min(newT, 1.0);
    const brightnessBoost = 1.0 - distFactor * 0.5;
    const pulse = 0.97 + Math.sin(elapsed * 2.5 + i * 0.013) * 0.03;

    colors[i3] = originalColors[i3] * brightnessBoost * pulse;
    colors[i3 + 1] = originalColors[i3 + 1] * brightnessBoost * pulse;
    colors[i3 + 2] = originalColors[i3 + 2] * brightnessBoost * pulse;
  }

  const posAttr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
  const colAttr = points.geometry.getAttribute('color') as THREE.BufferAttribute;
  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
  posAttr.array = positions;
  colAttr.array = colors;
}

export function applyGravity(
  galaxy: GalaxyObject,
  otherPosition: THREE.Vector3,
  otherMass: number,
  delta: number,
  timeScale: number,
  softening: number = 2.0
): void {
  const pos = galaxy.group.position;
  const diff = new THREE.Vector3().subVectors(otherPosition, pos);
  const distSq = diff.lengthSq() + softening * softening;
  const force = (otherMass * 0.025) / distSq;

  diff.normalize().multiplyScalar(force * delta * timeScale * 60);
  galaxy.velocity.add(diff);
}

export function updateGalaxyPosition(
  galaxy: GalaxyObject,
  delta: number,
  timeScale: number
): void {
  galaxy.group.position.addScaledVector(galaxy.velocity, delta * timeScale * 60);
  galaxy.velocity.multiplyScalar(0.999);
}

export function applyTidalForces(
  galaxy: GalaxyObject,
  otherPosition: THREE.Vector3,
  otherMass: number,
  delta: number,
  timeScale: number
): void {
  const { positions, radii, options } = galaxy;
  const { radius, particleCount } = options;

  const gPos = galaxy.group.position;
  const toOther = new THREE.Vector3().subVectors(otherPosition, gPos);
  const distToOther = toOther.length();

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    const localX = positions[i3];
    const localY = positions[i3 + 1];
    const localZ = positions[i3 + 2];
    const worldX = gPos.x + localX;
    const worldY = gPos.y + localY;
    const worldZ = gPos.z + localZ;

    const dx = otherPosition.x - worldX;
    const dy = otherPosition.y - worldY;
    const dz = otherPosition.z - worldZ;
    const pDistSq = dx * dx + dy * dy + dz * dz + 1.0;
    const pDist = Math.sqrt(pDistSq);

    const diffFactor = (1.0 / (pDistSq * pDist)) - (1.0 / (distToOther * distToOther * distToOther));
    const tidalStrength = otherMass * 0.00004 * diffFactor * delta * timeScale * 60;

    const rFactor = 1.0 - Math.exp(-Math.pow(radii[i] / (radius * 0.7), 2));

    positions[i3] += dx * tidalStrength * rFactor;
    positions[i3 + 1] += dy * tidalStrength * rFactor * 0.5;
    positions[i3 + 2] += dz * tidalStrength * rFactor;
  }
}
