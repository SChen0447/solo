import * as THREE from 'three';
import type { ObstacleInfo } from './waterSim';

export interface Obstacle {
  id: string;
  type: 'circle' | 'square';
  mesh: THREE.Mesh;
  highlight: THREE.Mesh;
  position: THREE.Vector3;
  size: number;
}

type PlaceMode = 'none' | 'circle' | 'square';

export class ObstacleManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private obstacles: Obstacle[] = [];
  private selectedObstacle: Obstacle | null = null;
  private placeMode: PlaceMode = 'none';
  private isDragging: boolean = false;
  private dragOffset: THREE.Vector2 = new THREE.Vector2();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private groundPlane: THREE.Plane;
  private onObstaclesChange: (() => void) | null = null;
  private previewMesh: THREE.Mesh | null = null;
  private riverBounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    riverBounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.riverBounds = riverBounds;

    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.setupEventListeners();
  }

  public setOnObstaclesChange(callback: () => void): void {
    this.onObstaclesChange = callback;
  }

  public setPlaceMode(mode: PlaceMode): void {
    this.placeMode = mode;
    this.updatePreview();
  }

  public getPlaceMode(): PlaceMode {
    return this.placeMode;
  }

  public getObstaclesInfo(): ObstacleInfo[] {
    return this.obstacles.map(obs => ({
      id: obs.id,
      type: obs.type,
      x: obs.position.x,
      z: obs.position.z,
      size: obs.size
    }));
  }

  public selectObstacle(obstacle: Obstacle | null): void {
    if (this.selectedObstacle === obstacle) return;

    if (this.selectedObstacle) {
      this.selectedObstacle.highlight.visible = false;
    }

    this.selectedObstacle = obstacle;

    if (obstacle) {
      obstacle.highlight.visible = true;
    }
  }

  public getSelectedObstacle(): Obstacle | null {
    return this.selectedObstacle;
  }

  public deleteSelected(): void {
    if (!this.selectedObstacle) return;

    this.scene.remove(this.selectedObstacle.mesh);
    this.selectedObstacle.mesh.geometry.dispose();
    (this.selectedObstacle.mesh.material as THREE.Material).dispose();

    this.scene.remove(this.selectedObstacle.highlight);
    this.selectedObstacle.highlight.geometry.dispose();
    (this.selectedObstacle.highlight.material as THREE.Material).dispose();

    const idx = this.obstacles.indexOf(this.selectedObstacle);
    if (idx > -1) {
      this.obstacles.splice(idx, 1);
    }

    this.selectedObstacle = null;
    this.notifyChange();
  }

  public update(deltaTime: number): void {
    if (this.selectedObstacle) {
      const highlightScale = 1.05 + Math.sin(Date.now() * 0.003) * 0.02;
      this.selectedObstacle.highlight.scale.setScalar(highlightScale);
    }
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.placeMode !== 'none' && this.previewMesh) {
      const point = this.raycastGround();
      if (point) {
        this.previewMesh.visible = true;
        const clamped = this.clampToRiver(point);
        this.previewMesh.position.copy(clamped);
      }
    }

    if (this.isDragging && this.selectedObstacle) {
      const point = this.raycastGround();
      if (point) {
        const clamped = this.clampToRiver(point);
        this.selectedObstacle.position.copy(clamped);
        this.selectedObstacle.mesh.position.copy(clamped);
        this.selectedObstacle.highlight.position.copy(clamped);
        this.notifyChange();
      }
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    if (this.placeMode !== 'none') {
      const point = this.raycastGround();
      if (point) {
        const clamped = this.clampToRiver(point);
        this.addObstacle(this.placeMode, clamped);
        this.placeMode = 'none';
        this.updatePreview();
      }
      return;
    }

    const hit = this.raycastObstacle();
    if (hit) {
      this.selectObstacle(hit);
      this.isDragging = true;
    } else {
      this.selectObstacle(null);
    }
  }

  private onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    event.preventDefault();

    const touch = event.touches[0];
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.placeMode !== 'none') {
      const point = this.raycastGround();
      if (point) {
        const clamped = this.clampToRiver(point);
        this.addObstacle(this.placeMode, clamped);
        this.placeMode = 'none';
        this.updatePreview();
      }
      return;
    }

    const hit = this.raycastObstacle();
    if (hit) {
      this.selectObstacle(hit);
      this.isDragging = true;
    } else {
      this.selectObstacle(null);
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    event.preventDefault();

    const touch = event.touches[0];
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.placeMode !== 'none' && this.previewMesh) {
      const point = this.raycastGround();
      if (point) {
        this.previewMesh.visible = true;
        const clamped = this.clampToRiver(point);
        this.previewMesh.position.copy(clamped);
      }
    }

    if (this.isDragging && this.selectedObstacle) {
      const point = this.raycastGround();
      if (point) {
        const clamped = this.clampToRiver(point);
        this.selectedObstacle.position.copy(clamped);
        this.selectedObstacle.mesh.position.copy(clamped);
        this.selectedObstacle.highlight.position.copy(clamped);
        this.notifyChange();
      }
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    this.isDragging = false;
  }

  private addObstacle(type: 'circle' | 'square', position: THREE.Vector3): void {
    const id = 'obs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const size = 2 + Math.random() * 1.5;

    let geometry: THREE.BufferGeometry;
    if (type === 'circle') {
      geometry = new THREE.CylinderGeometry(size / 2, size / 2 + 0.3, 1.2, 32);
    } else {
      geometry = new THREE.BoxGeometry(size, 1.2, size);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.8,
      metalness: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y = 0.4;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.obstacleId = id;

    let highlightGeo: THREE.BufferGeometry;
    if (type === 'circle') {
      highlightGeo = new THREE.CylinderGeometry(size / 2 + 0.15, size / 2 + 0.15, 1.3, 32);
    } else {
      highlightGeo = new THREE.BoxGeometry(size + 0.3, 1.3, size + 0.3);
    }

    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.BackSide
    });

    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    highlight.position.copy(mesh.position);
    highlight.visible = false;

    this.scene.add(mesh);
    this.scene.add(highlight);

    const obstacle: Obstacle = {
      id,
      type,
      mesh,
      highlight,
      position: mesh.position.clone(),
      size
    };

    this.obstacles.push(obstacle);
    this.selectObstacle(obstacle);
    this.notifyChange();
  }

  private updatePreview(): void {
    if (this.placeMode === 'none') {
      if (this.previewMesh) {
        this.scene.remove(this.previewMesh);
        this.previewMesh.geometry.dispose();
        (this.previewMesh.material as THREE.Material).dispose();
        this.previewMesh = null;
      }
      return;
    }

    if (!this.previewMesh) {
      let geometry: THREE.BufferGeometry;
      if (this.placeMode === 'circle') {
        geometry = new THREE.CylinderGeometry(1.5, 1.8, 1.2, 32);
      } else {
        geometry = new THREE.BoxGeometry(3, 1.2, 3);
      }

      const material = new THREE.MeshStandardMaterial({
        color: 0x9ca3af,
        transparent: true,
        opacity: 0.5,
        roughness: 0.8
      });

      this.previewMesh = new THREE.Mesh(geometry, material);
      this.previewMesh.position.y = 0.4;
      this.scene.add(this.previewMesh);
    }
  }

  private raycastGround(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, target);
    return hit ? target : null;
  }

  private raycastObstacle(): Obstacle | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.obstacles.map(o => o.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const obstacleId = hitMesh.userData.obstacleId;
      return this.obstacles.find(o => o.id === obstacleId) || null;
    }

    return null;
  }

  private clampToRiver(point: THREE.Vector3): THREE.Vector3 {
    const result = point.clone();
    result.x = THREE.MathUtils.clamp(
      result.x,
      this.riverBounds.minX,
      this.riverBounds.maxX
    );
    result.z = THREE.MathUtils.clamp(
      result.z,
      this.riverBounds.minZ,
      this.riverBounds.maxZ
    );
    result.y = 0;
    return result;
  }

  private notifyChange(): void {
    if (this.onObstaclesChange) {
      this.onObstaclesChange();
    }
  }

  public dispose(): void {
    for (const obs of this.obstacles) {
      this.scene.remove(obs.mesh);
      obs.mesh.geometry.dispose();
      (obs.mesh.material as THREE.Material).dispose();

      this.scene.remove(obs.highlight);
      obs.highlight.geometry.dispose();
      (obs.highlight.material as THREE.Material).dispose();
    }
    this.obstacles = [];

    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
      (this.previewMesh.material as THREE.Material).dispose();
    }
  }
}
