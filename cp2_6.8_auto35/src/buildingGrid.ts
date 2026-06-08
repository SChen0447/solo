import * as THREE from 'three';

interface Building {
  mesh: THREE.Mesh;
  baseHeight: number;
  targetHeight: number;
  currentHeight: number;
  gridX: number;
  gridZ: number;
  frequencyBand: number;
  baseColor: THREE.Color;
  windows: THREE.Mesh[];
  windowIntensities: number[];
  windowPhases: number[];
}

export type ColorMode = 'rainbow' | 'monochrome';

export class BuildingGrid {
  private scene: THREE.Scene;
  private buildings: Building[] = [];
  private buildingGroup: THREE.Group;

  private gridWidth: number = 16;
  private gridDepth: number = 10;
  private buildingSize: number = 1.2;
  private buildingGap: number = 0.3;

  private maxHeight: number = 12;
  private minHeight: number = 2;

  private riseDuration: number = 2.0;
  private riseProgress: number = 0;
  private hasRisen: boolean = false;

  private colorMode: ColorMode = 'rainbow';
  private monochromeColor: THREE.Color = new THREE.Color(0x4488ff);

  private waveSpeed: number = 1.5;
  private waveTime: number = 0;

  private targetColorMode: ColorMode = 'rainbow';
  private colorTransitionProgress: number = 1;
  private colorTransitionDuration: number = 0.5;

