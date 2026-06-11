import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

export interface BuildingData {
  id: number;
  position: { x: number; z: number };
  size: { width: number; depth: number };
  height: number;
  rotation: number;
}

interface BuildingEntry {
  data: BuildingData;
  mesh: THREE.Mesh;
  wireframe: THREE.LineSegments;
  label: CSS2DObject;
  labelDiv: HTMLElement;
  baseGeometry: THREE.BoxGeometry;
  currentHeight: number;
  targetHeight: number;
  animating: boolean;
  animationProgress: number;
  startHeight: number;
}

const PRESETS: Record<string, number[]> = {
  A: [2, 3, 8, 7, 6, 5, 3, 2],
  B: [4, 5, 4, 5, 4, 5, 4, 5],
  C: [2, 3, 6, 7, 2, 3, 7, 8],
};

const DEFAULT_HEIGHTS = [3, 5, 7, 4, 6, 2, 8, 3];
const SPACING = 3;
const ANIMATION_DURATION = 1;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class BuildingManager {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private buildings: Map<number, BuildingEntry> = new Map();
  private nextId: number = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.createDefaultBuildings();
  }

  private createDefaultBuildings(): void {
    const cols = 4;
    const rows = 2;
    const startX = -(cols - 1) * SPACING / 2;
    const startZ = -(rows - 1) * SPACING / 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const x = startX + col * SPACING;
        const z = startZ + row * SPACING;
        this.addBuilding({
          position: { x, z },
          size: { width: 1.5, depth: 1.5 },
          height: DEFAULT_HEIGHTS[index],
          rotation: 0,
        });
      }
    }
  }

  addBuilding(partial: Omit<BuildingData, 'id'>): BuildingData {
    const id = this.nextId++;
    const data: BuildingData = { id, ...partial };

    const baseGeometry = new THREE.BoxGeometry(data.size.width, 1, data.size.depth);

    const material = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      metalness: 0.3,
      roughness: 0.4,
    });

    const mesh = new THREE.Mesh(baseGeometry, material);
    mesh.scale.y = data.height;
    mesh.position.set(data.position.x, data.height / 2, data.position.z);
    mesh.rotation.y = data.rotation;
    mesh.userData.buildingId = id;
    this.group.add(mesh);

    const edgesGeometry = new THREE.EdgesGeometry(baseGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.4,
    });
    const wireframe = new THREE.LineSegments(edgesGeometry, lineMaterial);
    wireframe.scale.y = data.height;
    wireframe.position.set(data.position.x, data.height / 2, data.position.z);
    wireframe.rotation.y = data.rotation;
    this.group.add(wireframe);

    const labelDiv = document.createElement('div');
    labelDiv.textContent = `${data.height}`;
    labelDiv.style.color = 'white';
    labelDiv.style.fontSize = '12px';
    labelDiv.style.fontFamily = 'Arial, sans-serif';
    labelDiv.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
    labelDiv.style.pointerEvents = 'none';
    labelDiv.style.userSelect = 'none';
    const label = new CSS2DObject(labelDiv);
    label.position.set(data.position.x, data.height + 0.2, data.position.z);
    this.group.add(label);

    const entry: BuildingEntry = {
      data,
      mesh,
      wireframe,
      label,
      labelDiv,
      baseGeometry,
      currentHeight: data.height,
      targetHeight: data.height,
      animating: false,
      animationProgress: 0,
      startHeight: data.height,
    };
    this.buildings.set(id, entry);

    return data;
  }

  removeBuilding(id: number): boolean {
    const entry = this.buildings.get(id);
    if (!entry) return false;
    this.group.remove(entry.mesh);
    this.group.remove(entry.wireframe);
    this.group.remove(entry.label);
    entry.baseGeometry.dispose();
    (entry.mesh.material as THREE.Material).dispose();
    entry.wireframe.geometry.dispose();
    (entry.wireframe.material as THREE.Material).dispose();
    this.buildings.delete(id);
    return true;
  }

  updateBuilding(id: number, updates: Partial<Omit<BuildingData, 'id'>>): BuildingData | null {
    const entry = this.buildings.get(id);
    if (!entry) return null;

    if (updates.position !== undefined) {
      entry.data.position = updates.position;
      entry.mesh.position.x = updates.position.x;
      entry.mesh.position.z = updates.position.z;
      entry.wireframe.position.x = updates.position.x;
      entry.wireframe.position.z = updates.position.z;
      entry.label.position.x = updates.position.x;
      entry.label.position.z = updates.position.z;
    }

    if (updates.size !== undefined) {
      entry.data.size = updates.size;
      entry.baseGeometry.dispose();
      entry.wireframe.geometry.dispose();
      const newGeometry = new THREE.BoxGeometry(updates.size.width, 1, updates.size.depth);
      entry.baseGeometry = newGeometry;
      entry.mesh.geometry = newGeometry;
      entry.wireframe.geometry = new THREE.EdgesGeometry(newGeometry);
    }

    if (updates.height !== undefined) {
      entry.data.height = updates.height;
      entry.startHeight = entry.currentHeight;
      entry.targetHeight = updates.height;
      entry.animating = true;
      entry.animationProgress = 0;
    }

    if (updates.rotation !== undefined) {
      entry.data.rotation = updates.rotation;
      entry.mesh.rotation.y = updates.rotation;
      entry.wireframe.rotation.y = updates.rotation;
    }

    return entry.data;
  }

  private updateBuildingVisuals(entry: BuildingEntry, height: number): void {
    entry.currentHeight = height;
    entry.mesh.scale.y = height;
    entry.mesh.position.y = height / 2;
    entry.wireframe.scale.y = height;
    entry.wireframe.position.y = height / 2;
    entry.label.position.y = height + 0.2;
    entry.labelDiv.textContent = `${Math.round(height)}`;
  }

  updateAnimations(deltaTime: number): void {
    this.buildings.forEach((entry) => {
      if (!entry.animating) return;
      entry.animationProgress += deltaTime / ANIMATION_DURATION;
      if (entry.animationProgress >= 1) {
        entry.animationProgress = 1;
        entry.animating = false;
        this.updateBuildingVisuals(entry, entry.targetHeight);
        entry.data.height = entry.targetHeight;
      } else {
        const t = easeInOutCubic(entry.animationProgress);
        const height = entry.startHeight + (entry.targetHeight - entry.startHeight) * t;
        this.updateBuildingVisuals(entry, height);
      }
    });
  }

  getBuildingMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.buildings.forEach((entry) => meshes.push(entry.mesh));
    return meshes;
  }

  getBuildingData(): BuildingData[] {
    const data: BuildingData[] = [];
    this.buildings.forEach((entry) => data.push({ ...entry.data }));
    return data;
  }

  applyPreset(preset: string): void {
    const heights = PRESETS[preset];
    if (!heights) return;
    const entries = Array.from(this.buildings.values());
    for (let i = 0; i < entries.length && i < heights.length; i++) {
      this.updateBuilding(entries[i].data.id, { height: heights[i] });
    }
  }

  getBuildingAtPosition(raycaster: THREE.Raycaster): BuildingData | null {
    const meshes = this.getBuildingMeshes();
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length === 0) return null;
    const buildingId = intersects[0].object.userData.buildingId;
    const entry = this.buildings.get(buildingId);
    return entry ? { ...entry.data } : null;
  }

  setHighlight(buildingId: number, highlight: boolean): void {
    const entry = this.buildings.get(buildingId);
    if (!entry) return;
    const material = entry.wireframe.material as THREE.LineBasicMaterial;
    material.color.set(highlight ? 0xffff00 : 0xff0000);
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getWireframeById(id: number): THREE.LineSegments | null {
    const entry = this.buildings.get(id);
    return entry ? entry.wireframe : null;
  }
}
