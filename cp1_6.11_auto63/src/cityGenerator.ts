import * as THREE from 'three';

export interface BuildingData {
  id: number;
  position: { x: number; z: number };
  width: number;
  depth: number;
  height: number;
  colorBottom: string;
  colorTop: string;
  details: BuildingDetail[];
}

export interface BuildingDetail {
  type: 'antenna' | 'spire';
  position: { x: number; z: number };
  height: number;
  width: number;
}

export interface CityParams {
  buildingCount: number;
  minHeight: number;
  maxHeight: number;
  colorTheme: ColorTheme;
}

export type ColorTheme = 'sunset' | 'cyberpunk' | 'polar' | 'desert' | 'futuristic';

const COLOR_THEMES: Record<ColorTheme, { bottom: string[]; top: string[] }> = {
  sunset: {
    bottom: ['#ff6b35', '#f7931e', '#ffaa5c', '#ff8c42'],
    top: ['#4a90d9', '#7b68ee', '#9370db', '#87ceeb'],
  },
  cyberpunk: {
    bottom: ['#ff00ff', '#00ffff', '#ff1493', '#7b68ee'],
    top: ['#00ff88', '#ff6b9d', '#ffa500', '#00ced1'],
  },
  polar: {
    bottom: ['#87ceeb', '#b0e0e6', '#add8e6', '#e0ffff'],
    top: ['#ffffff', '#f0f8ff', '#e6e6fa', '#dcdcdc'],
  },
  desert: {
    bottom: ['#d2691e', '#daa520', '#cd853f', '#f4a460'],
    top: ['#f5deb3', '#ffe4c4', '#ffdab9', '#faebd7'],
  },
  futuristic: {
    bottom: ['#c0c0c0', '#a9a9a9', '#d3d3d3', '#b8b8b8'],
    top: ['#ffffff', '#f5f5f5', '#e8e8e8', '#f0f0f0'],
  },
};

export interface BuildingObject {
  group: THREE.Group;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  details: THREE.Object3D[];
  windows: THREE.Mesh[];
  data: BuildingData;
  isSelected: boolean;
}

