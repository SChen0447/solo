import * as THREE from 'three';
import type { BuildingData, ZoneType } from './cityScene';
import { highlightBuilding } from './cityScene';

const ZONE_LABELS: Record<ZoneType, string> = {
  commercial: '商业区',
  residential: '住宅区',
  industrial: '工业区',
};

export class OrbitControls {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;

  target = new THREE.Vector3(0, 0, 0);
  minDistance = 10;
  maxDistance = 200;
  dampingFactor = 0.1;

  private spherical = new THREE.Spherical();
  private sphericalDelta = new THREE.Spherical();
  private scale = 1;

  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private rotateSpeed = 0.005;
  private zoomSpeed = 0.1;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.updateSphericalFromCamera();
    this.bindEvents();
  }

  private updateSphericalFromCamera(): void {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
    this.spherical.setFromVector3(offset);
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;

    this.sphericalDelta.theta -= deltaX * this.rotateSpeed;
    this.sphericalDelta.phi -= deltaY * this.rotateSpeed;

    const maxPhi = Math.PI - 0.05;
    const minPhi = 0.05;
    this.sphericalDelta.phi = Math.max(
      minPhi - this.spherical.phi,
      Math.min(maxPhi - this.spherical.phi, this.sphericalDelta.phi)
    );

    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.scale /= 1 + this.zoomSpeed;
    } else {
      this.scale *= 1 + this.zoomSpeed;
    }
  };

  update(): void {
    const offset = new THREE.Vector3();

    this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
    this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
    this.spherical.radius *= this.scale;

    this.spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.spherical.radius)
    );

    this.sphericalDelta.theta *= 1 - this.dampingFactor;
    this.sphericalDelta.phi *= 1 - this.dampingFactor;
    this.scale = 1 + (this.scale - 1) * (1 - this.dampingFactor);
    if (Math.abs(this.scale - 1) < 0.0001) this.scale = 1;

    offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }
}

export class BuildingPicker {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private buildingMeshes: THREE.Mesh[] = [];
  private buildingMap = new Map<THREE.Mesh, BuildingData>();
  private selectedBuilding: BuildingData | null = null;
  private isDragging = false;
  private dragThreshold = 5;
  private mouseDownPos = { x: 0, y: 0 };
  private onBuildingSelect: (building: BuildingData | null) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    buildings: BuildingData[],
    onSelect: (building: BuildingData | null) => void
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.onBuildingSelect = onSelect;

    for (const b of buildings) {
      this.buildingMeshes.push(b.mesh);
      this.buildingMap.set(b.mesh, b);
    }

    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
    this.isDragging = false;
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    const dx = Math.abs(e.clientX - this.mouseDownPos.x);
    const dy = Math.abs(e.clientY - this.mouseDownPos.y);
    if (dx > this.dragThreshold || dy > this.dragThreshold) return;

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.buildingMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const building = this.buildingMap.get(mesh) || null;
      this.selectedBuilding = highlightBuilding(building, this.selectedBuilding);
      this.onBuildingSelect(this.selectedBuilding);
    } else {
      this.selectedBuilding = highlightBuilding(null, this.selectedBuilding);
      this.onBuildingSelect(null);
    }
  };

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
  }
}

export function updateInfoPanel(building: BuildingData | null): void {
  const panel = document.getElementById('info-panel');
  const heightEl = document.getElementById('building-height');
  const zoneEl = document.getElementById('building-zone');
  const pollutionEl = document.getElementById('light-pollution');

  if (!panel || !heightEl || !zoneEl || !pollutionEl) return;

  if (!building) {
    panel.classList.add('hidden');
    return;
  }

  heightEl.textContent = building.height.toFixed(1) + ' 单位';
  zoneEl.textContent = ZONE_LABELS[building.zone];
  pollutionEl.textContent = building.lightIntensity.toFixed(1);

  panel.classList.remove('hidden');
}
