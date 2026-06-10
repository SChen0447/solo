import * as THREE from 'three';

export interface TurbineParams {
  position: { x: number; y: number; z: number };
  towerHeight: number;
  bladeRadius: number;
  pitchAngle: number;
}

export class Turbine {
  public group: THREE.Group;
  public params: TurbineParams;
  public index: number;

  private towerMesh: THREE.Mesh | null = null;
  private bladesGroup: THREE.Group | null = null;
  private baseMarker: THREE.Mesh | null = null;
  private selectionRing: THREE.Mesh | null = null;
  private blades: THREE.Mesh[] = [];
  private rotationSpeed: number = 0;
  private currentWindSpeed: number = 10;
  private effectiveWindSpeed: number = 10;

  constructor(index: number, params: TurbineParams) {
    this.index = index;
    this.params = { ...params };
    this.group = new THREE.Group();
    this.group.userData.turbineIndex = index;
    this.build();
    this.updatePosition();
  }

  private build(): void {
    const towerGeometry = new THREE.CylinderGeometry(0.15, 0.15, this.params.towerHeight, 16);
    const towerMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.7,
      metalness: 0.1
    });
    this.towerMesh = new THREE.Mesh(towerGeometry, towerMaterial);
    this.towerMesh.position.y = this.params.towerHeight / 2;
    this.towerMesh.castShadow = true;
    this.group.add(this.towerMesh);

    this.bladesGroup = new THREE.Group();
    this.bladesGroup.position.y = this.params.towerHeight;
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      transparent: true,
      opacity: 0.9,
      roughness: 0.5,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 3; i++) {
      const bladeGeometry = new THREE.BoxGeometry(0.05, this.params.bladeRadius, 0.3);
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.position.y = this.params.bladeRadius / 2;
      blade.rotation.z = (i * Math.PI * 2) / 3;
      blade.castShadow = true;
      this.blades.push(blade);
      this.bladesGroup.add(blade);
    }

    this.group.add(this.bladesGroup);

    const baseGeometry = new THREE.RingGeometry(0.3, 0.5, 32);
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    this.baseMarker = new THREE.Mesh(baseGeometry, baseMaterial);
    this.baseMarker.rotation.x = -Math.PI / 2;
    this.baseMarker.position.y = 0.01;
    this.group.add(this.baseMarker);

    const ringGeometry = new THREE.RingGeometry(0.8, 1.0, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    this.selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.y = 0.02;
    this.group.add(this.selectionRing);
  }

  public setSelected(selected: boolean): void {
    if (this.selectionRing) {
      const material = this.selectionRing.material as THREE.MeshBasicMaterial;
      material.opacity = selected ? 0.8 : 0.0;
    }
  }

  public updateTowerHeight(height: number): void {
    this.params.towerHeight = height;
    if (this.towerMesh) {
      this.group.remove(this.towerMesh);
      this.towerMesh.geometry.dispose();
    }
    const towerGeometry = new THREE.CylinderGeometry(0.15, 0.15, height, 16);
    const towerMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.7,
      metalness: 0.1
    });
    this.towerMesh = new THREE.Mesh(towerGeometry, towerMaterial);
    this.towerMesh.position.y = height / 2;
    this.towerMesh.castShadow = true;
    this.group.add(this.towerMesh);

    if (this.bladesGroup) {
      this.bladesGroup.position.y = height;
    }
  }

  public updateBladeRadius(radius: number): void {
    this.params.bladeRadius = radius;
    if (this.bladesGroup) {
      this.blades.forEach((blade) => {
        this.bladesGroup!.remove(blade);
        blade.geometry.dispose();
      });
      this.blades = [];

      const bladeMaterial = new THREE.MeshStandardMaterial({
        color: 0xe0e0e0,
        transparent: true,
        opacity: 0.9,
        roughness: 0.5,
        metalness: 0.2,
        side: THREE.DoubleSide
      });

      for (let i = 0; i < 3; i++) {
        const bladeGeometry = new THREE.BoxGeometry(0.05, radius, 0.3);
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = radius / 2;
        blade.rotation.z = (i * Math.PI * 2) / 3;
        blade.castShadow = true;
        this.blades.push(blade);
        this.bladesGroup.add(blade);
      }
      this.updatePitchAngle(this.params.pitchAngle);
    }
  }

  public updatePitchAngle(angle: number): void {
    this.params.pitchAngle = angle;
    const radians = (angle * Math.PI) / 180;
    this.blades.forEach((blade) => {
      const baseRotation = blade.rotation.z;
      blade.rotation.set(0, 0, baseRotation);
      blade.rotateX(radians);
    });
  }

  public updatePosition(): void {
    this.group.position.set(
      this.params.position.x,
      this.params.position.y,
      this.params.position.z
    );
  }

  public setPosition(x: number, y: number, z: number): void {
    this.params.position = { x, y, z };
    this.updatePosition();
  }

  public setWindSpeed(baseSpeed: number, effectiveSpeed: number): void {
    this.currentWindSpeed = baseSpeed;
    this.effectiveWindSpeed = effectiveSpeed;
    this.rotationSpeed = effectiveSpeed * 0.15;
  }

  public animate(deltaTime: number): void {
    if (this.bladesGroup) {
      this.bladesGroup.rotation.y += this.rotationSpeed * deltaTime;
    }
  }

  public getPowerOutput(): number {
    const rho = 1.225;
    const A = Math.PI * this.params.bladeRadius * this.params.bladeRadius;
    const v = this.effectiveWindSpeed;
    const Cp = 0.4;
    const power = 0.5 * rho * A * v * v * v * Cp;
    return power / 1000;
  }

  public getPowerPercentage(): number {
    const rho = 1.225;
    const A = Math.PI * this.params.bladeRadius * this.params.bladeRadius;
    const vBase = this.currentWindSpeed;
    const vEff = this.effectiveWindSpeed;
    const Cp = 0.4;
    const maxPower = 0.5 * rho * A * vBase * vBase * vBase * Cp;
    const actualPower = 0.5 * rho * A * vEff * vEff * vEff * Cp;
    if (maxPower === 0) return 0;
    return (actualPower / maxPower) * 100;
  }

  public getEstimatedLifespan(): number {
    const baseLifespan = 25;
    const loadFactor = this.effectiveWindSpeed / this.currentWindSpeed;
    const degradation = 1 - (loadFactor - 1) * 0.1;
    return Math.max(10, Math.min(30, baseLifespan * degradation));
  }

  public getEffectiveWindSpeed(): number {
    return this.effectiveWindSpeed;
  }

  public dispose(): void {
    this.towerMesh?.geometry.dispose();
    (this.towerMesh?.material as THREE.Material)?.dispose();
    this.blades.forEach((blade) => {
      blade.geometry.dispose();
      (blade.material as THREE.Material).dispose();
    });
    this.baseMarker?.geometry.dispose();
    (this.baseMarker?.material as THREE.Material)?.dispose();
    this.selectionRing?.geometry.dispose();
    (this.selectionRing?.material as THREE.Material)?.dispose();
  }
}
