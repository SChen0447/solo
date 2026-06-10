import * as THREE from 'three';
import { saveAs } from 'file-saver';

export type MaterialType = 'glass' | 'concrete' | 'metal';

export interface BuildingData {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  material: MaterialType;
  roofColor: string;
}

interface BuildingMeshGroup {
  group: THREE.Group;
  body: THREE.Mesh;
  roof: THREE.Mesh;
  wireframe: THREE.LineSegments | null;
  glow: THREE.Mesh | null;
  data: BuildingData;
}

const GRID_SIZE = 20;
const PLOT_SIZE = 20;
const MIN_HEIGHT = 2;
const MAX_HEIGHT = 50;
const INITIAL_MIN_HEIGHT = 3;
const INITIAL_MAX_HEIGHT = 30;

const BOTTOM_COLOR = new THREE.Color('#333344');
const TOP_COLOR = new THREE.Color('#aaaacc');

export class CityManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private buildings: Map<string, BuildingMeshGroup> = new Map();
  private selectedBuilding: BuildingMeshGroup | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartHeight: number = 0;
  private heightLabel: HTMLDivElement | null = null;
  private onBuildingSelectCallback: ((data: BuildingData | null) => void) | null = null;
  private materialCache: Map<string, THREE.Material> = new Map();
  private baseGeometry: THREE.BoxGeometry;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.baseGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.createHeightLabel();
    this.bindEvents();
    this.generateCity();
  }

  private createHeightLabel(): void {
    this.heightLabel = document.createElement('div');
    this.heightLabel.id = 'height-label';
    this.heightLabel.style.cssText = `
      position: fixed;
      display: none;
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.6);
      color: #ffffff;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      border-radius: 4px;
      pointer-events: none;
      z-index: 1000;
      transition: opacity 0.2s ease;
    `;
    document.body.appendChild(this.heightLabel);
  }

  private hslToHex(h: number, s: number, l: number): string {
    const color = new THREE.Color();
    color.setHSL(h / 360, s / 100, l / 100);
    return '#' + color.getHexString();
  }

  private randomRoofColor(): string {
    const h = Math.floor(Math.random() * 361);
    const s = 60 + Math.floor(Math.random() * 21);
    const l = 70;
    return this.hslToHex(h, s, l);
  }

  private generateBuildingId(x: number, z: number): string {
    return `building_${x}_${z}`;
  }

  private getGradientMaterial(height: number, materialType: MaterialType, roofColor: string): THREE.Material {
    const cacheKey = `${materialType}_${height.toFixed(1)}_${roofColor}`;
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    let material: THREE.MeshStandardMaterial;
    
    switch (materialType) {
      case 'glass':
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#77bbff'),
          transparent: true,
          opacity: 0.4,
          metalness: 0.1,
          roughness: 0.05,
          envMapIntensity: 0.3,
          side: THREE.DoubleSide,
          vertexColors: false
        });
        break;
      case 'concrete':
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#999999'),
          metalness: 0.0,
          roughness: 0.9
        });
        break;
      case 'metal':
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#dddddd'),
          metalness: 0.9,
          roughness: 0.2,
          envMapIntensity: 0.7
        });
        break;
      default:
        material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    }

    this.materialCache.set(cacheKey, material);
    return material;
  }

  private createRoofMaterial(roofColor: string): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(roofColor),
      metalness: 0.1,
      roughness: 0.6
    });
  }

  private createVertexColors(height: number): Float32Array {
    const colors = new Float32Array(24 * 3);
    const geometry = this.baseGeometry;
    const pos = geometry.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const y = (pos.getY(i) + 0.5);
      const t = Math.max(0, Math.min(1, y));
      const color = BOTTOM_COLOR.clone().lerp(TOP_COLOR, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return colors;
  }

  private createBuilding(data: BuildingData): BuildingMeshGroup {
    const group = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(data.width * 0.9, data.height, data.depth * 0.9);
    const vertexColors = this.createVertexColors(data.height);
    bodyGeometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));

    const bodyMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.1,
      roughness: 0.7
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = data.height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofGeometry = new THREE.BoxGeometry(data.width * 0.9, 0.5, data.depth * 0.9);
    const roofMaterial = this.createRoofMaterial(data.roofColor);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = data.height + 0.25;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    let wireframe: THREE.LineSegments | null = null;
    if (data.material === 'glass') {
      const edges = new THREE.EdgesGeometry(bodyGeometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3
      });
      wireframe = new THREE.LineSegments(edges, lineMaterial);
      wireframe.position.y = data.height / 2;
      group.add(wireframe);
    }

    const worldX = (data.x - GRID_SIZE / 2 + 0.5) * PLOT_SIZE;
    const worldZ = (data.z - GRID_SIZE / 2 + 0.5) * PLOT_SIZE;
    group.position.set(worldX, 0, worldZ);
    group.userData = { buildingId: data.id };

    this.scene.add(group);

    return { group, body, roof, wireframe, glow: null, data };
  }

  public generateCity(): void {
    this.clearBuildings();

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const height = INITIAL_MIN_HEIGHT + Math.random() * (INITIAL_MAX_HEIGHT - INITIAL_MIN_HEIGHT);
        const data: BuildingData = {
          id: this.generateBuildingId(x, z),
          x,
          z,
          width: PLOT_SIZE,
          depth: PLOT_SIZE,
          height,
          material: 'concrete',
          roofColor: this.randomRoofColor()
        };
        const building = this.createBuilding(data);
        this.buildings.set(data.id, building);
      }
    }
  }

  private clearBuildings(): void {
    this.buildings.forEach((b) => {
      this.scene.remove(b.group);
      b.body.geometry.dispose();
      if (Array.isArray(b.body.material)) {
        b.body.material.forEach((m) => m.dispose());
      } else {
        b.body.material.dispose();
      }
      b.roof.geometry.dispose();
      if (Array.isArray(b.roof.material)) {
        b.roof.material.forEach((m) => m.dispose());
      } else {
        b.roof.material.dispose();
      }
      if (b.wireframe) {
        b.wireframe.geometry.dispose();
        if (Array.isArray(b.wireframe.material)) {
          b.wireframe.material.forEach((m) => m.dispose());
        } else {
          b.wireframe.material.dispose();
        }
      }
      if (b.glow) {
        b.glow.geometry.dispose();
        if (Array.isArray(b.glow.material)) {
          b.glow.material.forEach((m) => m.dispose());
        } else {
          b.glow.material.dispose();
        }
      }
    });
    this.buildings.clear();
    this.selectedBuilding = null;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
  }

  private getIntersectBuilding(event: MouseEvent): BuildingMeshGroup | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targets: THREE.Object3D[] = [];
    this.buildings.forEach((b) => {
      targets.push(b.body, b.roof);
    });

    const intersects = this.raycaster.intersectObjects(targets, false);
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.buildingId) {
        obj = obj.parent;
      }
      if (obj && obj.userData.buildingId) {
        return this.buildings.get(obj.userData.buildingId) || null;
      }
    }
    return null;
  }

  private onMouseDown(event: MouseEvent): void {
    const building = this.getIntersectBuilding(event);
    if (building) {
      this.selectBuilding(building);
      this.isDragging = true;
      this.dragStartY = event.clientY;
      this.dragStartHeight = building.data.height;
      if (this.heightLabel) {
        this.heightLabel.style.display = 'block';
        this.updateHeightLabel(event.clientX, event.clientY, building.data.height);
      }
    } else {
      this.selectBuilding(null);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging && this.selectedBuilding) {
      const deltaY = (this.dragStartY - event.clientY) * 0.3;
      let newHeight = this.dragStartHeight + deltaY;
      newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
      this.updateBuildingHeight(this.selectedBuilding, newHeight);
      this.updateHeightLabel(event.clientX, event.clientY, newHeight);
    }
  }

  private onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.heightLabel) {
        this.heightLabel.style.display = 'none';
      }
    }
  }

  private updateHeightLabel(x: number, y: number, height: number): void {
    if (this.heightLabel) {
      this.heightLabel.textContent = `${height.toFixed(1)} 单位`;
      this.heightLabel.style.left = `${x + 10}px`;
      this.heightLabel.style.top = `${y - 30}px`;
    }
  }

  private selectBuilding(building: BuildingMeshGroup | null): void {
    if (this.selectedBuilding) {
      this.removeGlowEffect(this.selectedBuilding);
    }
    this.selectedBuilding = building;
    if (building) {
      this.addGlowEffect(building);
    }
    if (this.onBuildingSelectCallback) {
      this.onBuildingSelectCallback(building ? building.data : null);
    }
  }

  private addGlowEffect(building: BuildingMeshGroup): void {
    if (building.glow) return;

    const data = building.data;
    const glowGeometry = new THREE.BoxGeometry(data.width * 0.95, data.height + 1, data.depth * 0.95);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffca28'),
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = (data.height + 1) / 2;
    building.group.add(glow);
    building.glow = glow;
  }

  private removeGlowEffect(building: BuildingMeshGroup): void {
    if (building.glow) {
      building.group.remove(building.glow);
      building.glow.geometry.dispose();
      if (Array.isArray(building.glow.material)) {
        building.glow.material.forEach((m) => m.dispose());
      } else {
        building.glow.material.dispose();
      }
      building.glow = null;
    }
  }

  private updateBuildingHeight(building: BuildingMeshGroup, newHeight: number): void {
    building.data.height = newHeight;

    building.body.geometry.dispose();
    const bodyGeometry = new THREE.BoxGeometry(building.data.width * 0.9, newHeight, building.data.depth * 0.9);
    const vertexColors = this.createVertexColors(newHeight);
    bodyGeometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));
    building.body.geometry = bodyGeometry;
    building.body.position.y = newHeight / 2;

    building.roof.position.y = newHeight + 0.25;

    if (building.wireframe) {
      building.group.remove(building.wireframe);
      building.wireframe.geometry.dispose();
      (building.wireframe.material as THREE.Material).dispose();
      const edges = new THREE.EdgesGeometry(bodyGeometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3
      });
      building.wireframe = new THREE.LineSegments(edges, lineMaterial);
      building.wireframe.position.y = newHeight / 2;
      building.group.add(building.wireframe);
    }

    if (building.glow) {
      building.group.remove(building.glow);
      building.glow.geometry.dispose();
      (building.glow.material as THREE.Material).dispose();
      const glowGeometry = new THREE.BoxGeometry(building.data.width * 0.95, newHeight + 1, building.data.depth * 0.95);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffca28'),
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      });
      building.glow = new THREE.Mesh(glowGeometry, glowMaterial);
      building.glow.position.y = (newHeight + 1) / 2;
      building.group.add(building.glow);
    }

    if (this.onBuildingSelectCallback && this.selectedBuilding === building) {
      this.onBuildingSelectCallback(building.data);
    }
  }

  public setBuildingMaterial(materialType: MaterialType): void {
    if (!this.selectedBuilding) return;
    const building = this.selectedBuilding;
    building.data.material = materialType;

    if (building.wireframe) {
      building.group.remove(building.wireframe);
      building.wireframe.geometry.dispose();
      (building.wireframe.material as THREE.Material).dispose();
      building.wireframe = null;
    }

    if (materialType === 'glass') {
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#77bbff'),
        transparent: true,
        opacity: 0.4,
        metalness: 0.1,
        roughness: 0.05,
        envMapIntensity: 0.3,
        side: THREE.DoubleSide
      });
      (building.body.material as THREE.Material).dispose();
      building.body.material = bodyMaterial;

      const edges = new THREE.EdgesGeometry(building.body.geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3
      });
      building.wireframe = new THREE.LineSegments(edges, lineMaterial);
      building.wireframe.position.y = building.data.height / 2;
      building.group.add(building.wireframe);
    } else if (materialType === 'concrete') {
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#999999'),
        metalness: 0.0,
        roughness: 0.9
      });
      (building.body.material as THREE.Material).dispose();
      building.body.material = bodyMaterial;
    } else if (materialType === 'metal') {
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#dddddd'),
        metalness: 0.9,
        roughness: 0.2,
        envMapIntensity: 0.7
      });
      (building.body.material as THREE.Material).dispose();
      building.body.material = bodyMaterial;
    }
  }

  public onBuildingSelect(callback: (data: BuildingData | null) => void): void {
    this.onBuildingSelectCallback = callback;
  }

  public update(): void {
    if (this.selectedBuilding && this.selectedBuilding.glow) {
      const time = performance.now() * 0.001;
      const pulse = 0.2 + Math.sin(time * Math.PI * 2) * 0.15;
      (this.selectedBuilding.glow.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  }

  public exportJSON(): void {
    const buildingsData: BuildingData[] = [];
    this.buildings.forEach((b) => {
      buildingsData.push({
        id: b.data.id,
        x: b.data.x,
        z: b.data.z,
        width: b.data.width,
        depth: b.data.depth,
        height: b.data.height,
        material: b.data.material,
        roofColor: b.data.roofColor
      });
    });

    const exportData = {
      timestamp: Date.now(),
      buildings: buildingsData,
      gridSize: GRID_SIZE,
      plotSize: PLOT_SIZE
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    saveAs(blob, `skyline_${Date.now()}.json`);
  }

  public exportScreenshot(): void {
    const originalCamera = this.camera;
    const aspect = this.renderer.domElement.width / this.renderer.domElement.height;
    const frustumSize = GRID_SIZE * PLOT_SIZE * 1.2;

    const topCamera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      2000
    );
    topCamera.position.set(0, frustumSize, 0.01);
    topCamera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, topCamera);

    const dataURL = this.renderer.domElement.toDataURL('image/png');
    fetch(dataURL)
      .then((res) => res.blob())
      .then((blob) => {
        saveAs(blob, `skyline_topview_${Date.now()}.png`);
      });

    this.renderer.render(this.scene, originalCamera);
  }
}
