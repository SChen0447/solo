import * as THREE from 'three';
import * as d3 from 'd3';
import { ProcessedBuilding, ViewMode } from './DataManager';
import { BuildingData } from './data/buildingData';

export interface BuildingMeshUserData {
  buildingId: string;
  isBuilding: boolean;
}

export interface BuildingClickCallback {
  (buildingId: string, screenPos: { x: number; y: number }): void;
}

const COLOR_SCALE = d3.scaleLinear<string, number>()
  .domain([0, 0.5, 1])
  .range(['#2ed573', '#ffa502', '#ff4757'])
  .clamp(true);

const ANIMATION_DURATION = 500;

interface AnimatedState {
  targetValue: number;
  currentValue: number;
  startTime: number;
  startValue: number;
}

class BuildingObject {
  public id: string;
  public group: THREE.Group;
  public buildingMesh: THREE.Mesh;
  public pvMesh: THREE.Mesh;
  public barsGroup: THREE.Group;
  public barMeshes: THREE.Mesh[] = [];
  public outlineMesh: THREE.Mesh;

  private material: THREE.MeshStandardMaterial;
  private highlightMaterial: THREE.MeshStandardMaterial;
  private isHighlighted = false;

  private colorAnim: AnimatedState;
  private monthlyBarAnims: AnimatedState[] = [];

