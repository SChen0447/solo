import * as THREE from 'three';
import type { LayerInfo } from './rockLayers';

export type MineralType = 'gold' | 'silver' | 'copper';

export interface MineralConfig {
  type: MineralType;
  name: string;
  color: string;
  hexColor: number;
}

export interface VeinData {
  id: string;
  type: MineralType;
  name: string;
  color: string;
  hexColor: number;
  curve: THREE.CatmullRomCurve3;
  mesh: THREE.Mesh;
  originalMaterial: THREE.MeshStandardMaterial;
  length: number;
  branchCount: number;
  depth: number;
  estimatedReserve: number;
  particles: THREE.Points;
  particleOffsets: Float32Array;
}

export interface VeinResult {
  veins: VeinData[];
}

export interface VeinParams {
  bounds: {
    width: number;
    depth: number;
    totalHeight: number;
  };
  density: number;
  layerInfo: LayerInfo[];
}

const MINERAL_CONFIGS: MineralConfig[] = [
  { type: 'gold', name: '金矿', color: '#FFD700', hexColor: 0xffd700 },
  { type: 'silver', name: '银矿', color: '#C0C0C0', hexColor: 0xc0c0c0 },
  { type: 'copper', name: '铜矿', color: '#B87333', hexColor: 0xb87333 },
];

const PARTICLES_PER_VEIN = 200;
const PARTICLE_SPEED = 0.5;
const TUBE_RADIUS = 0.5;
const TUBE_RADIAL_SEGMENTS = 8;
const TUBE_TUBULAR_SEGMENTS = 50;
const PARTICLE_SIZE = 0.2;

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomMineral(): MineralConfig {
  const weights = [0.35, 0.35, 0.30];
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < MINERAL_CONFIGS.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return MINERAL_CONFIGS[i];
  }
  return MINERAL_CONFIGS[0];
}

function generateControlPoints(
  bounds: { width: number; depth: number; totalHeight: number },
  count: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const halfW = bounds.width / 2 - 20;
  const halfD = bounds.depth / 2 - 20;
  const halfH = bounds.totalHeight / 2 - 10;

  const startX = randRange(-halfW, halfW);
  const startY = randRange(-halfH + 30, halfH - 20);
  const startZ = randRange(-halfD, halfD);
  points.push(new THREE.Vector3(startX, startY, startZ));

  let curX = startX;
  let curY = startY;
  let curZ = startZ;

  for (let i = 1; i < count; i++) {
    const radius = randRange(50, 150);
    const theta = randRange(0, Math.PI * 2);
    const phi = randRange(0, Math.PI);

    const dx = radius * Math.sin(phi) * Math.cos(theta);
    const dy = radius * Math.cos(phi) * 0.5;
    const dz = radius * Math.sin(phi) * Math.sin(theta);

    curX = THREE.MathUtils.clamp(curX + dx * 0.3, -halfW, halfW);
    curY = THREE.MathUtils.clamp(curY + dy * 0.3, -halfH, halfH);
    curZ = THREE.MathUtils.clamp(curZ + dz * 0.3, -halfD, halfD);

    points.push(new THREE.Vector3(curX, curY, curZ));
  }

  return points;
}