export class CityGenerator {
  private scene: THREE.Scene;
  private buildings: BuildingObject[] = [];
  private cityGroup: THREE.Group;
  private groundPlane: THREE.Mesh;
  private selectedBuilding: BuildingObject | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cityGroup = new THREE.Group();
    this.scene.add(this.cityGroup);
    this.createGround();
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(600, 600);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.01;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);
  }

  public generateCity(params: CityParams): void {
    this.clearCity();
    const { buildingCount, minHeight, maxHeight, colorTheme } = params;
    const buildingsData = this.generateBuildingData(buildingCount, minHeight, maxHeight, colorTheme);
    this.createBuildings(buildingsData);
  }

  private generateBuildingData(
    count: number,
    minHeight: number,
    maxHeight: number,
    colorTheme: ColorTheme
  ): BuildingData[] {
    const data: BuildingData[] = [];
    const gridSize = Math.ceil(Math.sqrt(count)) + 2;
    const spacing = 400 / gridSize;
    const theme = COLOR_THEMES[colorTheme];

    const positions: { x: number; z: number }[] = [];
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        positions.push({
          x: (i - gridSize / 2) * spacing + (Math.random() - 0.5) * spacing * 0.5,
          z: (j - gridSize / 2) * spacing + (Math.random() - 0.5) * spacing * 0.5,
        });
      }
    }
    positions.sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const height = Math.random() * (maxHeight - minHeight) + minHeight;
      const sizeFactor = 1 - (height - minHeight) / (maxHeight - minHeight) * 0.5;
      const width = (8 + Math.random() * 12) * sizeFactor;
      const depth = (8 + Math.random() * 12) * sizeFactor;
      const pos = positions[i % positions.length];

      const detailCount = Math.floor(Math.random() * 3) + 1;
      const details: BuildingDetail[] = [];
      for (let d = 0; d < detailCount; d++) {
        details.push({
          type: Math.random() > 0.5 ? 'antenna' : 'spire',
          position: {
            x: (Math.random() - 0.5) * width * 0.6,
            z: (Math.random() - 0.5) * depth * 0.6,
          },
          height: Math.random() * 15 + 5,
          width: Math.random() * 2 + 0.5,
        });
      }

      data.push({
        id: i,
        position: { x: pos.x, z: pos.z },
        width,
        depth,
        height,
        colorBottom: theme.bottom[Math.floor(Math.random() * theme.bottom.length)],
        colorTop: theme.top[Math.floor(Math.random() * theme.top.length)],
        details,
      });
    }

    return data;
  }

  private createBuildings(buildingsData: BuildingData[]): void {
    for (const data of buildingsData) {
      const building = this.createBuilding(data);
      this.buildings.push(building);
      this.cityGroup.add(building.group);
    }
  }

  private createBuilding(data: BuildingData): BuildingObject {
    const group = new THREE.Group();
    group.position.set(data.position.x, 0, data.position.z);
    group.userData = { buildingId: data.id, isBuilding: true };

    const geometry = new THREE.BoxGeometry(data.width, data.height, data.depth);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: false,
      roughness: 0.4,
      metalness: 0.6,
    });

    const colors = new Float32Array(geometry.attributes.position.count * 3);
    const bottomColor = new THREE.Color(data.colorBottom);
    const topColor = new THREE.Color(data.colorTop);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + data.height / 2) / data.height;
      const color = bottomColor.clone().lerp(topColor, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    material.vertexColors = true;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = data.height / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { buildingId: data.id, isBuilding: true };
    group.add(mesh);

    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.position.y = data.height / 2;
    group.add(edges);

    const detailObjects: THREE.Object3D[] = [];
    for (const detail of data.details) {
      let detailMesh: THREE.Object3D;
      if (detail.type === 'antenna') {
        const antennaGeom = new THREE.CylinderGeometry(
          detail.width * 0.3,
          detail.width * 0.5,
          detail.height,
          8
        );
        const antennaMat = new THREE.MeshStandardMaterial({
          color: 0x888888,
          metalness: 0.8,
          roughness: 0.3,
        });
        detailMesh = new THREE.Mesh(antennaGeom, antennaMat);
      } else {
        const spireGeom = new THREE.ConeGeometry(detail.width, detail.height, 8);
        const spireMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(data.colorTop),
          metalness: 0.5,
          roughness: 0.4,
        });
        detailMesh = new THREE.Mesh(spireGeom, spireMat);
      }
      detailMesh.position.set(
        detail.position.x,
        data.height + detail.height / 2,
        detail.position.z
      );
      detailMesh.castShadow = true;
      detailMesh.userData = { buildingId: data.id, isBuilding: true };
      detailObjects.push(detailMesh);
      group.add(detailMesh);
    }

    const windows: THREE.Mesh[] = [];
    const windowRows = Math.floor(data.height / 8);
    const windowCols = Math.max(1, Math.floor(data.width / 6));
    const windowDepth = Math.max(1, Math.floor(data.depth / 6));
    const windowGeom = new THREE.PlaneGeometry(1.5, 2);
    const windowMat = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0,
    });

    for (let side = 0; side < 4; side++) {
      const cols = side % 2 === 0 ? windowCols : windowDepth;
      const dim = side % 2 === 0 ? data.width : data.depth;
      for (let r = 0; r < windowRows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.6) continue;
          const window = new THREE.Mesh(windowGeom, windowMat.clone());
          const offsetX = ((c + 0.5) / cols - 0.5) * dim;
          const offsetY = (r + 0.5) / windowRows * data.height + 3;

          if (side === 0) {
            window.position.set(offsetX, offsetY, data.depth / 2 + 0.01);
          } else if (side === 1) {
            window.position.set(data.width / 2 + 0.01, offsetY, offsetX);
            window.rotation.y = Math.PI / 2;
          } else if (side === 2) {
            window.position.set(-offsetX, offsetY, -data.depth / 2 - 0.01);
            window.rotation.y = Math.PI;
          } else {
            window.position.set(-data.width / 2 - 0.01, offsetY, -offsetX);
            window.rotation.y = -Math.PI / 2;
          }
          window.userData = { buildingId: data.id, isBuilding: true };
          windows.push(window);
          group.add(window);
        }
      }
    }

    return {
      group,
      mesh,
      edges,
      details: detailObjects,
      windows,
      data: { ...data },
      isSelected: false,
    };
  }

  public updateBuildingHeight(building: BuildingObject, newHeight: number): void {
    const oldHeight = building.data.height;
    building.data.height = newHeight;

    building.mesh.geometry.dispose();
    building.mesh.geometry = new THREE.BoxGeometry(building.data.width, newHeight, building.data.depth);
    building.mesh.position.y = newHeight / 2;

    const colors = new Float32Array(building.mesh.geometry.attributes.position.count * 3);
    const bottomColor = new THREE.Color(building.data.colorBottom);
    const topColor = new THREE.Color(building.data.colorTop);
    const positions = building.mesh.geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + newHeight / 2) / newHeight;
      const color = bottomColor.clone().lerp(topColor, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    building.mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    building.edges.geometry.dispose();
    building.edges.geometry = new THREE.EdgesGeometry(building.mesh.geometry);
    building.edges.position.y = newHeight / 2;

    for (let i = 0; i < building.details.length; i++) {
      const detail = building.details[i];
      const detailData = building.data.details[i];
      detail.position.y = newHeight + detailData.height / 2;
    }
  }

  public updateBuildingColor(building: BuildingObject, bottom?: string, top?: string): void {
    if (bottom) building.data.colorBottom = bottom;
    if (top) building.data.colorTop = top;

    const colors = new Float32Array(building.mesh.geometry.attributes.position.count * 3);
    const bottomColor = new THREE.Color(building.data.colorBottom);
    const topColor = new THREE.Color(building.data.colorTop);
    const positions = building.mesh.geometry.attributes.position;
    const height = building.data.height;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + height / 2) / height;
      const color = bottomColor.clone().lerp(topColor, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    building.mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    for (const detail of building.details) {
      if ((detail as THREE.Mesh).material) {
        const mat = (detail as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat.color && detail !== building.details[0]) {
          mat.color.set(building.data.colorTop);
        }
      }
    }
  }

  public selectBuilding(building: BuildingObject): void {
    if (this.selectedBuilding && this.selectedBuilding !== building) {
      this.deselectBuilding(this.selectedBuilding);
    }
    building.isSelected = true;
    this.selectedBuilding = building;
    (building.edges.material as THREE.LineBasicMaterial).opacity = 1.0;
    (building.edges.material as THREE.LineBasicMaterial).color.set(0xffffff);
    building.group.position.y = 0.5;
  }

  public deselectBuilding(building: BuildingObject): void {
    building.isSelected = false;
    if (this.selectedBuilding === building) {
      this.selectedBuilding = null;
    }
    (building.edges.material as THREE.LineBasicMaterial).opacity = 0.0;
    building.group.position.y = 0;
  }

  public getSelectedBuilding(): BuildingObject | null {
    return this.selectedBuilding;
  }

  public findBuildingById(id: number): BuildingObject | undefined {
    return this.buildings.find(b => b.data.id === id);
  }

  public getBuildings(): BuildingObject[] {
    return this.buildings;
  }

  public setNightMode(isNight: boolean): void {
    const opacity = isNight ? 0.9 : 0;
    for (const building of this.buildings) {
      for (const window of building.windows) {
        (window.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    }
  }

  public clearCity(): void {
    for (const building of this.buildings) {
      this.cityGroup.remove(building.group);
      building.mesh.geometry.dispose();
      (building.mesh.material as THREE.Material).dispose();
      building.edges.geometry.dispose();
      (building.edges.material as THREE.Material).dispose();
      for (const detail of building.details) {
        if ((detail as THREE.Mesh).geometry) {
          (detail as THREE.Mesh).geometry.dispose();
        }
        if ((detail as THREE.Mesh).material) {
          const mat = (detail as THREE.Mesh).material as THREE.Material;
          if (mat) mat.dispose();
        }
      }
      for (const win of building.windows) {
        win.geometry.dispose();
        (win.material as THREE.Material).dispose();
      }
    }
    this.buildings = [];
    this.selectedBuilding = null;
  }

  public exportConfig(): BuildingData[] {
    return this.buildings.map(b => ({ ...b.data, details: [...b.data.details] }));
  }

  public importConfig(data: BuildingData[], params: CityParams): void {
    this.clearCity();
    this.createBuildings(data);
  }

  public getCityGroup(): THREE.Group {
    return this.cityGroup;
  }

  public dispose(): void {
    this.clearCity();
    this.scene.remove(this.groundPlane);
    this.scene.remove(this.cityGroup);
    this.groundPlane.geometry.dispose();
    (this.groundPlane.material as THREE.Material).dispose();
  }
}
