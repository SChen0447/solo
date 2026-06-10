import * as THREE from 'three';

export interface BuildingParams {
  id: number;
  length: number;
  width: number;
  height: number;
  x: number;
  z: number;
}

export interface BuildingObject {
  params: BuildingParams;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  shadowMesh?: THREE.Mesh;
  targetParams: BuildingParams;
  isAnimating: boolean;
}

export function createBuildingParams(id: number): BuildingParams {
  return {
    id,
    length: 1 + Math.random() * 3,
    width: 1 + Math.random() * 3,
    height: 2 + Math.random() * 3,
    x: (Math.random() - 0.5) * 6,
    z: (Math.random() - 0.5) * 6,
  };
}

export function createBuildingMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.6,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
}

export function createBuildingEdgeMaterial(isSelected: boolean = false): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: isSelected ? 0xffcc00 : 0xffffff,
    transparent: true,
    opacity: isSelected ? 1.0 : 0.8,
  });
}

export function createBuilding(params: BuildingParams): BuildingObject {
  const geometry = new THREE.BoxGeometry(params.length, params.height, params.width);
  const material = createBuildingMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(params.x, params.height / 2, params.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.buildingId = params.id;

  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const edgesMaterial = createBuildingEdgeMaterial(false);
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  edges.position.copy(mesh.position);
  edges.userData.buildingId = params.id;

  return {
    params: { ...params },
    mesh,
    edges,
    targetParams: { ...params },
    isAnimating: false,
  };
}

export function updateBuildingGeometry(building: BuildingObject): void {
  const { params } = building;
  
  building.mesh.geometry.dispose();
  building.mesh.geometry = new THREE.BoxGeometry(params.length, params.height, params.width);
  building.mesh.position.set(params.x, params.height / 2, params.z);

  building.edges.geometry.dispose();
  building.edges.geometry = new THREE.EdgesGeometry(building.mesh.geometry);
  building.edges.position.copy(building.mesh.position);
}

export function lerpBuildingParams(
  building: BuildingObject,
  alpha: number
): void {
  const { params, targetParams } = building;
  
  params.length = THREE.MathUtils.lerp(params.length, targetParams.length, alpha);
  params.width = THREE.MathUtils.lerp(params.width, targetParams.width, alpha);
  params.height = THREE.MathUtils.lerp(params.height, targetParams.height, alpha);
  params.x = THREE.MathUtils.lerp(params.x, targetParams.x, alpha);
  params.z = THREE.MathUtils.lerp(params.z, targetParams.z, alpha);

  updateBuildingGeometry(building);

  const diffLength = Math.abs(params.length - targetParams.length);
  const diffWidth = Math.abs(params.width - targetParams.width);
  const diffHeight = Math.abs(params.height - targetParams.height);
  const diffX = Math.abs(params.x - targetParams.x);
  const diffZ = Math.abs(params.z - targetParams.z);

  building.isAnimating = (diffLength + diffWidth + diffHeight + diffX + diffZ) > 0.001;
}

export function setBuildingTarget(
  building: BuildingObject,
  newParams: Partial<BuildingParams>
): void {
  Object.assign(building.targetParams, newParams);
  building.isAnimating = true;
}

export function disposeBuilding(building: BuildingObject): void {
  building.mesh.geometry.dispose();
  (building.mesh.material as THREE.Material).dispose();
  building.edges.geometry.dispose();
  (building.edges.material as THREE.Material).dispose();
  if (building.shadowMesh) {
    building.shadowMesh.geometry.dispose();
    (building.shadowMesh.material as THREE.Material).dispose();
  }
}
