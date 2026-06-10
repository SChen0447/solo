import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const GRID_SIZE = 4;
const SPACING = 1.5;
const SPHERE_RADIUS = 0.15;
const MIN_Y = -3;
const MAX_Y = 3;

export class ControlPointManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private controlPoints: THREE.Vector3[][] = [];
  private spheres: THREE.Mesh[][] = [];
  private gridLines: THREE.Line[] = [];

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private isDragging: boolean;
  private draggedSphere: THREE.Mesh | null;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  private originalScales: Map<THREE.Mesh, THREE.Vector3>;

  private onChangeCallback: (() => void) | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    controls: OrbitControls
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.isDragging = false;
    this.draggedSphere = null;
    this.dragPlane = new THREE.Plane();
    this.dragOffset = new THREE.Vector3();
    this.originalScales = new Map();

    this.initControlPoints();
    this.initGridLines();
    this.addEventListeners();
  }

  private initControlPoints(): void {
    const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 16, 16);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.2
    });

    for (let i = 0; i < GRID_SIZE; i++) {
      this.controlPoints[i] = [];
      this.spheres[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = (j - (GRID_SIZE - 1) / 2) * SPACING;
        const z = (i - (GRID_SIZE - 1) / 2) * SPACING;
        const y = 0;

        const point = new THREE.Vector3(x, y, z);
        this.controlPoints[i][j] = point;

        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
        sphere.position.copy(point);
        sphere.userData = { gridI: i, gridJ: j };
        this.scene.add(sphere);
        this.spheres[i][j] = sphere;
        this.originalScales.set(sphere, sphere.scale.clone());
      }
    }
  }

  private initGridLines(): void {
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.6 });

    for (let i = 0; i < GRID_SIZE; i++) {
      const rowPoints: THREE.Vector3[] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        rowPoints.push(this.controlPoints[i][j]);
      }
      const rowGeometry = new THREE.BufferGeometry().setFromPoints(rowPoints);
      const rowLine = new THREE.Line(rowGeometry, lineMaterial);
      this.scene.add(rowLine);
      this.gridLines.push(rowLine);
    }

    for (let j = 0; j < GRID_SIZE; j++) {
      const colPoints: THREE.Vector3[] = [];
      for (let i = 0; i < GRID_SIZE; i++) {
        colPoints.push(this.controlPoints[i][j]);
      }
      const colGeometry = new THREE.BufferGeometry().setFromPoints(colPoints);
      const colLine = new THREE.Line(colGeometry, lineMaterial);
      this.scene.add(colLine);
      this.gridLines.push(colLine);
    }
  }

  private addEventListeners(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown.bind(this));
    dom.addEventListener('pointermove', this.onPointerMove.bind(this));
    dom.addEventListener('pointerup', this.onPointerUp.bind(this));
    dom.addEventListener('pointerleave', this.onPointerUp.bind(this));
  }

  private onPointerDown(event: PointerEvent): void {
    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const allSpheres: THREE.Mesh[] = [];
    for (const row of this.spheres) {
      for (const s of row) allSpheres.push(s);
    }

    const intersects = this.raycaster.intersectObjects(allSpheres);
    if (intersects.length > 0) {
      this.isDragging = true;
      this.draggedSphere = intersects[0].object as THREE.Mesh;
      this.controls.enabled = false;

      const material = this.draggedSphere.material as THREE.MeshStandardMaterial;
      material.color.set(0xff8c00);
      const originalScale = this.originalScales.get(this.draggedSphere)!;
      this.draggedSphere.scale.copy(originalScale).multiplyScalar(1.2);

      const normal = new THREE.Vector3(0, 1, 0);
      this.dragPlane.setFromNormalAndCoplanarPoint(
        normal,
        this.draggedSphere.position
      );

      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
      this.dragOffset.copy(this.draggedSphere.position).sub(intersection);
    }
  }

  private onPointerMove(event: PointerEvent): void {
    this.updatePointer(event);

    if (!this.isDragging || !this.draggedSphere) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      let newY = intersection.y + this.dragOffset.y;
      newY = Math.max(MIN_Y, Math.min(MAX_Y, newY));

      this.draggedSphere.position.y = newY;

      const { gridI, gridJ } = this.draggedSphere.userData;
      this.controlPoints[gridI][gridJ].copy(this.draggedSphere.position);

      this.updateGridLines();

      if (this.onChangeCallback) {
        this.onChangeCallback();
      }
    }
  }

  private onPointerUp(): void {
    if (this.isDragging && this.draggedSphere) {
      const material = this.draggedSphere.material as THREE.MeshStandardMaterial;
      material.color.set(0xffffff);
      const originalScale = this.originalScales.get(this.draggedSphere)!;
      this.draggedSphere.scale.copy(originalScale);
    }

    this.isDragging = false;
    this.draggedSphere = null;
    this.controls.enabled = true;
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateGridLines(): void {
    let lineIdx = 0;

    for (let i = 0; i < GRID_SIZE; i++) {
      const positions: number[] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        const p = this.controlPoints[i][j];
        positions.push(p.x, p.y, p.z);
      }
      const line = this.gridLines[lineIdx++];
      (line.geometry.attributes.position as THREE.BufferAttribute).set(positions);
      line.geometry.attributes.position.needsUpdate = true;
    }

    for (let j = 0; j < GRID_SIZE; j++) {
      const positions: number[] = [];
      for (let i = 0; i < GRID_SIZE; i++) {
        const p = this.controlPoints[i][j];
        positions.push(p.x, p.y, p.z);
      }
      const line = this.gridLines[lineIdx++];
      (line.geometry.attributes.position as THREE.BufferAttribute).set(positions);
      line.geometry.attributes.position.needsUpdate = true;
    }
  }

  public getControlPoints(): THREE.Vector3[][] {
    return this.controlPoints.map(row => row.map(p => p.clone()));
  }

  public setOnChangeCallback(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  public reset(): void {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = (j - (GRID_SIZE - 1) / 2) * SPACING;
        const z = (i - (GRID_SIZE - 1) / 2) * SPACING;
        const y = 0;

        this.controlPoints[i][j].set(x, y, z);
        this.spheres[i][j].position.copy(this.controlPoints[i][j]);
      }
    }
    this.updateGridLines();
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  public getFlatControlPoints(): THREE.Vector3[] {
    const flat: THREE.Vector3[] = [];
    for (const row of this.controlPoints) {
      for (const p of row) flat.push(p.clone());
    }
    return flat;
  }
}
