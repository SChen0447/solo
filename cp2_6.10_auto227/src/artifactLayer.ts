import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { StratumMesh, ArtifactMesh, ArtifactData, ControlParams } from './types';
import { generateArtifactsForStratum } from './dataGenerator';
import { TERRAIN_SIZE } from './terrain';

let artifactCard: HTMLElement | null = null;

export function createArtifacts(
  scene: THREE.Scene,
  _labelRenderer: unknown,
  strata: StratumMesh[]
): ArtifactMesh[] {
  const allArtifacts: ArtifactMesh[] = [];

  for (const stratum of strata) {
    const artifactsData = generateArtifactsForStratum(
      stratum.config,
      stratum.topY,
      TERRAIN_SIZE
    );
    stratum.artifacts = artifactsData;

    for (const data of artifactsData) {
      const artifactMesh = createArtifactMesh(data);
      scene.add(artifactMesh.mesh);

      const label = createArtifactLabel(data);
      const labelObject = new CSS2DObject(label);
      labelObject.position.set(
        data.position.x,
        data.position.y + 10,
        data.position.z
      );
      scene.add(labelObject);

      artifactMesh.label = label;
      allArtifacts.push(artifactMesh);
    }
  }

  setupArtifactCard();
  return allArtifacts;
}

function createArtifactMesh(data: ArtifactData): ArtifactMesh {
  const size = 5 + Math.random() * 3;
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshPhongMaterial({
    color: 0xe6c91a,
    shininess: 80,
    specular: 0xf4d542
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(data.position);
  mesh.userData.artifactData = data;
  mesh.userData.isArtifact = true;

  return { data, mesh, label: document.createElement('div') };
}

function createArtifactLabel(data: ArtifactData): HTMLElement {
  const label = document.createElement('div');
  label.className = 'artifact-label';
  label.textContent = data.name;
  label.dataset.artifactId = data.id;
  return label;
}

function setupArtifactCard(): void {
  artifactCard = document.getElementById('artifact-card');
}

export function showArtifactCard(
  artifact: ArtifactMesh,
  screenX: number,
  screenY: number
): void {
  if (!artifactCard) return;

  const nameEl = artifactCard.querySelector('.artifact-card-name');
  const eraEl = artifactCard.querySelector('.artifact-card-era');
  const layerEl = artifactCard.querySelector('.artifact-card-layer');

  if (nameEl) nameEl.textContent = artifact.data.name;
  if (eraEl) eraEl.textContent = artifact.data.era;
  if (layerEl) layerEl.textContent = `出土层位: ${artifact.data.stratumName}`;

  const cardWidth = 200;
  const cardHeight = 80;
  let x = screenX + 15;
  let y = screenY - cardHeight / 2;

  if (x + cardWidth > window.innerWidth) {
    x = screenX - cardWidth - 15;
  }
  if (y < 10) y = 10;
  if (y + cardHeight > window.innerHeight - 10) {
    y = window.innerHeight - cardHeight - 10;
  }

  artifactCard.style.left = `${x}px`;
  artifactCard.style.top = `${y}px`;
  artifactCard.classList.remove('hidden');
}

export function hideArtifactCard(): void {
  if (artifactCard) {
    artifactCard.classList.add('hidden');
  }
}

export function updateArtifactsVisibility(
  artifacts: ArtifactMesh[],
  strata: StratumMesh[],
  params: ControlParams,
  totalHeight: number
): void {
  const sliceY = (params.depthSlice / 100) * totalHeight;

  for (const artifact of artifacts) {
    const stratum = strata.find(s => s.id === artifact.data.stratumId);
    const isVisible = stratum ? params.stratumVisibility[stratum.id] : true;
    const aboveSlice = artifact.data.position.y <= sliceY + 5;

    artifact.mesh.visible = isVisible;

    if (artifact.label) {
      if (isVisible && aboveSlice) {
        artifact.label.classList.add('visible');
      } else {
        artifact.label.classList.remove('visible');
      }
    }
  }
}

export function updateArtifactsForSliceMode(
  artifacts: ArtifactMesh[],
  params: ControlParams
): void {
  if (!params.sliceMode) {
    for (const artifact of artifacts) {
      const mat = artifact.mesh.material as THREE.MeshPhongMaterial;
      mat.wireframe = false;
      mat.opacity = 1;
      mat.transparent = false;
    }
    return;
  }

  const sliceRadius = 30;

  for (const artifact of artifacts) {
    const dist = Math.sqrt(
      artifact.data.position.x * artifact.data.position.x +
      (artifact.data.position.z - params.sliceZ) * (artifact.data.position.z - params.sliceZ)
    );

    const mat = artifact.mesh.material as THREE.MeshPhongMaterial;
    if (dist <= sliceRadius) {
      mat.wireframe = false;
      mat.opacity = 1;
      mat.transparent = false;
    } else {
      mat.wireframe = true;
      mat.opacity = 0.15;
      mat.transparent = true;
    }
  }
}

export function getArtifactByMesh(mesh: THREE.Object3D, artifacts: ArtifactMesh[]): ArtifactMesh | undefined {
  return artifacts.find(a => a.mesh === mesh || a.mesh.uuid === mesh.uuid);
}
