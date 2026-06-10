import * as THREE from 'three';
import { StratumConfig, StratumMesh, ControlParams } from './types';

export const TERRAIN_SIZE = 200;

export function createStrata(
  scene: THREE.Scene,
  configs: StratumConfig[],
  onComplete: (strata: StratumMesh[]) => void
): StratumMesh[] {
  const strata: StratumMesh[] = [];
  let currentY = 0;

  for (let i = configs.length - 1; i >= 0; i--) {
    const config = configs[i];
    const stratum = createStratumMesh(config, currentY);
    scene.add(stratum.mesh);
    scene.add(stratum.wireframe);
    strata.unshift(stratum);
    currentY += config.thickness;
  }

  onComplete(strata);
  return strata;
}

function createStratumMesh(config: StratumConfig, bottomY: number): StratumMesh {
  const geometry = new THREE.BoxGeometry(TERRAIN_SIZE, config.thickness, TERRAIN_SIZE);
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(config.color),
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    shininess: 10
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, bottomY + config.thickness / 2, 0);
  mesh.userData.stratumId = config.id;
  mesh.userData.isStratum = true;

  const edges = new THREE.EdgesGeometry(geometry);
  const wireframeMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
  });
  const wireframe = new THREE.LineSegments(edges, wireframeMaterial);
  wireframe.position.copy(mesh.position);
  wireframe.userData.stratumId = config.id;
  wireframe.userData.isWireframe = true;

  return {
    id: config.id,
    config,
    mesh,
    wireframe,
    topY: bottomY + config.thickness,
    bottomY,
    artifacts: []
  };
}

export function updateStrataForDepth(
  strata: StratumMesh[],
  params: ControlParams,
  totalHeight: number
): void {
  const sliceY = (params.depthSlice / 100) * totalHeight;

  for (const stratum of strata) {
    const material = stratum.mesh.material as THREE.MeshPhongMaterial;

    if (!params.stratumVisibility[stratum.id]) {
      material.opacity = 0;
      stratum.mesh.visible = false;
      stratum.wireframe.visible = false;
      continue;
    }

    stratum.mesh.visible = true;
    stratum.wireframe.visible = true;

    if (stratum.bottomY >= sliceY) {
      material.opacity = params.opacity;
    } else if (stratum.topY <= sliceY) {
      const t = Math.max(0.1, params.opacity * 0.167);
      material.opacity = t;
    } else {
      const ratio = (sliceY - stratum.bottomY) / (stratum.topY - stratum.bottomY);
      material.opacity = params.opacity * (1 - ratio * 0.833);
    }
  }
}

export function updateStrataForSliceMode(
  strata: StratumMesh[],
  params: ControlParams
): void {
  const sliceRadius = 30;
  const centerX = 0;
  const centerZ = 0;

  for (const stratum of strata) {
    const material = stratum.mesh.material as THREE.MeshPhongMaterial;
    const wireMat = stratum.wireframe.material as THREE.LineBasicMaterial;

    if (!params.sliceMode) {
      material.wireframe = false;
      wireMat.color.setHex(0xffffff);
      wireMat.opacity = 0.8;
      continue;
    }

    const inSlice =
      Math.abs(stratum.mesh.position.z - params.sliceZ) <= (sliceRadius + stratum.config.thickness / 2) &&
      Math.sqrt(centerX * centerX + centerZ * centerZ) <= sliceRadius + TERRAIN_SIZE / 2;

    if (inSlice) {
      material.wireframe = false;
      material.opacity = Math.max(material.opacity, 0.5);
    } else {
      material.wireframe = true;
      material.opacity = 0.1;
    }

    wireMat.color.setHex(0x888888);
    wireMat.opacity = 0.2;
  }
}

export function getTotalHeight(strata: StratumMesh[]): number {
  if (strata.length === 0) return 0;
  return strata[strata.length - 1].topY;
}

export function setStratumVisibility(
  strata: StratumMesh[],
  id: number,
  visible: boolean
): void {
  const stratum = strata.find(s => s.id === id);
  if (stratum) {
    stratum.mesh.visible = visible;
    stratum.wireframe.visible = visible;
  }
}
