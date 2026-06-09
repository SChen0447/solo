import * as THREE from 'three';
import { GlazeRecipe, createGlazeTexture } from './glaze';

export const KILN_INNER_RADIUS = 2;
export const KILN_DOME_HEIGHT = 3;
export const NUM_SUPPORTS = 12;
export const MAX_TEST_PIECES = 6;
export const PIECE_WIDTH = 0.6;
export const PIECE_HEIGHT = 0.6;
export const PIECE_THICKNESS = 0.05;

export interface TestPieceData {
  id: string;
  recipe: GlazeRecipe;
  mesh: THREE.Mesh;
  crackLines: THREE.LineSegments | null;
  supportIndex: number;
  basePosition: THREE.Vector3;
  originalPositions: Float32Array | null;
  flowAmplitudes: Float32Array | null;
  flowFrequencies: Float32Array | null;
  animationProgress: number;
  isAnimating: boolean;
  initialColor: THREE.Color;
  targetColor: THREE.Color;
  finalName: string;
  labelElement: HTMLDivElement | null;
}

export function createKiln(scene: THREE.Scene): THREE.Group {
  const kilnGroup = new THREE.Group();

  createKilnWalls(kilnGroup);
  createKilnDome(kilnGroup);
  createKilnFloor(kilnGroup);
  createFireBox(kilnGroup);

  scene.add(kilnGroup);
  return kilnGroup;
}

function createRoughTexture(baseColor: string): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = Math.random() * 0.5 - 0.25;
    const base = parseInt(baseColor.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((base >> 16) & 255) + shade * 255));
    const g = Math.max(0, Math.min(255, ((base >> 8) & 255) + shade * 255));
    const b = Math.max(0, Math.min(255, (base & 255) + shade * 255));
    ctx.fillStyle = `rgba(${r|0},${g|0},${b|0},0.6)`;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createKilnWalls(group: THREE.Group): void {
  const wallHeight = 1.5;
  const wallThickness = 0.3;
  const segments = 48;

  const innerTexture = createRoughTexture('#5C4033');
  const outerTexture = createRoughTexture('#4A3325');

  const innerGeom = new THREE.CylinderGeometry(
    KILN_INNER_RADIUS,
    KILN_INNER_RADIUS,
    wallHeight,
    segments,
    1,
    true
  );
  const innerMat = new THREE.MeshStandardMaterial({
    map: innerTexture,
    side: THREE.BackSide,
    roughness: 0.95,
    metalness: 0.0
  });
  const innerWall = new THREE.Mesh(innerGeom, innerMat);
  innerWall.position.y = wallHeight / 2;
  innerWall.rotation.y = Math.PI / segments;
  group.add(innerWall);

  const outerGeom = new THREE.CylinderGeometry(
    KILN_INNER_RADIUS + wallThickness,
    KILN_INNER_RADIUS + wallThickness + 0.1,
    wallHeight + 0.1,
    segments
  );
  const outerMat = new THREE.MeshStandardMaterial({
    map: outerTexture,
    roughness: 1.0,
    metalness: 0.0
  });
  const outerWall = new THREE.Mesh(outerGeom, outerMat);
  outerWall.position.y = wallHeight / 2;
  group.add(outerWall);

  const frontClip = new THREE.PlaneGeometry(10, 10);
  const clipMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  });
  const clipPlane = new THREE.Mesh(frontClip, clipMat);
  clipPlane.position.set(0, wallHeight / 2, KILN_INNER_RADIUS + 0.01);
  clipPlane.rotation.y = Math.PI;
  group.add(clipPlane);

  const halfWallGeom = new THREE.CylinderGeometry(
    KILN_INNER_RADIUS,
    KILN_INNER_RADIUS + wallThickness,
    wallHeight,
    segments,
    1,
    false,
    Math.PI / 2,
    Math.PI
  );
  const halfWallMat = new THREE.MeshStandardMaterial({
    map: innerTexture,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  const halfWall = new THREE.Mesh(halfWallGeom, halfWallMat);
  halfWall.position.y = wallHeight / 2;
  group.add(halfWall);
}

function createKilnDome(group: THREE.Group): void {
  const wallHeight = 1.5;
  const domeRadius = KILN_INNER_RADIUS + 0.15;
  const segments = 32;

  const domeTexture = createRoughTexture('#5C4033');

  const domeGeom = new THREE.SphereGeometry(
    domeRadius,
    segments,
    segments,
    Math.PI / 2,
    Math.PI,
    0,
    Math.PI / 2
  );
  const domeMat = new THREE.MeshStandardMaterial({
    map: domeTexture,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });
  const dome = new THREE.Mesh(domeGeom, domeMat);
  dome.position.y = wallHeight;
  dome.scale.y = KILN_DOME_HEIGHT / domeRadius;
  group.add(dome);

  const outerDomeGeom = new THREE.SphereGeometry(
    domeRadius + 0.25,
    segments,
    segments,
    Math.PI / 2,
    Math.PI,
    0,
    Math.PI / 2
  );
  const outerDomeMat = new THREE.MeshStandardMaterial({
    map: createRoughTexture('#3D2B1F'),
    roughness: 1.0,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  const outerDome = new THREE.Mesh(outerDomeGeom, outerDomeMat);
  outerDome.position.y = wallHeight;
  outerDome.scale.y = (KILN_DOME_HEIGHT + 0.2) / domeRadius;
  group.add(outerDome);
}

function createKilnFloor(group: THREE.Group): void {
  const floorTexture = createRoughTexture('#4A3325');

  const floorGeom = new THREE.CircleGeometry(KILN_INNER_RADIUS - 0.05, 48);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 1.0,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  group.add(floor);
}

function createFireBox(group: THREE.Group): void {
  const fireGeom = new THREE.BoxGeometry(0.8, 0.5, 0.4);
  const fireMat = new THREE.MeshStandardMaterial({
    color: 0x1a0f08,
    roughness: 1.0,
    emissive: 0x331100,
    emissiveIntensity: 0.3
  });
  const fireBox = new THREE.Mesh(fireGeom, fireMat);
  fireBox.position.set(0, 0.25, -KILN_INNER_RADIUS + 0.3);
  group.add(fireBox);

  const glowGeom = new THREE.SphereGeometry(0.35, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.15
  });
  const glow = new THREE.Mesh(glowGeom, glowMat);
  glow.position.set(0, 0.35, -KILN_INNER_RADIUS + 0.3);
  glow.name = 'fireGlow';
  group.add(glow);
}

export function createSupports(scene: THREE.Scene): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const supportHeight = 0.2;
  const supportRadius = 0.06;
  const ringRadius = KILN_INNER_RADIUS * 0.6;

  for (let i = 0; i < NUM_SUPPORTS; i++) {
    const angle = (i / NUM_SUPPORTS) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * ringRadius;
    const z = Math.sin(angle) * ringRadius;

    const supportGeom = new THREE.CylinderGeometry(supportRadius, supportRadius * 1.3, supportHeight, 8);
    const supportMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.95
    });
    const support = new THREE.Mesh(supportGeom, supportMat);
    support.position.set(x, supportHeight / 2, z);
    scene.add(support);

    positions.push(new THREE.Vector3(x, supportHeight + PIECE_THICKNESS / 2, z));
  }

  return positions;
}