  constructor(building: ProcessedBuilding) {
    this.id = building.id;
    this.group = new THREE.Group();
    this.group.position.set(building.position.x, 0, building.position.z);

    this.buildingMesh = this.createBuildingMesh(building);
    this.material = this.buildingMesh.material as THREE.MeshStandardMaterial;
    this.material.color.set(COLOR_SCALE(building.value));

    this.highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.4,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.9
    });

    this.outlineMesh = this.createOutline(building);
    this.outlineMesh.visible = false;

    this.pvMesh = this.createPVMesh(building);
    this.barsGroup = this.createBarChart(building);

    this.group.add(this.buildingMesh);
    this.group.add(this.outlineMesh);
    this.group.add(this.pvMesh);
    this.group.add(this.barsGroup);

    this.colorAnim = {
      targetValue: building.value,
      currentValue: building.value,
      startTime: performance.now(),
      startValue: building.value
    };

    const maxEnergy = Math.max(...building.monthlyEnergy);
    building.monthlyEnergy.forEach((e, i) => {
      this.monthlyBarAnims.push({
        targetValue: maxEnergy > 0 ? e / maxEnergy : 0,
        currentValue: maxEnergy > 0 ? e / maxEnergy : 0,
        startTime: performance.now(),
        startValue: maxEnergy > 0 ? e / maxEnergy : 0
      });
    });
  }

  private createBuildingMesh(building: ProcessedBuilding): THREE.Mesh {
    let geometry: THREE.BufferGeometry;
    const heightScale = building.floors * 0.5;
    let posY = heightScale / 2;

    if (building.type === 'cube') {
      geometry = new THREE.BoxGeometry(building.width, heightScale, building.depth);
    } else if (building.type === 'tower') {
      geometry = new THREE.BoxGeometry(building.width * 0.7, heightScale, building.depth * 0.7);
    } else {
      const shape = new THREE.Shape();
      const w = building.width;
      const d = building.depth;
      shape.moveTo(-w / 2, -d / 2);
      shape.lineTo(w / 2, -d / 2);
      shape.lineTo(w / 2, 0);
      shape.lineTo(0, 0);
      shape.lineTo(0, d / 2);
      shape.lineTo(-w / 2, d / 2);
      shape.lineTo(-w / 2, -d / 2);
      const extrudeSettings = { depth: heightScale, bevelEnabled: false };
      geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.rotateX(-Math.PI / 2);
      posY = heightScale / 2;
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x8899cc,
      metalness: 0.2,
      roughness: 0.7,
      transparent: true,
      opacity: 0.95
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = posY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.35
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.position.copy(mesh.position);
    this.group.add(wireframe);

    const userData: BuildingMeshUserData = { buildingId: building.id, isBuilding: true };
    mesh.userData = userData;
    return mesh;
  }

  private createOutline(building: ProcessedBuilding): THREE.Mesh {
    const heightScale = building.floors * 0.5;
    const geometry = new THREE.BoxGeometry(
      building.width * 1.08,
      heightScale * 1.04,
      building.depth * 1.08
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = heightScale / 2;
    return mesh;
  }

  private createPVMesh(building: ProcessedBuilding): THREE.Mesh {
    const heightScale = building.floors * 0.5;
    const pvRatio = Math.min(1, building.pvArea / building.area);
    const pvWidth = building.width * pvRatio * 0.9;
    const pvDepth = building.depth * pvRatio * 0.9;
    const geometry = new THREE.BoxGeometry(pvWidth, 0.08, pvDepth);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a3a5a,
      emissive: 0x00aaff,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.85,
      metalness: 0.8,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = heightScale + 0.06;
    return mesh;
  }

  private createBarChart(building: ProcessedBuilding): THREE.Group {
    const group = new THREE.Group();
    const heightScale = building.floors * 0.5;
    const maxBarH = 1.8;
    const n = 12;
    const barW = Math.min(building.width, building.depth) * 0.6 / n;
    const spacing = Math.min(building.width, building.depth) * 0.7 / n;
    const startOffset = -((n - 1) * spacing) / 2;
    const maxEnergy = Math.max(...building.monthlyEnergy);

    for (let i = 0; i < n; i++) {
      const normE = maxEnergy > 0 ? building.monthlyEnergy[i] / maxEnergy : 0;
      const h = Math.max(0.05, normE * maxBarH);
      const geom = new THREE.BoxGeometry(barW, h, barW);
      const color = COLOR_SCALE(normE);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.35,
        metalness: 0.5,
        roughness: 0.3,
        transparent: true,
        opacity: 0.95
      });
      const bar = new THREE.Mesh(geom, mat);
      bar.position.set(startOffset + i * spacing, heightScale + h / 2 + 0.15, 0);
      bar.castShadow = true;
      this.barMeshes.push(bar);
      group.add(bar);
    }

    group.position.y = 0;
    return group;
  }

  public updateData(building: ProcessedBuilding): void {
    const now = performance.now();
    this.colorAnim = {
      targetValue: building.value,
      currentValue: this.colorAnim.currentValue,
      startTime: now,
      startValue: this.colorAnim.currentValue
    };

    const maxEnergy = Math.max(...building.monthlyEnergy);
    building.monthlyEnergy.forEach((e, i) => {
      const target = maxEnergy > 0 ? e / maxEnergy : 0;
      if (this.monthlyBarAnims[i]) {
        this.monthlyBarAnims[i] = {
          targetValue: target,
          currentValue: this.monthlyBarAnims[i].currentValue,
          startTime: now,
          startValue: this.monthlyBarAnims[i].currentValue
        };
      }
    });
  }

  public setHighlight(enabled: boolean): void {
    if (enabled === this.isHighlighted) return;
    this.isHighlighted = enabled;
    this.outlineMesh.visible = enabled;
    this.buildingMesh.material = enabled ? this.highlightMaterial : this.material;
  }

  public animate(now: number): void {
    const t = Math.min(1, (now - this.colorAnim.startTime) / ANIMATION_DURATION);
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    this.colorAnim.currentValue =
      this.colorAnim.startValue + (this.colorAnim.targetValue - this.colorAnim.startValue) * easeT;

    if (!this.isHighlighted) {
      this.material.color.set(COLOR_SCALE(this.colorAnim.currentValue));
    }

    const maxBarH = 1.8;
    const heightScale = this.group.children[0]?.position.y !== undefined
      ? (this.buildingMesh.geometry as THREE.BoxGeometry).parameters?.height || this.buildingMesh.position.y * 2
      : 0;
    const bHeight = this.buildingMesh.position.y * 2;

    this.monthlyBarAnims.forEach((anim, i) => {
      const bt = Math.min(1, (now - anim.startTime) / ANIMATION_DURATION);
      const beaseT = bt < 0.5 ? 2 * bt * bt : 1 - Math.pow(-2 * bt + 2, 2) / 2;
      anim.currentValue = anim.startValue + (anim.targetValue - anim.startValue) * beaseT;

      const bar = this.barMeshes[i];
      if (bar) {
        const h = Math.max(0.05, anim.currentValue * maxBarH);
        bar.scale.y = h / Math.max(0.05, (bar.geometry as THREE.BoxGeometry).parameters.height || 1);
        bar.position.y = bHeight + h / 2 + 0.15;
        (bar.material as THREE.MeshStandardMaterial).color.set(COLOR_SCALE(anim.currentValue));
        (bar.material as THREE.MeshStandardMaterial).emissive.set(COLOR_SCALE(anim.currentValue));
      }
    });
  }

  public getAABB(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.buildingMesh);
  }
}

