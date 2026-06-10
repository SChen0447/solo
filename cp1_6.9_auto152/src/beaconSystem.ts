import * as THREE from 'three';

export enum BeaconType {
  START = 'start',
  CONTROL = 'control',
  END = 'end'
}

export interface Beacon {
  mesh: THREE.Mesh;
  type: BeaconType;
  isDragging: boolean;
  originalScale: number;
}

export type BeaconChangeCallback = (beacons: Beacon[]) => void;

const COLOR_START = 0xff88aa;
const COLOR_CONTROL = 0x88bbff;
const COLOR_END = 0x88bbff;
const COLOR_DRAG = 0xffee88;

export class BeaconSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private pickPlane: THREE.Mesh;
  private beacons: Beacon[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredBeacon: Beacon | null = null;
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private onBeaconsChanged: BeaconChangeCallback | null = null;
  private isDragging = false;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    pickPlane: THREE.Mesh
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.pickPlane = pickPlane;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.bindEvents();
  }

  setChangeCallback(callback: BeaconChangeCallback): void {
    this.onBeaconsChanged = callback;
  }

  getBeacons(): Beacon[] {
    return this.beacons;
  }

  getBeaconCount(): number {
    return this.beacons.length;
  }

  clear(): void {
    for (const beacon of this.beacons) {
      this.scene.remove(beacon.mesh);
      beacon.mesh.geometry.dispose();
      (beacon.mesh.material as THREE.Material).dispose();
    }
    this.beacons = [];
    this.notifyChange();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', (e) => this.handleClick(e));
    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(e: MouseEvent): void {
    if (this.isDragging) return;
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const beaconMeshes = this.beacons.map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(beaconMeshes, false);
    if (intersects.length > 0) return;

    const planeIntersects = this.raycaster.intersectObject(this.pickPlane, false);
    if (planeIntersects.length === 0) return;

    const point = planeIntersects[0].point.clone();
    point.z = 0;
    this.addBeacon(point);
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const beaconMeshes = this.beacons
      .filter(b => b.type === BeaconType.CONTROL)
      .map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(beaconMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const beacon = this.beacons.find(b => b.mesh === mesh);
      if (beacon) {
        this.isDragging = true;
        beacon.isDragging = true;
        this.setBeaconHighlight(beacon, true);
        this.dragOffset.copy(beacon.mesh.position).sub(intersects[0].point);
        this.dragOffset.z = 0;
        this.renderer.domElement.style.cursor = 'grabbing';
      }
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    this.updateMouse(e);

    if (this.isDragging) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const planeIntersects = this.raycaster.intersectObject(this.pickPlane, false);
      if (planeIntersects.length > 0) {
        const draggingBeacon = this.beacons.find(b => b.isDragging);
        if (draggingBeacon) {
          const newPos = planeIntersects[0].point.clone().add(this.dragOffset);
          newPos.z = 0;
          draggingBeacon.mesh.position.copy(newPos);
          this.notifyChange();
        }
      }
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const beaconMeshes = this.beacons.filter(b => b.type === BeaconType.CONTROL).map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(beaconMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const beacon = this.beacons.find(b => b.mesh === mesh);
      if (beacon && this.hoveredBeacon !== beacon) {
        if (this.hoveredBeacon && !this.hoveredBeacon.isDragging) {
          this.setBeaconHighlight(this.hoveredBeacon, false);
        }
        this.hoveredBeacon = beacon;
        this.renderer.domElement.style.cursor = 'grab';
      }
    } else {
      if (this.hoveredBeacon && !this.hoveredBeacon.isDragging) {
        this.setBeaconHighlight(this.hoveredBeacon, false);
        this.hoveredBeacon = null;
      }
      this.renderer.domElement.style.cursor = 'crosshair';
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    if (this.isDragging) {
      const draggingBeacon = this.beacons.find(b => b.isDragging);
      if (draggingBeacon) {
        draggingBeacon.isDragging = false;
        this.setBeaconHighlight(draggingBeacon, false);
      }
      this.isDragging = false;
      this.renderer.domElement.style.cursor = 'crosshair';
    }
  }

  private handleMouseLeave(): void {
    if (this.isDragging) {
      const draggingBeacon = this.beacons.find(b => b.isDragging);
      if (draggingBeacon) {
        draggingBeacon.isDragging = false;
        this.setBeaconHighlight(draggingBeacon, false);
      }
      this.isDragging = false;
    }
    if (this.hoveredBeacon && !this.hoveredBeacon.isDragging) {
      this.setBeaconHighlight(this.hoveredBeacon, false);
      this.hoveredBeacon = null;
    }
    this.renderer.domElement.style.cursor = 'crosshair';
  }

  private addBeacon(position: THREE.Vector3): void {
    let type: BeaconType;
    if (this.beacons.length === 0) {
      type = BeaconType.START;
    } else if (this.beacons.length === 3) {
      type = BeaconType.END;
    } else {
      type = BeaconType.CONTROL;
    }

    const radius = 0.2;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const color = this.getBeaconColor(type);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = { type };

    const glowGeometry = new THREE.SphereGeometry(radius * 1.6, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    this.scene.add(mesh);
    this.beacons.push({
      mesh,
      type,
      isDragging: false,
      originalScale: 1
    });

    this.notifyChange();
  }

  private getBeaconColor(type: BeaconType): number {
    switch (type) {
      case BeaconType.START:
        return COLOR_START;
      case BeaconType.END:
        return COLOR_END;
      default:
        return COLOR_CONTROL;
    }
  }

  private setBeaconHighlight(beacon: Beacon, highlighted: boolean): void {
    const material = beacon.mesh.material as THREE.MeshBasicMaterial;
    if (highlighted) {
      material.color.setHex(COLOR_DRAG);
      beacon.mesh.scale.setScalar(0.3 / 0.2);
    } else {
      material.color.setHex(this.getBeaconColor(beacon.type));
      beacon.mesh.scale.setScalar(1);
    }
    const glow = beacon.mesh.children[0] as THREE.Mesh;
    if (glow && glow.material) {
      (glow.material as THREE.MeshBasicMaterial).color.copy(material.color);
    }
  }

  private notifyChange(): void {
    if (this.onBeaconsChanged) {
      this.onBeaconsChanged(this.beacons);
    }
  }
}
