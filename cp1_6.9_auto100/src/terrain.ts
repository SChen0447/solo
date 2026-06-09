import * as THREE from 'three';

export interface TerrainModule {
  group: THREE.Group;
  update: (time: number) => void;
}

function pseudoNoise(x: number, z: number): number {
  const a = Math.sin(x * 0.25) * 0.5;
  const b = Math.sin(z * 0.35 + 1.3) * 0.5;
  const c = Math.sin((x + z) * 0.15) * 0.3;
  return (a + b + c) / 1.3;
}

export function createTerrain(): TerrainModule {
  const group = new THREE.Group();

  const width = 120;
  const depth = 80;
  const widthSeg = 80;
  const depthSeg = 50;

  const geometry = new THREE.PlaneGeometry(width, depth, widthSeg, depthSeg);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);

  const colorStart = new THREE.Color('#1a2a3a');
  const colorEnd = new THREE.Color('#2a3a4a');

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);

    const baseHeight = -8;
    const ridge1 = Math.abs(Math.sin(x * 0.12 + z * 0.06)) * 4;
    const ridge2 = Math.abs(Math.sin(x * 0.25 - z * 0.1 + 1.7)) * 2.5;
    const noise = pseudoNoise(x, z) * 3;
    const y = baseHeight + ridge1 + ridge2 + noise;

    positions.setY(i, y);

    const t = (y - baseHeight) / 9;
    const clamped = Math.max(0, Math.min(1, t));
    const c = colorStart.clone().lerp(colorEnd, clamped);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    fog: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, -10);
  group.add(mesh);

  const glowCount = 600;
  const glowPositions = new Float32Array(glowCount * 3);
  const glowColors = new Float32Array(glowCount * 3);

  const glowColor = new THREE.Color(0.4, 0.6, 1.0);

  for (let i = 0; i < glowCount; i++) {
    const x = (Math.random() - 0.5) * width * 0.95;
    const z = (Math.random() - 0.5) * depth * 0.7 - 10;
    const ridge1 = Math.abs(Math.sin(x * 0.12 + z * 0.06)) * 4;
    const ridge2 = Math.abs(Math.sin(x * 0.25 - z * 0.1 + 1.7)) * 2.5;
    const noise = pseudoNoise(x, z) * 3;
    const peakY = -8 + ridge1 + ridge2 + noise;

    glowPositions[i * 3] = x + (Math.random() - 0.5) * 1.5;
    glowPositions[i * 3 + 1] = peakY + Math.random() * 2 + 0.5;
    glowPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 1.5;

    glowColors[i * 3] = glowColor.r;
    glowColors[i * 3 + 1] = glowColor.g;
    glowColors[i * 3 + 2] = glowColor.b;
  }

  const glowGeometry = new THREE.BufferGeometry();
  glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
  glowGeometry.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));

  const glowMaterial = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: false
  });

  const glowPoints = new THREE.Points(glowGeometry, glowMaterial);
  group.add(glowPoints);

  const update = (_time: number): void => {
  };

  return { group, update };
}
