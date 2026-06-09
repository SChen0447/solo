import * as THREE from 'three';

export interface CityParams {
  density: number;
  maxHeight: number;
  clustering: number;
  gridSize: number;
  gridSpacing: number;
}

interface BuildingData {
  group: THREE.Group;
  frontMesh: THREE.Mesh;
  sideMesh: THREE.Mesh;
  light: THREE.PointLight;
  targetHeight: number;
  currentHeight: number;
  animationStart: number;
  animationDelay: number;
  targetY: number;
}

const FACADE_COLORS = [0x4A90D9, 0xA0A0A0, 0x2C3E50, 0xCD7F32];
const GROWTH_DURATION = 1500;

export class CityGenerator {
  private scene: THREE.Scene;
  private cityGroup: THREE.Group;
  private buildings: BuildingData[] = [];
  private params: CityParams;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cityGroup = new THREE.Group();
    this.scene.add(this.cityGroup);

    this.params = {
      density: 60,
      maxHeight: 15,
      clustering: 0.3,
      gridSize: 20,
      gridSpacing: 6
    };
  }

  public setParams(params: Partial<CityParams>): void {
    Object.assign(this.params, params);
    this.generate(true);
  }

  public getParams(): CityParams {
    return { ...this.params };
  }

  public generate(animate: boolean = false): void {
    this.clearBuildings();

    const { density, maxHeight, clustering, gridSize, gridSpacing } = this.params;
    const halfGrid = gridSize / 2;
    const maxDist = Math.sqrt(2) * halfGrid * gridSpacing;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i - halfGrid) * gridSpacing;
        const z = (j - halfGrid) * gridSpacing;

        const dist = Math.sqrt(x * x + z * z);
        const distFactor = 1 - clustering * (dist / maxDist);
        const prob = (density / 100) * Math.max(0.1, distFactor);

        if (Math.random() > prob) continue;

        const height = 3 + Math.random() * (maxHeight - 3);
        const width = 1.5 + Math.random() * 1.5;
        const depth = 2 + Math.random() * 2;
        const colorIndex = Math.floor(Math.random() * FACADE_COLORS.length);
        const facadeColor = FACADE_COLORS[colorIndex];
        const lightIntensity = 0.5 + Math.random() * 0.5;
        const animDelay = (i + j) * 15 + Math.random() * 100;

        this.createBuilding(
          x, z, width, depth, height,
          facadeColor, lightIntensity,
          animate, animDelay
        );
      }
    }
  }

  private createBuilding(
    x: number, z: number,
    width: number, depth: number, height: number,
    facadeColor: number, lightIntensity: number,
    animate: boolean, animDelay: number
  ): void {
    const buildingGroup = new THREE.Group();

    const frontMaterial = new THREE.MeshStandardMaterial({
      color: facadeColor,
      transparent: true,
      opacity: 0.85,
      emissive: facadeColor,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.6
    });

    const sideColor = this.darkenColor(facadeColor, 0.4);
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: sideColor,
      transparent: false,
      roughness: 0.7,
      metalness: 0.2
    });

    const materials = [
      sideMaterial,
      sideMaterial,
      sideMaterial,
      sideMaterial,
      frontMaterial,
      sideMaterial
    ];

    const initialHeight = animate ? 0.01 : height;
    const geometry = new THREE.BoxGeometry(width, initialHeight, depth);

    const buildingMesh = new THREE.Mesh(geometry, materials);
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;

    const targetY = animate ? height / 2 : height / 2;
    buildingMesh.position.set(x, targetY, z);

    const lightColor = facadeColor;
    const pointLight = new THREE.PointLight(lightColor, lightIntensity, 10);
    pointLight.position.set(x, height + 0.5, z);
    pointLight.castShadow = false;

    buildingGroup.add(buildingMesh);
    buildingGroup.add(pointLight);
    this.cityGroup.add(buildingGroup);

    this.buildings.push({
      group: buildingGroup,
      frontMesh: buildingMesh,
      sideMesh: buildingMesh,
      light: pointLight,
      targetHeight: height,
      currentHeight: initialHeight,
      animationStart: performance.now(),
      animationDelay: animDelay,
      targetY: targetY
    });
  }

  private darkenColor(hex: number, factor: number): number {
    const r = Math.floor(((hex >> 16) & 255) * factor);
    const g = Math.floor(((hex >> 8) & 255) * factor);
    const b = Math.floor((hex & 255) * factor);
    return (r << 16) | (g << 8) | b;
  }

  private clearBuildings(): void {
    for (const b of this.buildings) {
      this.cityGroup.remove(b.group);
      (b.frontMesh.geometry as THREE.BufferGeometry).dispose();
      const materials = b.frontMesh.material as THREE.Material[];
      materials.forEach(m => m.dispose());
      b.light.dispose?.();
    }
    this.buildings = [];
  }

  public updateEmissiveIntensity(intensity: number): void {
    for (const b of this.buildings) {
      const materials = b.frontMesh.material as THREE.MeshStandardMaterial[];
      materials.forEach(m => {
        if (m.emissiveIntensity !== undefined) {
          m.emissiveIntensity = intensity;
        }
      });
    }
  }

  public animate(timestamp: number): void {
    let hasActive = false;

    for (const b of this.buildings) {
      const elapsed = timestamp - b.animationStart - b.animationDelay;
      if (elapsed < 0) {
        hasActive = true;
        continue;
      }
      if (elapsed >= GROWTH_DURATION) {
        continue;
      }

      hasActive = true;
      const progress = Math.min(elapsed / GROWTH_DURATION, 1);
      const easedProgress = this.easeWithBounce(progress);
      const newHeight = b.targetHeight * easedProgress;
      const clampedHeight = Math.max(newHeight, 0.01);

      if (Math.abs(clampedHeight - b.currentHeight) > 0.01) {
        b.currentHeight = clampedHeight;
        (b.frontMesh.geometry as THREE.BufferGeometry).dispose();
        const geo = b.frontMesh.geometry as THREE.BoxGeometry;
        const width = geo.parameters.width;
        const depth = geo.parameters.depth;
        b.frontMesh.geometry = new THREE.BoxGeometry(width, clampedHeight, depth);
        b.frontMesh.position.y = clampedHeight / 2;
        b.light.position.y = clampedHeight + 0.5;
      }
    }
  }

  private easeWithBounce(t: number): number {
    if (t < 0.8) {
      const p = t / 0.8;
      return 1 - Math.pow(1 - p, 3);
    } else {
      const p = (t - 0.8) / 0.2;
      return 1 + Math.sin(p * Math.PI) * 0.08 - p * 0.08;
    }
  }

  public isAnimating(timestamp: number): boolean {
    return this.buildings.some(b => {
      const elapsed = timestamp - b.animationStart - b.animationDelay;
      return elapsed < GROWTH_DURATION;
    });
  }

  public getBuildingCount(): number {
    return this.buildings.length;
  }
}
