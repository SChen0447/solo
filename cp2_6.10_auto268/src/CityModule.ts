import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

export type BlinkMode = 'steady' | 'slow' | 'fast';

export interface BuildingData {
  id: string;
  position: { x: number; z: number };
  height: number;
  width: number;
  depth: number;
  colorTemperature: number;
  brightness: number;
  targetBrightness: number;
  blinkMode: BlinkMode;
  windowGrid: { cols: number; rows: number };
}

export interface TimePeriod {
  id: 'dusk' | 'night' | 'dawn';
  name: string;
  ambientBrightness: number;
  backgroundTint: THREE.Color;
  birdActivity: number;
  birdCountMultiplier: number;
  speedMultiplier: number;
}

function kelvinToRGB(kelvin: number): THREE.Color {
  const temp = kelvin / 100;
  let red: number, green: number, blue: number;

  if (temp <= 66) {
    red = 255;
    green = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
  } else {
    red = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    green = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
  }

  if (temp >= 66) {
    blue = 255;
  } else if (temp <= 19) {
    blue = 0;
  } else {
    blue = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  }

  return new THREE.Color(red / 255, green / 255, blue / 255);
}

export class CityModule {
  private scene: THREE.Scene;
  private buildings: Map<string, { data: BuildingData; mesh: THREE.Mesh; windows: THREE.Mesh; windowMaterials: THREE.MeshBasicMaterial[] }> = new Map();
  private buildingGroup: THREE.Group;
  private ground: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private ambientLight: THREE.AmbientLight;
  private currentPeriod: TimePeriod | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildingGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);
    this.raycaster = new THREE.Raycaster();

    this.createGround();
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.15);
    this.scene.add(this.ambientLight);
  }

  private createGround(): void {
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e17,
      roughness: 0.9,
      metalness: 0.1
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const gridHelper = new THREE.GridHelper(200, 40, 0x1a1e30, 0x10131f);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    this.scene.add(gridHelper);
  }

  generateBuildings(count: number = 25): void {
    const usedPositions: { x: number; z: number }[] = [];

    for (let i = 0; i < count; i++) {
      let x: number, z: number;
      let attempts = 0;
      do {
        x = (Math.random() - 0.5) * 120;
        z = (Math.random() - 0.5) * 120;
        attempts++;
      } while (
        attempts < 50 &&
        usedPositions.some(pos => Math.hypot(pos.x - x, pos.z - z) < 10)
      );

      usedPositions.push({ x, z });

      const width = 4 + Math.random() * 6;
      const depth = 4 + Math.random() * 6;
      const height = 15 + Math.random() * 50;
      const windowCols = Math.floor(width / 1.2);
      const windowRows = Math.floor(height / 2);

      const data: BuildingData = {
        id: uuidv4(),
        position: { x, z },
        height,
        width,
        depth,
        colorTemperature: 3500 + Math.random() * 2000,
        brightness: 0.5 + Math.random() * 0.3,
        targetBrightness: 0.5 + Math.random() * 0.3,
        blinkMode: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'slow' : 'fast') : 'steady',
        windowGrid: { cols: windowCols, rows: windowRows }
      };

      this.createBuilding(data);
    }
  }

  private createBuilding(data: BuildingData): void {
    const buildingGeo = new THREE.BoxGeometry(data.width, data.height, data.depth);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e2e,
      roughness: 0.7,
      metalness: 0.3
    });
    const buildingMesh = new THREE.Mesh(buildingGeo, buildingMat);
    buildingMesh.position.set(data.position.x, data.height / 2, data.position.z);
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;
    buildingMesh.userData.buildingId = data.id;

    const windowsGroup = new THREE.Group();
    const windowMaterials: THREE.MeshBasicMaterial[] = [];

    const baseColor = kelvinToRGB(data.colorTemperature);
    const windowWidth = data.width / data.windowGrid.cols * 0.7;
    const windowHeight = data.height / data.windowGrid.rows * 0.6;
    const windowGeo = new THREE.PlaneGeometry(windowWidth, windowHeight);

    for (let face = 0; face < 4; face++) {
      for (let row = 0; row < data.windowGrid.rows; row++) {
        for (let col = 0; col < data.windowGrid.cols; col++) {
          if (Math.random() > 0.3) {
            const brightness = data.brightness * (0.6 + Math.random() * 0.4);
            const winColor = baseColor.clone().multiplyScalar(brightness);
            const winMat = new THREE.MeshBasicMaterial({
              color: winColor,
              transparent: true,
              opacity: 0.9
            });
            windowMaterials.push(winMat);

            const windowMesh = new THREE.Mesh(windowGeo, winMat);
            const y = (row + 0.5) * (data.height / data.windowGrid.rows) - data.height / 2;
            const offset = (col + 0.5) * (data.width / data.windowGrid.cols) - data.width / 2;

            switch (face) {
              case 0:
                windowMesh.position.set(offset, y, data.depth / 2 + 0.01);
                break;
              case 1:
                windowMesh.position.set(offset, y, -data.depth / 2 - 0.01);
                windowMesh.rotation.y = Math.PI;
                break;
              case 2:
                windowMesh.position.set(data.width / 2 + 0.01, y, offset);
                windowMesh.rotation.y = Math.PI / 2;
                break;
              case 3:
                windowMesh.position.set(-data.width / 2 - 0.01, y, offset);
                windowMesh.rotation.y = -Math.PI / 2;
                break;
            }
            windowsGroup.add(windowMesh);
          }
        }
      }
    }

    const windowsMesh = windowsGroup as unknown as THREE.Mesh;
    buildingMesh.add(windowsGroup);
    this.buildingGroup.add(buildingMesh);
    this.buildings.set(data.id, { data, mesh: buildingMesh, windows: windowsMesh, windowMaterials });
  }

  setBuildingColorTemp(buildingId: string, kelvin: number): void {
    const building = this.buildings.get(buildingId);
    if (!building) return;

    building.data.colorTemperature = kelvin;
    const baseColor = kelvinToRGB(kelvin);

    building.windowMaterials.forEach(mat => {
      const brightness = building.data.brightness;
      const winColor = baseColor.clone().multiplyScalar(brightness * 0.8);
      mat.color.copy(winColor);
    });
  }

  setBuildingBlinkMode(buildingId: string, mode: BlinkMode): void {
    const building = this.buildings.get(buildingId);
    if (building) {
      building.data.blinkMode = mode;
    }
  }

  setBuildingBrightness(buildingId: string, brightness: number): void {
    const building = this.buildings.get(buildingId);
    if (!building) return;

    building.data.targetBrightness = Math.max(0, Math.min(1, brightness));
  }

  dimArea(minX: number, maxX: number, minZ: number, maxZ: number): void {
    this.buildings.forEach(({ data }) => {
      if (data.position.x >= minX && data.position.x <= maxX &&
          data.position.z >= minZ && data.position.z <= maxZ) {
        data.targetBrightness = Math.max(0.05, data.brightness * 0.3);
      }
    });
  }

  warmArea(minX: number, maxX: number, minZ: number, maxZ: number): void {
    this.buildings.forEach(({ data }) => {
      if (data.position.x >= minX && data.position.x <= maxX &&
          data.position.z >= minZ && data.position.z <= maxZ) {
        this.setBuildingColorTemp(data.id, Math.min(3000, data.colorTemperature));
        data.blinkMode = 'steady';
      }
    });
  }

  getBuildingByMesh(mesh: THREE.Object3D): BuildingData | null {
    let obj: THREE.Object3D | null = mesh;
    while (obj) {
      if (obj.userData.buildingId) {
        const building = this.buildings.get(obj.userData.buildingId);
        return building ? building.data : null;
      }
      obj = obj.parent;
    }
    return null;
  }

  getBuildingAtPosition(x: number, z: number): BuildingData | null {
    for (const [, { data }] of this.buildings) {
      if (Math.abs(data.position.x - x) < data.width / 2 &&
          Math.abs(data.position.z - z) < data.depth / 2) {
        return data;
      }
    }
    return null;
  }

  getAllBuildings(): BuildingData[] {
    return Array.from(this.buildings.values()).map(b => b.data);
  }

  getBuildingsInArea(minX: number, maxX: number, minZ: number, maxZ: number): BuildingData[] {
    return Array.from(this.buildings.values())
      .filter(({ data }) =>
        data.position.x >= minX && data.position.x <= maxX &&
        data.position.z >= minZ && data.position.z <= maxZ
      )
      .map(b => b.data);
  }

  getBuildingLightInfluence(x: number, y: number, z: number): number {
    let influence = 0;

    for (const [, { data }] of this.buildings) {
      const dx = x - data.position.x;
      const dz = z - data.position.z;
      const dy = y - data.height / 2;
      const distSq = dx * dx + dz * dz + dy * dy;
      const influenceRadius = data.height * 1.5 + 20;

      if (distSq < influenceRadius * influenceRadius) {
        const dist = Math.sqrt(distSq);
        let lightStrength = data.brightness;

        if (data.blinkMode === 'slow') lightStrength *= 1.5;
        if (data.blinkMode === 'fast') lightStrength *= 2.0;

        if (data.colorTemperature > 5000) lightStrength *= 1.3;
        if (data.colorTemperature < 3000) lightStrength *= 0.6;

        influence += lightStrength * (1 - dist / influenceRadius);
      }
    }

    return Math.min(1, influence);
  }

  highlightBuilding(buildingId: string | null): void {
    this.buildings.forEach(({ mesh, data }) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (data.id === buildingId) {
        mat.emissive = new THREE.Color(0x3344aa);
        mat.emissiveIntensity = 0.3;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }

  applyTimePeriod(period: TimePeriod): void {
    this.currentPeriod = period;
    this.ambientLight.intensity = 0.05 + period.ambientBrightness * 0.25;
    this.ambientLight.color.copy(period.backgroundTint).multiplyScalar(0.3);
  }

  update(time: number): void {
    const transitionSpeed = 0.05;

    this.buildings.forEach(({ data, windowMaterials }) => {
      data.brightness += (data.targetBrightness - data.brightness) * transitionSpeed;

      let blinkFactor = 1;
      if (data.blinkMode === 'slow') {
        blinkFactor = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * Math.PI));
      } else if (data.blinkMode === 'fast') {
        blinkFactor = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * Math.PI * 4));
      }

      const baseColor = kelvinToRGB(data.colorTemperature);
      windowMaterials.forEach(mat => {
        const finalColor = baseColor.clone().multiplyScalar(data.brightness * blinkFactor);
        mat.color.copy(finalColor);
        mat.opacity = 0.7 + data.brightness * 0.3 * blinkFactor;
      });
    });
  }
}
