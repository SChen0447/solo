import * as THREE from 'three';

export interface BuildingData {
  id: string;
  gridX: number;
  gridZ: number;
  height: number;
  rotation: number;
  position: { x: number; z: number };
  color: number;
}

export interface CityGridEventMap {
  buildingClick: (data: BuildingData, mesh: THREE.Mesh) => void;
  buildingChange: (data: BuildingData) => void;
  buildingsUpdate: () => void;
}

export class CityGrid {
  public readonly group: THREE.Group;
  public readonly gridSize = 6;
  public readonly cellSize = 12;
  public readonly buildingSize = 10;
  public readonly sceneBounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };

  private buildings: Map<string, { data: BuildingData; mesh: THREE.Mesh; topFlag: THREE.Group }> = new Map();
  private eventListeners: Map<keyof CityGridEventMap, Function[]> = new Map();
  private scene: THREE.Scene;
  private windDirection = 0;
  private buildingBaseColor = 0x2a4a7a;
  private buildingEdgeColor = 0x66aaff;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'CityGrid';
    scene.add(this.group);

    const totalSize = this.gridSize * this.cellSize;
    this.sceneBounds = {
      minX: -totalSize / 2,
      maxX: totalSize / 2,
      minZ: -totalSize / 2,
      maxZ: totalSize / 2
    };

    this.createGround();
    this.generateBuildings();
  }

  private createGround(): void {
    const totalSize = this.gridSize * this.cellSize + 10;
    const groundGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x142238,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.group.add(ground);

    const gridHelper = new THREE.GridHelper(totalSize, this.gridSize, 0x2a4a7a, 0x1e3658);
    gridHelper.position.y = 0.01;
    this.group.add(gridHelper);
  }

  private getColorForHeight(height: number): number {
    const t = (height - 15) / (120 - 15);
    const colors = [
      { pos: 0.0, r: 0.2, g: 0.5, b: 0.8 },
      { pos: 0.3, r: 0.3, g: 0.7, b: 0.6 },
      { pos: 0.6, r: 0.9, g: 0.8, b: 0.3 },
      { pos: 1.0, r: 1.0, g: 0.4, b: 0.3 }
    ];
    for (let i = 0; i < colors.length - 1; i++) {
      if (t >= colors[i].pos && t <= colors[i + 1].pos) {
        const lt = (t - colors[i].pos) / (colors[i + 1].pos - colors[i].pos);
        const r = Math.round(colors[i].r + (colors[i + 1].r - colors[i].r) * lt);
        const g = Math.round(colors[i].g + (colors[i + 1].g - colors[i].g) * lt);
        const b = Math.round(colors[i].b + (colors[i + 1].b - colors[i].b) * lt);
        return (r << 16) | (g << 8) | b;
      }
    }
    return this.buildingBaseColor;
  }

  private createBuildingMesh(data: BuildingData): THREE.Mesh {
    const width = this.buildingSize;
    const depth = this.buildingSize;
    const height = data.height;
    const radius = 0.6;

    const shape = new THREE.Shape();
    const hw = width / 2 - radius;
    const hd = depth / 2 - radius;
    shape.moveTo(-hw, -hd + radius);
    shape.lineTo(-hw, hd - radius);
    shape.quadraticCurveTo(-hw, hd, -hw + radius, hd);
    shape.lineTo(hw - radius, hd);
    shape.quadraticCurveTo(hw, hd, hw, hd - radius);
    shape.lineTo(hw, -hd + radius);
    shape.quadraticCurveTo(hw, -hd, hw - radius, -hd);
    shape.lineTo(-hw + radius, -hd);
    shape.quadraticCurveTo(-hw, -hd, -hw, -hd + radius);

    const extrudeSettings = {
      depth: height,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.15,
      bevelSegments: 2
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, height / 2, 0);

    const material = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.6,
      metalness: 0.2,
      transparent: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.buildingId = data.id;

    const edges = new THREE.EdgesGeometry(geometry, 20);
    const lineMat = new THREE.LineBasicMaterial({ color: this.buildingEdgeColor, transparent: true, opacity: 0.6 });
    const lineSegments = new THREE.LineSegments(edges, lineMat);
    mesh.add(lineSegments);

    return mesh;
  }

  private createTopCap(height: number, color: number): THREE.Mesh {
    const geo = new THREE.BoxGeometry(this.buildingSize * 0.9, 0.4, this.buildingSize * 0.9);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
      metalness: 0.4,
      emissive: color,
      emissiveIntensity: 0.15
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = height + 0.2;
    return mesh;
  }

  private createWindFlag(): THREE.Group {
    const flagGroup = new THREE.Group();

    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.5;
    flagGroup.add(pole);

    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0);
    flagShape.lineTo(1.2, -0.25);
    flagShape.lineTo(0.8, 0);
    flagShape.lineTo(1.2, 0.25);
    flagShape.lineTo(0, 0);

    const flagGeo = new THREE.ExtrudeGeometry(flagShape, { depth: 0.03, bevelEnabled: false });
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xff6644,
      side: THREE.DoubleSide,
      roughness: 0.5
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.05, 3, 0);
    flag.rotation.y = 0;
    flag.name = 'flag';
    flagGroup.add(flag);

    return flagGroup;
  }

  private generateBuildings(): void {
    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        const id = `b_${gx}_${gz}`;
        const height = Math.round((15 + Math.random() * 105) / 5) * 5;
        const posX = (gx - this.gridSize / 2 + 0.5) * this.cellSize;
        const posZ = (gz - this.gridSize / 2 + 0.5) * this.cellSize;

        const data: BuildingData = {
          id,
          gridX: gx,
          gridZ: gz,
          height,
          rotation: 0,
          position: { x: posX, z: posZ },
          color: this.getColorForHeight(height)
        };

        this.addBuilding(data);
      }
    }
  }

  private addBuilding(data: BuildingData): void {
    const mesh = this.createBuildingMesh(data);
    mesh.position.set(data.position.x, 0, data.position.z);
    mesh.rotation.y = (data.rotation * Math.PI) / 180;

    const topCap = this.createTopCap(data.height, data.color);
    mesh.add(topCap);

    const flag = this.createWindFlag();
    flag.position.y = data.height + 0.4;
    flag.rotation.y = this.windDirection;
    flag.name = 'flagGroup';
    mesh.add(flag);

    this.group.add(mesh);
    this.buildings.set(data.id, { data, mesh, topFlag: flag });
  }

  public getBuildingData(id: string): BuildingData | undefined {
    return this.buildings.get(id)?.data;
  }

  public getAllBuildingData(): BuildingData[] {
    return Array.from(this.buildings.values()).map(b => b.data);
  }

  public getBuildingMesh(id: string): THREE.Mesh | undefined {
    return this.buildings.get(id)?.mesh;
  }

  public updateBuilding(id: string, updates: Partial<BuildingData>): void {
    const entry = this.buildings.get(id);
    if (!entry) return;

    const { data, mesh } = entry;
    const needsRebuild = updates.height !== undefined || updates.color !== undefined;

    Object.assign(data, updates);

    if (updates.position) {
      mesh.position.set(updates.position.x ?? mesh.position.x, 0, updates.position.z ?? mesh.position.z);
    }
    if (updates.rotation !== undefined) {
      mesh.rotation.y = (updates.rotation * Math.PI) / 180;
    }

    if (needsRebuild) {
      const parent = mesh.parent;
      const oldPos = mesh.position.clone();
      const oldRot = mesh.rotation.clone();

      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();

      const newMesh = this.createBuildingMesh(data);
      newMesh.position.copy(oldPos);
      newMesh.rotation.copy(oldRot);

      const topCap = this.createTopCap(data.height, data.color);
      newMesh.add(topCap);

      const flag = this.createWindFlag();
      flag.position.y = data.height + 0.4;
      flag.rotation.y = this.windDirection;
      flag.name = 'flagGroup';
      newMesh.add(flag);

      if (parent) parent.add(newMesh);
      entry.mesh = newMesh;
      entry.topFlag = flag;
    }

    this.emit('buildingChange', data);
    this.emit('buildingsUpdate');
  }

  public deleteBuilding(id: string): void {
    const entry = this.buildings.get(id);
    if (!entry) return;

    this.group.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    (entry.mesh.material as THREE.Material).dispose();
    this.buildings.delete(id);

    this.emit('buildingsUpdate');
  }

  public duplicateBuilding(id: string): string | null {
    const entry = this.buildings.get(id);
    if (!entry) return null;

    const srcData = entry.data;
    const newGx = Math.min(srcData.gridX + 1, this.gridSize - 1);
    const newGz = srcData.gridZ;
    const newId = `b_${newGx}_${newGz}_${Date.now()}`;

    if (this.buildings.has(newId)) return null;

    const posX = (newGx - this.gridSize / 2 + 0.5) * this.cellSize;
    const posZ = (newGz - this.gridSize / 2 + 0.5) * this.cellSize;

    const newData: BuildingData = {
      ...srcData,
      id: newId,
      gridX: newGx,
      gridZ: newGz,
      position: { x: posX, z: posZ }
    };

    this.addBuilding(newData);
    this.emit('buildingsUpdate');
    return newId;
  }

  public setWindDirection(radians: number): void {
    this.windDirection = radians;
    this.buildings.forEach(entry => {
      entry.topFlag.rotation.y = radians;
    });
  }

  public highlightBuilding(id: string | null): void {
    this.buildings.forEach((entry, bid) => {
      const mat = entry.mesh.material as THREE.MeshStandardMaterial;
      if (bid === id) {
        mat.emissive = new THREE.Color(0x4488ff);
        mat.emissiveIntensity = 0.3;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }

  public on<K extends keyof CityGridEventMap>(event: K, callback: CityGridEventMap[K]): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback as Function);
  }

  public emit<K extends keyof CityGridEventMap>(event: K, ...args: Parameters<CityGridEventMap[K]>): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(fn => (fn as Function)(...args));
    }
  }

  public handleClick(intersect: THREE.Intersection): void {
    const mesh = intersect.object as THREE.Mesh;
    let buildingMesh: THREE.Mesh | null = mesh;
    while (buildingMesh && !buildingMesh.userData.buildingId) {
      buildingMesh = buildingMesh.parent as THREE.Mesh | null;
    }
    if (!buildingMesh) return;

    const id = buildingMesh.userData.buildingId as string;
    const entry = this.buildings.get(id);
    if (entry) {
      this.highlightBuilding(id);
      this.emit('buildingClick', entry.data, entry.mesh);
    }
  }

  public clearHighlight(): void {
    this.highlightBuilding(null);
  }
}
