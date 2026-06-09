import * as THREE from 'three';

export interface BuildingData {
  mesh: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | b2;
}

export function createBuildings(): BuildingData[] {
  const buildings: BuildingData[] = [];
  const buildingCount = 12;
  const radius = 20;
  const minHeight = 3;
  const maxHeight = 20;
  const colorStart = 0xA0A0A0;
  const colorEnd = 0xD0D0D0;
  const roofColor = 0x5C5C5C;

  const placedPositions: THREE.Vector2[] = [];

  for (let i = 0; i < buildingCount; i++) {
    let x = 0, z = 0;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 100) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (radius - 3) + 2;
      x = Math.cos(angle) * dist;
      z = Math.sin(angle) * dist;
      valid = placedPositions.every(
        (p) => Math.hypot(p.x - x, p.y - z) > 4
      );
      attempts++;
    }

    placedPositions.push(new THREE.Vector2(x, z));

    const height = minHeight + Math.random() * (maxHeight - minHeight);
    const width = 2 + Math.random() * 2;
    const depth = 2 + Math.random() * 2;

    const bodyColor = lerpColor(colorStart, colorEnd, Math.random());
    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.7,
      metalness: 0.1,
      emissive: bodyColor,
      emissiveIntensity: 1.0,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;

    const roofGeo = new THREE.BoxGeometry(width * 1.05, 0.4, depth * 1.05);
    const roofMat = new THREE.MeshStandardMaterial({
      color: roofColor,
      roughness: 0.9,
      metalness: 0.05,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = height + 0.2;
    roof.castShadow = true;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.add(body);
    group.add(roof);

    buildings.push({
      mesh: group,
      materials: [bodyMat],
    });
  }

  return buildings;
}

export function createGround(): THREE.Mesh {
  const size = 50;
  const groundGeo = new THREE.PlaneGeometry(size, size, 50, 50);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4A7C59,
    roughness: 0.95,
    metalness: 0,
  });

  const positions = groundGeo.attributes.position;
  const colors: number[] = [];
  const baseColor = new THREE.Color(0x4A7C59);

  for (let i = 0; i < positions.count; i++) {
    const variation = 0.9 + Math.random() * 0.2;
    colors.push(
      baseColor.r * variation,
      baseColor.g * variation,
      baseColor.b * variation
    );
  }

  groundGeo.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  );
  groundMat.vertexColors = true;

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  const grid = new THREE.GridHelper(size, 50, 0x3a5a45, 0x3a5a45);
  grid.position.y = 0.01;
  (ground as any).grid = grid;

  return ground;
}