function createVeinMesh(
  curve: THREE.CatmullRomCurve3,
  hexColor: number
): { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial } {
  const geometry = new THREE.TubeGeometry(
    curve,
    TUBE_TUBULAR_SEGMENTS,
    TUBE_RADIUS,
    TUBE_RADIAL_SEGMENTS,
    false
  );

  const material = new THREE.MeshStandardMaterial({
    color: hexColor,
    emissive: hexColor,
    emissiveIntensity: 0.3,
    metalness: 0.9,
    roughness: 0.2,
    transparent: false,
    opacity: 1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  return { mesh, material };
}

function createParticles(
  curve: THREE.CatmullRomCurve3,
  hexColor: number,
  count: number
): { points: THREE.Points; offsets: Float32Array } {
  const positions = new Float32Array(count * 3);
  const offsets = new Float32Array(count);
  const tmp = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const t = Math.random();
    offsets[i] = t;
    curve.getPointAt(t, tmp);
    positions[i * 3] = tmp.x;
    positions[i * 3 + 1] = tmp.y;
    positions[i * 3 + 2] = tmp.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: hexColor,
    size: PARTICLE_SIZE,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  return { points, offsets };
}

export function generateVeins(params: VeinParams): VeinResult {
  const { bounds, density, layerInfo } = params;
  const veins: VeinData[] = [];

  const baseCount = Math.floor(randRange(20, 31));
  const veinCount = Math.max(10, Math.min(60, Math.floor(baseCount * density)));
  const maxParticles = 6000;
  const actualVeinCount = Math.min(veinCount, Math.floor(maxParticles / PARTICLES_PER_VEIN));

  const surfaceY = layerInfo[0]?.yStart ?? 150;

  for (let i = 0; i < actualVeinCount; i++) {
    const mineral = randomMineral();
    const controlPointCount = Math.floor(randRange(5, 11));
    const controlPoints = generateControlPoints(bounds, controlPointCount);

    const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5);
    const { mesh, material } = createVeinMesh(curve, mineral.hexColor);
    const { points: particlePoints, offsets } = createParticles(curve, mineral.hexColor, PARTICLES_PER_VEIN);

    const midPoint = curve.getPointAt(0.5);
    const depth = surfaceY - midPoint.y;
    const length = curve.getLength();
    const branchCount = Math.floor(randRange(1, 4));
    const estimatedReserve = Math.min(100, (length / 500) * 100 + branchCount * 5 + randRange(0, 15));

    const vein: VeinData = {
      id: `vein_${i}_${Date.now()}`,
      type: mineral.type,
      name: mineral.name,
      color: mineral.color,
      hexColor: mineral.hexColor,
      curve,
      mesh,
      originalMaterial: material,
      length,
      branchCount,
      depth: Math.max(0, depth),
      estimatedReserve: Number(estimatedReserve.toFixed(1)),
      particles: particlePoints,
      particleOffsets: offsets,
    };

    mesh.userData.veinId = vein.id;
    mesh.userData.veinData = vein;
    particlePoints.userData.veinId = vein.id;

    veins.push(vein);
  }

  return { veins };
}

export function updateParticles(
  veins: VeinData[],
  deltaTime: number,
  speedMultiplier: number = 1
): void {
  const tmp = new THREE.Vector3();

  for (const vein of veins) {
    const positions = vein.particles.geometry.attributes.position as THREE.BufferAttribute;
    const posArr = positions.array as Float32Array;
    const count = vein.particleOffsets.length;

    for (let i = 0; i < count; i++) {
      vein.particleOffsets[i] += (PARTICLE_SPEED * speedMultiplier * deltaTime) / vein.length;
      if (vein.particleOffsets[i] > 1) {
        vein.particleOffsets[i] -= 1;
      }

      vein.curve.getPointAt(vein.particleOffsets[i], tmp);
      posArr[i * 3] = tmp.x;
      posArr[i * 3 + 1] = tmp.y;
      posArr[i * 3 + 2] = tmp.z;
    }

    positions.needsUpdate = true;
  }
}

export function setVeinHighlight(vein: VeinData, highlighted: boolean): void {
  const mat = vein.mesh.material as THREE.MeshStandardMaterial;
  if (highlighted) {
    mat.color.setHex(0xffffff);
    mat.emissive.setHex(0xffffff);
    mat.emissiveIntensity = 0.8;
  } else {
    mat.color.setHex(vein.hexColor);
    mat.emissive.setHex(vein.hexColor);
    mat.emissiveIntensity = 0.3;
  }
}

export function disposeVeins(veins: VeinData[]): void {
  for (const vein of veins) {
    vein.mesh.geometry.dispose();
    (vein.mesh.material as THREE.Material).dispose();
    vein.particles.geometry.dispose();
    (vein.particles.material as THREE.Material).dispose();
  }
}
