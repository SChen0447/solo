import * as THREE from 'three';

export interface CityParams {
  density: number;
  minHeight: number;
  maxHeight: number;
  spacing: number;
  rotationSpeed: number;
  hue: number;
  saturation: number;
}

export interface BuildingData {
  mesh: THREE.Group;
  rotationSpeed: number;
}

const CITY_RADIUS = 25;

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function isOverlapping(
  x: number,
  z: number,
  width: number,
  depth: number,
  placed: Array<{ x: number; z: number; width: number; depth: number }>
): boolean {
  for (const p of placed) {
    const dx = Math.abs(x - p.x);
    const dz = Math.abs(z - p.z);
    const minDistX = (width + p.width) / 2;
    const minDistZ = (depth + p.depth) / 2;
    if (dx < minDistX && dz < minDistZ) {
      return true;
    }
  }
  return false;
}

function createBuildingDecoration(
  buildingWidth: number,
  buildingDepth: number,
  hue: number,
  saturation: number
): THREE.Mesh | null {
  if (Math.random() > 0.3) return null;

  const isCone = Math.random() > 0.5;
  let geometry: THREE.BufferGeometry;
  let yOffset: number;

  if (isCone) {
    const radius = Math.min(buildingWidth, buildingDepth) * 0.3;
    const height = randomRange(1, 3);
    geometry = new THREE.ConeGeometry(radius, height, 4);
    yOffset = height / 2;
  } else {
    const w = buildingWidth * randomRange(0.3, 0.6);
    const d = buildingDepth * randomRange(0.3, 0.6);
    const h = randomRange(0.5, 2);
    geometry = new THREE.BoxGeometry(w, h, d);
    yOffset = h / 2;
  }

  const color = new THREE.Color().setHSL(
    (hue + randomRange(-10, 10)) / 360,
    saturation,
    0.6
  );
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.2,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = yOffset;
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  return mesh;
}

export function generateBuildings(params: CityParams): BuildingData[] {
  const buildings: BuildingData[] = [];
  const placed: Array<{ x: number; z: number; width: number; depth: number }> = [];
  const maxAttempts = params.density * 20;
  let attempts = 0;

  while (buildings.length < params.density && attempts < maxAttempts) {
    attempts++;

    const width = randomRange(2, 5);
    const depth = randomRange(2, 5);
    const height = randomRange(params.minHeight, params.maxHeight);

    const angle = randomRange(0, Math.PI * 2);
    const dist = randomRange(0, CITY_RADIUS);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    const spacingWithPadding = params.spacing + 0.5;
    const expandedW = width + spacingWithPadding;
    const expandedD = depth + spacingWithPadding;

    if (isOverlapping(x, z, expandedW, expandedD, placed)) {
      continue;
    }

    placed.push({ x, z, width: expandedW, depth: expandedD });

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const hueVariation = randomRange(-15, 15);
    const color = new THREE.Color().setHSL(
      ((params.hue + hueVariation + 360) % 360) / 360,
      params.saturation,
      0.7
    );
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.15,
    });

    const buildingMesh = new THREE.Mesh(geometry, material);
    buildingMesh.position.y = height / 2;
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;

    const group = new THREE.Group();
    group.add(buildingMesh);
    group.position.set(x, 0, z);

    const decoration = createBuildingDecoration(width, depth, params.hue, params.saturation);
    if (decoration) {
      decoration.position.y += height;
      group.add(decoration);
    }

    const rotSpeed = params.rotationSpeed * randomRange(0.5, 1.5);

    buildings.push({
      mesh: group,
      rotationSpeed: rotSpeed,
    });
  }

  return buildings;
}

export function disposeBuildings(buildings: BuildingData[]): void {
  for (const b of buildings) {
    b.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}
