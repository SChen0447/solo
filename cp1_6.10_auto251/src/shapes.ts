import * as THREE from 'three';

export type ShapeType = 'cube' | 'cylinder' | 'sphere';

export interface BlockData {
  shape: ShapeType;
  color: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export interface BlockMesh extends THREE.Mesh {
  userData: {
    isBlock: boolean;
    blockId: string;
    shape: ShapeType;
    color: string;
    isNightMode: boolean;
    originalColor: THREE.Color;
    glowMesh?: THREE.Mesh;
    light?: THREE.PointLight;
    halo?: THREE.Mesh;
  };
}

let blockIdCounter = 0;

function generateId(): string {
  return `block_${++blockIdCounter}_${Date.now()}`;
}

export function createGeometry(shape: ShapeType): THREE.BufferGeometry {
  switch (shape) {
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case 'sphere':
      return new THREE.SphereGeometry(0.6, 32, 32);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

export function createDayMaterial(colorHex: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.6,
    metalness: 0.1,
    transparent: false,
    opacity: 1,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0
  });
}

export function createNightMaterial(colorHex: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.5,
    metalness: 0.15,
    transparent: false,
    opacity: 1,
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 0.3
  });
}

export function createDragGhostMaterial(colorHex: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.6,
    metalness: 0.1,
    transparent: true,
    opacity: 0.6,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0
  });
}

export function createHighlightEdges(): THREE.LineSegments {
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
  const material = new THREE.LineBasicMaterial({
    color: 0xf1c40f,
    linewidth: 2,
    transparent: true,
    opacity: 1
  });
  return new THREE.LineSegments(edges, material);
}

export function createHalo(colorHex: string): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(1.5, 64);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const halo = new THREE.Mesh(geometry, material);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.01;
  return halo;
}

export function createPointLight(colorHex: string): THREE.PointLight {
  const light = new THREE.PointLight(0xfff4e6, 0.5, 8, 1.5);
  light.position.set(0, 2, 0);
  light.castShadow = true;
  light.shadow.mapSize.width = 256;
  light.shadow.mapSize.height = 256;
  return light;
}

export function createBlock(
  shape: ShapeType,
  colorHex: string,
  isNightMode: boolean = false
): BlockMesh {
  const geometry = createGeometry(shape);
  const material = isNightMode ? createNightMaterial(colorHex) : createDayMaterial(colorHex);
  const mesh = new THREE.Mesh(geometry, material) as BlockMesh;

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.userData = {
    isBlock: true,
    blockId: generateId(),
    shape,
    color: colorHex,
    isNightMode,
    originalColor: new THREE.Color(colorHex)
  };

  return mesh;
}

export function switchBlockMaterial(block: BlockMesh, isNight: boolean): void {
  if (block.userData.isNightMode === isNight) return;

  const colorHex = block.userData.color;
  const oldMaterial = block.material as THREE.MeshStandardMaterial;
  const newMaterial = isNight ? createNightMaterial(colorHex) : createDayMaterial(colorHex);

  newMaterial.transparent = oldMaterial.transparent;
  newMaterial.opacity = oldMaterial.opacity;

  block.material = newMaterial;
  oldMaterial.dispose();
  block.userData.isNightMode = isNight;

  if (isNight) {
    const light = createPointLight(colorHex);
    block.add(light);
    block.userData.light = light;

    const halo = createHalo(colorHex);
    block.parent?.add(halo);
    block.userData.halo = halo;
    updateHaloPosition(block);
  } else {
    if (block.userData.light) {
      block.remove(block.userData.light);
      block.userData.light.dispose?.();
      delete block.userData.light;
    }
    if (block.userData.halo) {
      block.userData.halo.parent?.remove(block.userData.halo);
      (block.userData.halo.geometry as THREE.BufferGeometry)?.dispose();
      (block.userData.halo.material as THREE.Material)?.dispose();
      delete block.userData.halo;
    }
  }
}

export function updateHaloPosition(block: BlockMesh): void {
  if (block.userData.halo) {
    const worldPos = new THREE.Vector3();
    block.getWorldPosition(worldPos);
    block.userData.halo.position.set(worldPos.x, 0.01, worldPos.z);
  }
}

export function setBlockLowQuality(block: BlockMesh, lowQuality: boolean): void {
  const material = block.material as THREE.MeshStandardMaterial;
  if (lowQuality) {
    block.castShadow = false;
    block.receiveShadow = false;
    if (block.userData.light) {
      block.userData.light.intensity = 0;
    }
    material.emissiveIntensity = 0;
  } else {
    block.castShadow = true;
    block.receiveShadow = true;
    if (block.userData.isNightMode && block.userData.light) {
      block.userData.light.intensity = 0.5;
      material.emissiveIntensity = 0.3;
    }
  }
}

export function animatePlacement(block: BlockMesh, duration: number = 0.2): Promise<void> {
  return new Promise((resolve) => {
    const originalScale = block.scale.clone();
    const targetScale = originalScale.clone();
    const startScale = targetScale.clone().multiplyScalar(0.95);
    const startTime = performance.now();

    function update() {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      block.scale.lerpVectors(startScale, targetScale, eased);
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        block.scale.copy(targetScale);
        resolve();
      }
    }
    requestAnimationFrame(update);
  });
}

export function animateTransform(
  obj: THREE.Object3D,
  targetRotation: THREE.Euler,
  targetScale: THREE.Vector3,
  duration: number = 0.3
): Promise<void> {
  return new Promise((resolve) => {
    const startRot = new THREE.Euler().copy(obj.rotation);
    const startScale = obj.scale.clone();
    const startTime = performance.now();

    function update() {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      obj.rotation.x = startRot.x + (targetRotation.x - startRot.x) * eased;
      obj.rotation.y = startRot.y + (targetRotation.y - startRot.y) * eased;
      obj.rotation.z = startRot.z + (targetRotation.z - startRot.z) * eased;
      obj.scale.lerpVectors(startScale, targetScale, eased);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        obj.rotation.copy(targetRotation);
        obj.scale.copy(targetScale);
        resolve();
      }
    }
    requestAnimationFrame(update);
  });
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