export function createTestPiece(
  recipe: GlazeRecipe,
  position: THREE.Vector3,
  supportIndex: number
): TestPieceData {
  const texture = createGlazeTexture(recipe.initialColor);
  const geometry = new THREE.BoxGeometry(PIECE_WIDTH, PIECE_THICKNESS, PIECE_HEIGHT, 16, 1, 16);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.4,
    metalness: 0.05
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.x = 0;
  mesh.userData.supportIndex = supportIndex;

  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const originalPositions = new Float32Array(posAttr.array as Float32Array);
  const vertexCount = posAttr.count;
  const flowAmplitudes = new Float32Array(vertexCount);
  const flowFrequencies = new Float32Array(vertexCount);

  for (let i = 0; i < vertexCount; i++) {
    flowAmplitudes[i] = 0.01 + Math.random() * 0.02;
    flowFrequencies[i] = 4 + Math.random() * 6;
  }

  const label = document.createElement('div');
  label.className = 'glaze-label';
  document.getElementById('app')!.appendChild(label);

  return {
    id: `piece_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    recipe,
    mesh,
    crackLines: null,
    supportIndex,
    basePosition: position.clone(),
    originalPositions,
    flowAmplitudes,
    flowFrequencies,
    animationProgress: 0,
    isAnimating: false,
    initialColor: new THREE.Color(recipe.initialColor),
    targetColor: new THREE.Color(recipe.initialColor),
    finalName: '',
    labelElement: label
  };
}

export function updatePieceFlowAnimation(
  piece: TestPieceData,
  time: number,
  progress: number
): void {
  if (!piece.originalPositions || !piece.flowAmplitudes || !piece.flowFrequencies) return;

  const geometry = piece.mesh.geometry;
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const positions = posAttr.array as Float32Array;
  const count = posAttr.count;
  const flowFactor = progress * piece.recipe.flowAmount;

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const iy = ix + 1;
    const iz = ix + 2;

    const origY = piece.originalPositions[iy];
    if (origY > PIECE_THICKNESS * 0.4) {
      const x = piece.originalPositions[ix];
      const z = piece.originalPositions[iz];
      const offset =
        Math.sin(x * piece.flowFrequencies[i] + time * 2) *
        Math.cos(z * piece.flowFrequencies[i] * 0.7 + time * 1.5) *
        piece.flowAmplitudes[i] *
        flowFactor;
      positions[iy] = origY + offset;
    } else {
      positions[iy] = piece.originalPositions[iy];
    }
  }

  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}

export function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

export function elasticOut(t: number): number {
  const p = 0.4;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}
