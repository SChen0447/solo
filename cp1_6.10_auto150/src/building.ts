import * as THREE from 'three';

export type ColorScheme = 'gray' | 'warm' | 'cool';

export interface BuildingParams {
  growthSpeed: number;
  maxFloors: number;
  colorScheme: ColorScheme;
}

interface FloorData {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  targetScale: number;
  scaleStartTime: number;
  scaleDuration: number;
}

export class Building {
  public group: THREE.Group;
  public position: THREE.Vector3;
  public currentFloors: number = 0;
  public maxFloors: number;
  public floorHeight: number = 0.6;
  public isGrowing: boolean = false;
  public isCompleted: boolean = false;
  public isFading: boolean = false;

  private scene: THREE.Scene;
  private params: BuildingParams;
  private floors: FloorData[] = [];
  private haloParticles: THREE.Points | null = null;
  private haloMaterial: THREE.PointsMaterial | null = null;
  private lastFloorTime: number = 0;
  private floorWidth: number;
  private floorDepth: number;
  private haloFadeStartTime: number = 0;
  private fadeStartTime: number = 0;
  private allMaterials: THREE.Material[] = [];

  private static readonly colorSchemes: Record<ColorScheme, string[]> = {
    gray: ['#ecf0f1', '#ecf0f1', '#bdc3c7', '#bdc3c7', '#95a5a6', '#95a5a6'],
    warm: ['#f8c291', '#f6b93b', '#e67e22', '#e55039', '#d35400', '#c0392b'],
    cool: ['#74b9ff', '#0984e3', '#3498db', '#6c5ce7', '#9b59b6', '#8e44ad']
  };

  constructor(scene: THREE.Scene, position: THREE.Vector3, params: BuildingParams) {
    this.scene = scene;
    this.position = position.clone();
    this.params = { ...params };
    this.maxFloors = params.maxFloors;
    this.floorWidth = 1.2 + Math.random() * 0.6;
    this.floorDepth = 1.2 + Math.random() * 0.6;

    this.group = new THREE.Group();
    this.group.position.set(position.x, 0, position.z);
    this.scene.add(this.group);

    this.createHalo();
    this.startGrowing();
  }

  private getFloorColor(floorIndex: number): THREE.Color {
    const scheme = Building.colorSchemes[this.params.colorScheme];
    const idx = Math.min(floorIndex, scheme.length - 1);
    return new THREE.Color(scheme[idx]);
  }

  private createHalo(): void {
    const particleCount = 20;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.7;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.haloMaterial = new THREE.PointsMaterial({
      color: 0xf1c40f,
      size: 0.05,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });
    this.allMaterials.push(this.haloMaterial);

    this.haloParticles = new THREE.Points(geometry, this.haloMaterial);
    this.haloParticles.visible = true;
    this.group.add(this.haloParticles);
  }

  private updateHaloPosition(): void {
    if (this.haloParticles) {
      this.haloParticles.position.y = this.currentFloors * this.floorHeight + 0.1;
    }
  }

  private startGrowing(): void {
    this.isGrowing = true;
    this.lastFloorTime = performance.now();
    this.growFloor();
  }

