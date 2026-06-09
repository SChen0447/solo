import * as THREE from 'three';

export interface GeologyLayerInfo {
  name: string;
  color: number;
  thickness: number;
  yStart: number;
  densityFactor: number;
}

export const GEOLOGY_LAYERS: GeologyLayerInfo[] = [
  { name: '砂岩层', color: 0xc2a66e, thickness: 20, yStart: 0, densityFactor: 0.1 },
  { name: '页岩层', color: 0x6b5b4c, thickness: 30, yStart: -20, densityFactor: 0.3 },
  { name: '花岗岩层', color: 0x5c5c5c, thickness: 40, yStart: -50, densityFactor: 0.5 },
];

const GROUND_SIZE = 200;
const NOISE_AMPLITUDE = 1.5;
const NOISE_FREQUENCY = 0.03;

function pseudoNoise(x: number, z: number): number {
  return (
    Math.sin(x * NOISE_FREQUENCY) * Math.cos(z * NOISE_FREQUENCY * 1.3) +
    Math.sin(x * NOISE_FREQUENCY * 2.1 + 1.7) * Math.cos(z * NOISE_FREQUENCY * 0.7 + 0.5)
  ) * NOISE_AMPLITUDE;
}

function createLayerGeometry(
  width: number,
  height: number,
  depth: number,
  yBase: number
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth, 20, 1, 20);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const px = positions.getX(i);
    const py = positions.getY(i);
    const pz = positions.getZ(i);

    if (py > 0) {
      const noise = pseudoNoise(px, pz);
      positions.setY(i, py + noise);
    } else if (Math.abs(py) < 0.01) {
      const noise = pseudoNoise(px, pz) * 0.3;
      positions.setY(i, py + noise);
    }
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function createGround(): { mesh: THREE.Mesh; pickableMeshes: THREE.Mesh[] } {
  const pickableMeshes: THREE.Mesh[] = [];

  const group = new THREE.Group();

  const gridHelper = new THREE.GridHelper(GROUND_SIZE, 40, 0x6b8e6b, 0x4a6a4a);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.4;
  gridHelper.position.y = 0.1;
  group.add(gridHelper);

  for (const layer of GEOLOGY_LAYERS) {
    const geometry = createLayerGeometry(GROUND_SIZE, layer.thickness, GROUND_SIZE, layer.yStart);
    const material = new THREE.MeshPhongMaterial({
      color: layer.color,
      transparent: true,
      opacity: 0.75,
      shininess: 30,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = layer.yStart - layer.thickness / 2;
    mesh.userData = {
      type: 'geology-layer',
      layerName: layer.name,
      thickness: layer.thickness,
      densityFactor: layer.densityFactor,
    };
    pickableMeshes.push(mesh);
    group.add(mesh);
  }

  const faultGeometry = new THREE.BoxGeometry(GROUND_SIZE * 1.5, 100, 10, 1, 1, 1);
  const faultMaterial = new THREE.MeshPhongMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.45,
    shininess: 30,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const fault = new THREE.Mesh(faultGeometry, faultMaterial);
  fault.rotation.z = Math.PI / 4;
  fault.position.y = -45;
  fault.position.x = 20;
  fault.userData = {
    type: 'fault',
    layerName: '断层',
    thickness: 10,
  };
  pickableMeshes.push(fault);
  group.add(fault);

  const groundPlaneGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
  const groundPlaneMaterial = new THREE.MeshBasicMaterial({
    color: 0x3a3a4a,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
  });
  const groundPlane = new THREE.Mesh(groundPlaneGeometry, groundPlaneMaterial);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = 0.01;
  groundPlane.userData = { type: 'ground' };
  pickableMeshes.push(groundPlane);
  group.add(groundPlane);

  return { mesh: group as unknown as THREE.Mesh, pickableMeshes };
}

export function getLayerAtY(y: number): GeologyLayerInfo | null {
  for (const layer of GEOLOGY_LAYERS) {
    if (y <= layer.yStart && y >= layer.yStart - layer.thickness) {
      return layer;
    }
  }
  return null;
}

export function createSkybox(scene: THREE.Scene): void {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#0a0a2a');
  gradient.addColorStop(1, '#1a1a2a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  scene.background = texture;
}