  private tempColor: THREE.Color = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildingGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);

    this.createBuildings();
  }

  private createBuildings(): void {
    const totalWidth = this.gridWidth * (this.buildingSize + this.buildingGap) - this.buildingGap;
    const totalDepth = this.gridDepth * (this.buildingSize + this.buildingGap) - this.buildingGap;

    const startX = -totalWidth / 2 + this.buildingSize / 2;
    const startZ = -totalDepth / 2 + this.buildingSize / 2;

    for (let x = 0; x < this.gridWidth; x++) {
      for (let z = 0; z < this.gridDepth; z++) {
        const posX = startX + x * (this.buildingSize + this.buildingGap);
        const posZ = startZ + z * (this.buildingSize + this.buildingGap);

        const baseHeight = this.minHeight + Math.random() * (this.maxHeight - this.minHeight) * 0.6;

        const geometry = new THREE.BoxGeometry(this.buildingSize, baseHeight, this.buildingSize);
        const material = new THREE.MeshStandardMaterial({
          color: 0x334466,
          metalness: 0.3,
          roughness: 0.7,
          emissive: 0x000000,
          emissiveIntensity: 0
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(posX, baseHeight / 2, posZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const frequencyBand = Math.floor((x / this.gridWidth) * 3);

        const baseColor = this.getBaseColorForBand(frequencyBand, x);

        const windows: THREE.Mesh[] = [];
        const windowIntensities: number[] = [];
        const windowPhases: number[] = [];

        const windowCount = 5 + Math.floor(Math.random() * 10);
        const windowSize = 0.15;

        for (let w = 0; w < windowCount; w++) {
          const windowGeo = new THREE.PlaneGeometry(windowSize, windowSize * 1.5);
          const windowMat = new THREE.MeshBasicMaterial({
            color: 0xffff88,
            transparent: true,
            opacity: 0.3 + Math.random() * 0.4
          });

          const windowMesh = new THREE.Mesh(windowGeo, windowMat);

          const side = Math.floor(Math.random() * 4);
          const winHeight = 0.5 + Math.random() * (baseHeight - 1);
          const winOffset = (Math.random() - 0.5) * (this.buildingSize - 0.3);

          let wx = 0, wy = 0, wz = 0;
          let rotY = 0;

          const halfSize = this.buildingSize / 2 + 0.001;

          switch (side) {
            case 0:
              wx = winOffset;
              wy = winHeight;
              wz = halfSize;
              rotY = 0;
              break;
            case 1:
              wx = winOffset;
              wy = winHeight;
              wz = -halfSize;
              rotY = Math.PI;
              break;
            case 2:
              wx = halfSize;
              wy = winHeight;
              wz = winOffset;
              rotY = Math.PI / 2;
              break;
            case 3:
              wx = -halfSize;
              wy = winHeight;
              wz = winOffset;
              rotY = -Math.PI / 2;
              break;
          }

          windowMesh.position.set(wx, wy - baseHeight / 2, wz);
          windowMesh.rotation.y = rotY;
          mesh.add(windowMesh);

          windows.push(windowMesh);
          windowIntensities.push(0.3 + Math.random() * 0.7);
          windowPhases.push(Math.random() * Math.PI * 2);
        }

        const building: Building = {
          mesh,
          baseHeight,
          targetHeight: baseHeight,
          currentHeight: 0,
          gridX: x,
          gridZ: z,
          frequencyBand,
          baseColor,
          windows,
          windowIntensities,
          windowPhases
        };

        this.buildings.push(building);
        this.buildingGroup.add(mesh);
      }
    }

    this.buildingGroup.position.y = 0.1;

    for (const building of this.buildings) {
      building.mesh.scale.y = 0.001;
      building.mesh.position.y = 0.001 / 2 + 0.1;
    }
  }

  private getBaseColorForBand(band: number, gridX: number): THREE.Color {
    const t = gridX / (this.gridWidth - 1);

    if (band === 0) {
      return new THREE.Color().setHSL(0.02 + t * 0.05, 0.8, 0.5);
    } else if (band === 1) {
      return new THREE.Color().setHSL(0.12 + t * 0.15, 0.7, 0.5);
    } else {
      return new THREE.Color().setHSL(0.55 + t * 0.2, 0.8, 0.55);
    }
  }

  public update(deltaTime: number, frequencyData: Uint8Array, isNight: boolean): void {
    if (!this.hasRisen) {
      this.riseProgress += deltaTime / this.riseDuration;
      if (this.riseProgress >= 1) {
        this.riseProgress = 1;
        this.hasRisen = true;
      }
    }

    if (this.colorMode !== this.targetColorMode) {
      this.colorTransitionProgress += deltaTime / this.colorTransitionDuration;
      if (this.colorTransitionProgress >= 1) {
        this.colorTransitionProgress = 1;
        this.colorMode = this.targetColorMode;
      }
    }

    this.waveTime += deltaTime * this.waveSpeed;

    const hasAudio = frequencyData.length > 0;
    const binCount = frequencyData.length;

    for (const building of this.buildings) {
      const x = building.gridX;
      const z = building.gridZ;

      let freqValue = 0;
      if (hasAudio) {
        const freqIndex = Math.floor((x / this.gridWidth) * (binCount * 0.6)) + Math.floor(z / this.gridDepth * 3);
        const safeIndex = Math.min(freqIndex, binCount - 1);
        freqValue = frequencyData[safeIndex] / 255;
      }

      const waveOffset = Math.sin(this.waveTime + x * 0.3 + z * 0.2) * 0.15;
      const baseScale = hasAudio ? (0.3 + freqValue * 0.7) : 0.6;
      const musicScale = baseScale + waveOffset * 0.3;

      const targetHeight = building.baseHeight * musicScale * this.riseProgress;
      building.targetHeight = targetHeight;
      building.currentHeight += (building.targetHeight - building.currentHeight) * 0.15;

      if (building.currentHeight < 0.01) building.currentHeight = 0.01;

      const scaleY = building.currentHeight / building.baseHeight;
      building.mesh.scale.y = scaleY;
      building.mesh.position.y = building.currentHeight / 2 + 0.1;

      const brightness = 0.4 + freqValue * 0.6;
      this.applyBuildingColor(building, brightness, isNight);

      const windowBrightness = isNight ? (0.4 + freqValue * 0.6) : (0.2 + freqValue * 0.3);
      for (let i = 0; i < building.windows.length; i++) {
        const window = building.windows[i];
        const intensity = building.windowIntensities[i];
        const phase = building.windowPhases[i];
        const flicker = 0.7 + 0.3 * Math.sin(this.waveTime * 2 + phase + i * 0.5);

        const mat = window.material as THREE.MeshBasicMaterial;
        mat.opacity = windowBrightness * intensity * flicker;
      }
    }
  }

  private applyBuildingColor(building: Building, brightness: number, isNight: boolean): void {
    const material = building.mesh.material as THREE.MeshStandardMaterial;

    let baseColor: THREE.Color;
    if (this.colorMode === 'rainbow') {
      baseColor = building.baseColor.clone();
    } else {
      baseColor = this.monochromeColor.clone();
    }

    if (this.colorTransitionProgress < 1) {
      const fromColor = this.colorMode === 'rainbow' ? building.baseColor : this.monochromeColor;
      const toColor = this.targetColorMode === 'rainbow' ? building.baseColor : this.monochromeColor;
      baseColor = fromColor.clone().lerp(toColor, this.colorTransitionProgress);
    }

    const dayColor = baseColor.clone().multiplyScalar(brightness * 0.9 + 0.1);
    
    const nightBaseColor = baseColor.clone().multiplyScalar(0.3);
    const emissiveColor = baseColor.clone().multiplyScalar(brightness * 0.5);

    if (isNight) {
      material.color.copy(nightBaseColor);
      material.emissive.copy(emissiveColor);
      material.emissiveIntensity = 0.3 + brightness * 0.5;
    } else {
      material.color.copy(dayColor);
      material.emissive.set(0x000000);
      material.emissiveIntensity = 0;
    }
  }

  public setColorMode(mode: ColorMode): void {
    if (this.targetColorMode === mode) return;
    this.targetColorMode = mode;
    this.colorTransitionProgress = 0;
  }

  public getColorMode(): ColorMode {
    return this.targetColorMode;
  }

  public resetRiseAnimation(): void {
    this.riseProgress = 0;
    this.hasRisen = false;
  }

  public dispose(): void {
    for (const building of this.buildings) {
      building.mesh.geometry.dispose();
      (building.mesh.material as THREE.Material).dispose();
      for (const window of building.windows) {
        window.geometry.dispose();
        (window.material as THREE.Material).dispose();
      }
    }
    this.buildings = [];
    this.scene.remove(this.buildingGroup);
  }

  public getBuildingCount(): number {
    return this.buildings.length;
  }
}