  private growFloor(): void {
    if (this.currentFloors >= this.maxFloors || this.isFading) {
      return;
    }

    const floorIndex = this.currentFloors;
    const y = floorIndex * this.floorHeight + this.floorHeight / 2;

    const geometry = new THREE.BoxGeometry(this.floorWidth, this.floorHeight, this.floorDepth);
    const material = new THREE.MeshStandardMaterial({
      color: this.getFloorColor(floorIndex),
      roughness: 0.7,
      metalness: 0.15,
      transparent: true,
      opacity: 1
    });
    this.allMaterials.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, y, 0);
    mesh.scale.set(0.8, 0.8, 0.8);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 0.01,
      transparent: true,
      opacity: 1
    });
    this.allMaterials.push(edgeMaterial);

    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.copy(mesh.position);
    edges.scale.copy(mesh.scale);

    const floorData: FloorData = {
      mesh,
      edges,
      targetScale: 1.0,
      scaleStartTime: performance.now(),
      scaleDuration: 200
    };

    this.group.add(mesh);
    this.group.add(edges);
    this.floors.push(floorData);
    this.currentFloors++;
    this.updateHaloPosition();
  }

  public growOneFloorFast(): void {
    if (this.currentFloors >= this.maxFloors || this.isFading) {
      return;
    }
    this.isGrowing = true;

    const floorIndex = this.currentFloors;
    const y = floorIndex * this.floorHeight + this.floorHeight / 2;

    const geometry = new THREE.BoxGeometry(this.floorWidth, this.floorHeight, this.floorDepth);
    const material = new THREE.MeshStandardMaterial({
      color: this.getFloorColor(floorIndex),
      roughness: 0.7,
      metalness: 0.15,
      transparent: true,
      opacity: 1
    });
    this.allMaterials.push(material);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, y, 0);
    mesh.scale.set(0.9, 0.9, 0.9);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 0.01,
      transparent: true,
      opacity: 1
    });
    this.allMaterials.push(edgeMaterial);

    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.copy(mesh.position);
    edges.scale.copy(mesh.scale);

    const floorData: FloorData = {
      mesh,
      edges,
      targetScale: 1.0,
      scaleStartTime: performance.now(),
      scaleDuration: 100
    };

    this.group.add(mesh);
    this.group.add(edges);
    this.floors.push(floorData);
    this.currentFloors++;
    this.updateHaloPosition();

    if (this.currentFloors >= this.maxFloors) {
      this.completeGrowth();
    }
  }

  private completeGrowth(): void {
    this.isGrowing = false;
    this.isCompleted = true;
    this.haloFadeStartTime = performance.now();
  }

  public startFade(): void {
    if (this.isFading) return;
    this.isFading = true;
    this.isGrowing = false;
    this.fadeStartTime = performance.now();
  }

  public update(now: number): boolean {
    if (this.isFading) {
      const elapsed = (now - this.fadeStartTime) / 1000;
      const progress = Math.min(elapsed / 0.5, 1);
      const opacity = 1 - progress;

      for (const floor of this.floors) {
        (floor.mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
        (floor.edges.material as THREE.LineBasicMaterial).opacity = opacity;
      }
      if (this.haloMaterial) {
        this.haloMaterial.opacity = opacity * 0.9;
      }

      if (progress >= 1) {
        this.dispose();
        return false;
      }
      return true;
    }

    for (const floor of this.floors) {
      const scaleElapsed = now - floor.scaleStartTime;
      if (scaleElapsed < floor.scaleDuration) {
        const t = scaleElapsed / floor.scaleDuration;
        const eased = 1 - Math.pow(1 - t, 3);
        const scale = 0.8 + (floor.targetScale - 0.8) * eased;
        floor.mesh.scale.set(scale, scale, scale);
        floor.edges.scale.set(scale, scale, scale);
      } else {
        floor.mesh.scale.set(floor.targetScale, floor.targetScale, floor.targetScale);
        floor.edges.scale.set(floor.targetScale, floor.targetScale, floor.targetScale);
      }
    }

    if (this.isGrowing && !this.isCompleted) {
      const elapsed = now - this.lastFloorTime;
      if (elapsed >= this.params.growthSpeed * 1000 && this.currentFloors < this.maxFloors) {
        this.lastFloorTime = now;
        this.growFloor();
        if (this.currentFloors >= this.maxFloors) {
          this.completeGrowth();
        }
      }
    }

    if (this.isCompleted && this.haloMaterial && this.haloParticles) {
      const haloElapsed = (now - this.haloFadeStartTime) / 1000;
      const progress = Math.min(haloElapsed / 0.5, 1);
      this.haloMaterial.opacity = 0.9 * (1 - progress);
      if (progress >= 1) {
        this.haloParticles.visible = false;
      }
    }

    if (this.haloParticles && this.haloParticles.visible) {
      this.haloParticles.rotation.y += 0.02;
      const pos = this.haloParticles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        pos.setY(i, y + Math.sin(now * 0.003 + i) * 0.002);
      }
      pos.needsUpdate = true;
    }

    return true;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public isVisible(): boolean {
    return this.group.visible;
  }

  private dispose(): void {
    this.scene.remove(this.group);

    for (const floor of this.floors) {
      floor.mesh.geometry.dispose();
      (floor.mesh.material as THREE.Material).dispose();
      floor.edges.geometry.dispose();
      (floor.edges.material as THREE.Material).dispose();
    }

    if (this.haloParticles) {
      this.haloParticles.geometry.dispose();
      if (this.haloMaterial) {
        this.haloMaterial.dispose();
      }
    }

    for (const mat of this.allMaterials) {
      mat.dispose();
    }
    this.floors = [];
    this.allMaterials = [];
  }
}
