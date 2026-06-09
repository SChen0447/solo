import * as THREE from 'three';

export interface LayerInfo {
  name: string;
  color: string;
  thickness: number;
  yStart: number;
  yEnd: number;
}

export interface LayerParams {
  width: number;
  depth: number;
  totalHeight: number;
  noiseAmplitude: number;
  opacity: number;
}

export interface LayerResult {
  meshes: THREE.Mesh[];
  edges: THREE.LineSegments[];
  layerInfo: LayerInfo[];
}

const LAYER_PRESETS = [
  { name: '土壤层', color: '#8B6914' },
  { name: '砂岩层', color: '#C2B280' },
  { name: '石灰岩层', color: '#E8E0C8' },
  { name: '花岗岩层', color: '#B0A090' },
  { name: '玄武岩层', color: '#4A4A4A' },
];

function noise2D(x: number, y: number, seed: number = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.758) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const corners = (noise2D(x - 1, y - 1, seed) + noise2D(x + 1, y - 1, seed) +
    noise2D(x - 1, y + 1, seed) + noise2D(x + 1, y + 1, seed)) / 16;
  const sides = (noise2D(x - 1, y, seed) + noise2D(x + 1, y, seed) +
    noise2D(x, y - 1, seed) + noise2D(x, y + 1, seed)) / 8;
  const center = noise2D(x, y, seed) / 4;
  return corners + sides + center;
}

function interpolatedNoise(x: number, y: number, seed: number): number {
  const intX = Math.floor(x);
  const fracX = x - intX;
  const intY = Math.floor(y);
  const fracY = y - intY;

  const v1 = smoothNoise(intX, intY, seed);
  const v2 = smoothNoise(intX + 1, intY, seed);
  const v3 = smoothNoise(intX, intY + 1, seed);
  const v4 = smoothNoise(intX + 1, intY + 1, seed);

  const i1 = v1 * (1 - fracX) + v2 * fracX;
  const i2 = v3 * (1 - fracX) + v4 * fracX;

  return i1 * (1 - fracY) + i2 * fracY;
}

function perlinNoise(x: number, y: number, seed: number, octaves: number = 4): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += interpolatedNoise(x * frequency, y * frequency, seed + i * 17) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / maxValue;
}

export function generateLayers(params: LayerParams): LayerResult {
  const { width, depth, totalHeight, noiseAmplitude, opacity } = params;
  const layerCount = LAYER_PRESETS.length;
  const meshes: THREE.Mesh[] = [];
  const edges: THREE.LineSegments[] = [];
  const layerInfo: LayerInfo[] = [];

  const minThickness = 20;
  const maxThickness = 60;
  let thicknesses: number[] = [];
  let totalRandomThickness = 0;

  for (let i = 0; i < layerCount; i++) {
    const t = minThickness + Math.random() * (maxThickness - minThickness);
    thicknesses.push(t);
    totalRandomThickness += t;
  }

  const scale = totalHeight / totalRandomThickness;
  thicknesses = thicknesses.map(t => t * scale);

  let currentY = totalHeight / 2;
  const segW = 50;
  const segD = 50;

  for (let i = 0; i < layerCount; i++) {
    const preset = LAYER_PRESETS[i];
    const thickness = thicknesses[i];
    const yStart = currentY;
    const yEnd = currentY - thickness;

    layerInfo.push({
      name: preset.name,
      color: preset.color,
      thickness,
      yStart,
      yEnd,
    });

    const geometry = new THREE.PlaneGeometry(width, depth, segW, segD);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const seed = i * 100 + Math.floor(Math.random() * 1000);

    for (let j = 0; j < positions.count; j++) {
      const px = positions.getX(j);
      const pz = positions.getZ(j);
      const noiseVal = (perlinNoise(px * 0.015, pz * 0.015, seed, 4) - 0.5) * 2;
      const yOffset = noiseVal * noiseAmplitude;
      positions.setY(j, yStart + yOffset);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: preset.color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      shininess: 8,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.layerIndex = i;
    mesh.userData.layerName = preset.name;
    mesh.userData.yStart = yStart;
    mesh.userData.yEnd = yEnd;
    meshes.push(mesh);

    const edgeGeo = new THREE.EdgesGeometry(geometry, 15);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      linewidth: 0.5,
    });
    const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
    edgeLine.userData.layerIndex = i;
    edges.push(edgeLine);

    currentY = yEnd;
  }

  return { meshes, edges, layerInfo };
}

export function updateLayerOpacity(meshes: THREE.Mesh[], targetOpacity: number): void {
  meshes.forEach(mesh => {
    const mat = mesh.material as THREE.MeshPhongMaterial;
    const startOpacity = mat.opacity;
    const startTime = performance.now();
    const duration = 500;

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      mat.opacity = startOpacity + (targetOpacity - startOpacity) * ease;
      mat.transparent = mat.opacity < 1;

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }
    animate();
  });
}

export function regenerateLayersWithNoise(
  meshes: THREE.Mesh[],
  edges: THREE.LineSegments[],
  layerInfo: LayerInfo[],
  noiseAmplitude: number
): void {
  meshes.forEach((mesh, i) => {
    const geometry = mesh.geometry as THREE.PlaneGeometry;
    const positions = geometry.attributes.position;
    const seed = i * 100 + 500;
    const yStart = layerInfo[i].yStart;

    for (let j = 0; j < positions.count; j++) {
      const px = positions.getX(j);
      const pz = positions.getZ(j);
      const noiseVal = (perlinNoise(px * 0.015, pz * 0.015, seed, 4) - 0.5) * 2;
      const yOffset = noiseVal * noiseAmplitude;
      positions.setY(j, yStart + yOffset);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const edgeLine = edges[i];
    const newEdgeGeo = new THREE.EdgesGeometry(geometry, 15);
    edgeLine.geometry.dispose();
    edgeLine.geometry = newEdgeGeo;
  });
}

export function getLayerAtY(layerInfo: LayerInfo[], y: number): LayerInfo | null {
  const surfaceY = layerInfo[0]?.yStart ?? 0;
  for (const layer of layerInfo) {
    if (y <= layer.yStart && y >= layer.yEnd) {
      return layer;
    }
  }
  if (y > surfaceY) return layerInfo[0] ?? null;
  if (y < layerInfo[layerInfo.length - 1].yEnd) return layerInfo[layerInfo.length - 1] ?? null;
  return null;
}