export class BuildingSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private buildingGroup: THREE.Group;
  private buildings: Map<string, BuildingObject> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clickCallback?: BuildingClickCallback;
  private highlightedId?: string;

  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private pointerDownTime = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.buildingGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);

    this.setupInteraction();
  }

  private setupInteraction(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      this.isDragging = false;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.pointerDownTime = performance.now();
    });

    dom.addEventListener('pointermove', (e) => {
      if (Math.abs(e.clientX - this.dragStart.x) > 4 || Math.abs(e.clientY - this.dragStart.y) > 4) {
        this.isDragging = true;
      }
    });

    dom.addEventListener('pointerup', (e) => {
      const elapsed = performance.now() - this.pointerDownTime;
      if (!this.isDragging && elapsed < 400) {
        this.handleClick(e);
      }
    });
  }

  private handleClick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.buildings.forEach(b => meshes.push(b.buildingMesh));
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const userData = (intersects[0].object as THREE.Mesh).userData as BuildingMeshUserData;
      if (userData && userData.isBuilding) {
        this.setHighlight(userData.buildingId);
        if (this.clickCallback) {
          this.clickCallback(userData.buildingId, { x: e.clientX, y: e.clientY });
        }
      }
    } else {
      this.clearHighlight();
      if (this.clickCallback) {
        this.clickCallback('', { x: e.clientX, y: e.clientY });
      }
    }
  }

  public setOnBuildingClick(cb: BuildingClickCallback): void {
    this.clickCallback = cb;
  }

  public setHighlight(buildingId: string): void {
    this.clearHighlight();
    const b = this.buildings.get(buildingId);
    if (b) {
      b.setHighlight(true);
      this.highlightedId = buildingId;
    }
  }

  public clearHighlight(): void {
    if (this.highlightedId) {
      const b = this.buildings.get(this.highlightedId);
      if (b) b.setHighlight(false);
      this.highlightedId = undefined;
    }
  }

  public getHighlightedId(): string | undefined {
    return this.highlightedId;
  }

  public buildScene(data: ProcessedBuilding[]): void {
    this.buildingGroup.clear();
    this.buildings.clear();

    data.forEach(b => {
      const obj = new BuildingObject(b);
      this.buildings.set(b.id, obj);
      this.buildingGroup.add(obj.group);
    });
  }

  public updateData(data: ProcessedBuilding[]): void {
    data.forEach(b => {
      const obj = this.buildings.get(b.id);
      if (obj) {
        obj.updateData(b);
      }
    });
  }

  public getBuildingAABBs(): { id: string; box: THREE.Box3 }[] {
    const result: { id: string; box: THREE.Box3 }[] = [];
    this.buildings.forEach((b, id) => {
      result.push({ id, box: b.getAABB() });
    });
    return result;
  }

  public animate(now: number): void {
    this.buildings.forEach(b => b.animate(now));
  }

  public getColorScale(level: number): string {
    return COLOR_SCALE(Math.max(0, Math.min(1, level)));
  }

  public static getStaticColorScale(level: number): string {
    return COLOR_SCALE(Math.max(0, Math.min(1, level)));
  }
}
