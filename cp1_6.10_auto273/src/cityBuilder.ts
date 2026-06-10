import * as THREE from 'three';

export interface BuildingData {
  id: number;
  districtId: string;
  position: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
  baseNoiseLevel: number;
  noiseLevel: number;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  highlightEdges: THREE.LineSegments;
}

export interface CityData {
  buildings: BuildingData[];
  group: THREE.Group;
  noiseSources: NoiseSourceData[];
}

export interface NoiseSourceData {
  id: number;
  position: THREE.Vector2;
  baseIntensity: number;
  type: 'traffic' | 'construction' | 'crowd';
}

const LOW_NOISE_COLOR = new THREE.Color(0x66cc66);
const HIGH_NOISE_COLOR = new THREE.Color(0xcc3333);

function lerpHSL(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  const h1 = { h: 0, s: 0, l: 0 };
  const h2 = { h: 0, s: 0, l: 0 };
  color1.getHSL(h1);
  color2.getHSL(h2);

  const h = h1.h + (h2.h - h1.h) * t;
  const s = h1.s + (h2.s - h1.s) * t;
  const l = h1.l + (h2.l - h1.l) * t;

  return new THREE.Color().setHSL(h, s, l);
}

export function getNoiseColor(noiseLevel: number): THREE.Color {
  const t = Math.max(0, Math.min(1, noiseLevel / 100));
  return lerpHSL(LOW_NOISE_COLOR, HIGH_NOISE_COLOR, t);
}

export function noiseLevelToDb(noiseLevel: number): number {
  return Math.round(40 + (noiseLevel / 100) * 60);
}

export function buildCity(
  scene: THREE.Scene,
  gridSize: number = 15
): CityData {
  const group = new THREE.Group();
  group.name = 'cityGroup';

  const buildings: BuildingData[] = [];
  const noiseSources: NoiseSourceData[] = [];

  const buildingCount = 150 + Math.floor(Math.random() * 50);
  const cellSize = 4;

  const usedPositions = new Set<string>();

  for (let i = 0; i < buildingCount; i++) {
    let gx: number, gz: number, key: string;
    let attempts = 0;
    do {
      gx = Math.floor(Math.random() * gridSize);
      gz = Math.floor(Math.random() * gridSize);
      key = `${gx},${gz}`;
      attempts++;
    } while (usedPositions.has(key) && attempts < 50);

    if (usedPositions.has(key)) continue;
    usedPositions.add(key);

    const x = (gx - gridSize / 2 + 0.5) * cellSize + (Math.random() - 0.5) * 1.5;
    const z = (gz - gridSize / 2 + 0.5) * cellSize + (Math.random() - 0.5) * 1.5;

    const width = 1.5 + Math.random() * 2;
    const depth = 1.5 + Math.random() * 2;
    const height = 2 + Math.random() * 18;

    const baseNoiseLevel = Math.random() * 100;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: getNoiseColor(baseNoiseLevel),
      roughness: 0.7,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x222233,
      transparent: true,
      opacity: 0.6,
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.copy(mesh.position);

    const highlightMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      linewidth: 1,
    });
    const highlightEdges = new THREE.LineSegments(edgeGeometry, highlightMaterial);
    highlightEdges.position.copy(mesh.position);

    const districtLetter = String.fromCharCode(65 + (gx % 8));
    const districtId = `${districtLetter}${gz + 1}`;

    const building: BuildingData = {
      id: i,
      districtId,
      position: new THREE.Vector3(x, height / 2, z),
      width,
      depth,
      height,
      baseNoiseLevel,
      noiseLevel: baseNoiseLevel,
      mesh,
      edges,
      highlightEdges,
    };

    mesh.userData.building = building;

    group.add(mesh);
    group.add(edges);
    group.add(highlightEdges);
    buildings.push(building);
  }

  const sourceTypes: ('traffic' | 'construction' | 'crowd')[] = ['traffic', 'construction', 'crowd'];
  const sourceCount = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < sourceCount; i++) {
    const sx = (Math.random() - 0.5) * gridSize * cellSize;
    const sz = (Math.random() - 0.5) * gridSize * cellSize;
    noiseSources.push({
      id: i,
      position: new THREE.Vector2(sx, sz),
      baseIntensity: 40 + Math.random() * 60,
      type: sourceTypes[Math.floor(Math.random() * sourceTypes.length)],
    });
  }

  scene.add(group);
  return { buildings, group, noiseSources };
}

export function updateBuildingColors(
  buildings: BuildingData[],
  noiseSources: NoiseSourceData[],
  timeOfDay: number,
  elapsed: number
): void {
  const timeFactor = getTimeFactor(timeOfDay);

  for (const building of buildings) {
    let sourceInfluence = 0;
    for (const source of noiseSources) {
      const dx = building.position.x - source.position.x;
      const dz = building.position.z - source.position.y;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const maxDist = 20;
      if (distance < maxDist) {
        const falloff = 1 - distance / maxDist;
        sourceInfluence += source.baseIntensity * falloff * 0.5;
      }
    }

    const dynamicNoise = (building.baseNoiseLevel + sourceInfluence) / 1.5;
    building.noiseLevel = Math.max(0, Math.min(100, dynamicNoise * timeFactor));

    const pulseSpeed = 0.5 + (building.noiseLevel / 100) * 2;
    const pulseAmount = 0.03 + (building.noiseLevel / 100) * 0.05;
    const pulse = Math.sin(elapsed * pulseSpeed) * pulseAmount;

    const baseColor = getNoiseColor(building.noiseLevel);
    const pulseColor = baseColor.clone().offsetHSL(0, 0, pulse);
    (building.mesh.material as THREE.MeshStandardMaterial).color.copy(pulseColor);
  }
}

export function getTimeFactor(timeOfDay: number): number {
  const normalized = timeOfDay / 24;
  const morning = 8 / 24;
  const evening = 18 / 24;
  const peakWidth = 4 / 24;

  const morningPeak = Math.exp(-Math.pow((normalized - morning) / peakWidth, 2));
  const eveningPeak = Math.exp(-Math.pow((normalized - evening) / peakWidth, 2));
  const baseline = 0.35;

  return baseline + 0.65 * Math.max(morningPeak, eveningPeak * 0.9);
}

export function setBuildingHighlight(building: BuildingData, highlighted: boolean): void {
  const material = building.highlightEdges.material as THREE.LineBasicMaterial;
  material.opacity = highlighted ? 0.6 : 0;
}
