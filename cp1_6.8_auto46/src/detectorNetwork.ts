import * as THREE from 'three';

export interface DetectorData {
  id: number;
  position: THREE.Vector3;
  hitCount: number;
  totalEnergy: number;
  lastEnergy: number;
  lastHitTime: number;
}

export interface HitEvent {
  detectorId: number;
  energy: number;
  time: number;
  position: THREE.Vector3;
}

export class Detector {
  public id: number;
  public group: THREE.Group;
  public data: DetectorData;
  public sensorMesh: THREE.Mesh;
  public flashBall: THREE.Mesh;
  public baseMesh: THREE.Mesh;
  public sensorMaterial: THREE.MeshStandardMaterial;
  public flashBallMaterial: THREE.MeshStandardMaterial;
  public sensorOriginalColor: THREE.Color;
  public flashBallOriginalScale: number;
  public isFlashing: boolean = false;
  public flashTime: number = 0;
  public flashDuration: number = 0.2;
  public expansionTime: number = 0;
  public expansionDuration: number = 0.4;
  public ringMesh: THREE.Mesh | null = null;
  public ringTime: number = 0;
  public ringDuration: number = 1.0;

  constructor(id: number, position: THREE.Vector3) {
    this.id = id;
    this.group = new THREE.Group();
    this.group.position.copy(position);

    this.data = {
      id,
      position: position.clone(),
      hitCount: 0,
      totalEnergy: 0,
      lastEnergy: 0,
      lastHitTime: 0,
    };

    const baseGeometry = new THREE.CylinderGeometry(1.5, 2, 3, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.3,
      emissive: 0x332200,
      emissiveIntensity: 0.3,
    });
    this.baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    this.baseMesh.position.y = 1.5;
    this.group.add(this.baseMesh);

    const sensorGeometry = new THREE.OctahedronGeometry(1.2, 0);
    this.sensorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x443300,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.95,
    });
    this.sensorMesh = new THREE.Mesh(sensorGeometry, this.sensorMaterial);
    this.sensorMesh.position.y = 4.5;
    this.group.add(this.sensorMesh);
    this.sensorOriginalColor = new THREE.Color(0x443300);

    const flashBallGeometry = new THREE.SphereGeometry(0.6, 16, 16);
    this.flashBallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.7,
      roughness: 0.4,
      emissive: 0x553300,
      emissiveIntensity: 0.5,
    });
    this.flashBall = new THREE.Mesh(flashBallGeometry, this.flashBallMaterial);
    this.flashBall.position.y = 6.5;
    this.group.add(this.flashBall);
    this.flashBallOriginalScale = 1.0;
  }

  public triggerHit(energy: number, time: number): void {
    this.data.hitCount++;
    this.data.totalEnergy += energy;
    this.data.lastEnergy = energy;
    this.data.lastHitTime = time;

    this.isFlashing = true;
    this.flashTime = this.flashDuration;
    this.expansionTime = this.expansionDuration;

    this.sensorMaterial.emissive.setHex(0x00ffff);
    this.sensorMaterial.emissiveIntensity = 2.0;

    this.flashBallMaterial.emissive.setHex(0xff6600);
    this.flashBallMaterial.color.setHex(0xff6600);

    this.createRing();
  }

  private createRing(): void {
    const ringGeometry = new THREE.RingGeometry(0.5, 1, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ringMesh.position.y = 0.1;
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.group.add(this.ringMesh);
    this.ringTime = this.ringDuration;
  }

  public update(deltaTime: number): void {
    if (this.flashTime > 0) {
      this.flashTime -= deltaTime;
      const progress = Math.max(0, this.flashTime / this.flashDuration);
      const intensity = 0.4 + progress * 1.6;
      this.sensorMaterial.emissiveIntensity = intensity;
      
      const r = Math.floor(0x44 + progress * 0x00);
      const g = Math.floor(0x33 + progress * 0xcc);
      const b = Math.floor(0x00 + progress * 0xff);
      this.sensorMaterial.emissive.setRGB(r / 255, g / 255, b / 255);

      if (this.flashTime <= 0) {
        this.sensorMaterial.emissive.copy(this.sensorOriginalColor);
        this.sensorMaterial.emissiveIntensity = 0.4;
      }
    }

    if (this.expansionTime > 0) {
      this.expansionTime -= deltaTime;
      const progress = 1 - this.expansionTime / this.expansionDuration;
      
      let scale: number;
      if (progress < 0.3) {
        const t = progress / 0.3;
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const easeOutBack = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        scale = 1 + easeOutBack * 0.5;
      } else {
        const t = (progress - 0.3) / 0.7;
        scale = 1.5 - 0.5 * t;
      }
      
      this.flashBall.scale.setScalar(scale);

      if (this.expansionTime <= 0) {
        this.flashBall.scale.setScalar(1.0);
        this.flashBallMaterial.emissive.setHex(0x553300);
        this.flashBallMaterial.color.setHex(0xffd700);
      }
    }

    if (this.ringMesh && this.ringTime > 0) {
      this.ringTime -= deltaTime;
      const progress = 1 - this.ringTime / this.ringDuration;
      
      const scale = 1 + progress * 4;
      this.ringMesh.scale.setScalar(scale);
      
      const opacity = 0.8 * (1 - progress);
      (this.ringMesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      if (this.ringTime <= 0) {
        this.group.remove(this.ringMesh);
        this.ringMesh = null;
      }
    }

    this.sensorMesh.rotation.y += deltaTime * 0.5;
  }

  public getSensorWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.sensorMesh.getWorldPosition(pos);
    return pos;
  }

  public getAverageEnergy(): number {
    if (this.data.hitCount === 0) return 0;
    return this.data.totalEnergy / this.data.hitCount;
  }
}

export class DetectorNetwork {
  private detectors: Detector[] = [];
  private scene: THREE.Scene;
  private earthRadius: number = 30;

  constructor(scene: THREE.Scene, earthRadius: number = 30) {
    this.scene = scene;
    this.earthRadius = earthRadius;
    this.createDetectors();
  }

  private createDetectors(): void {
    const numDetectors = 10;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < numDetectors; i++) {
      const y = 1 - (i / (numDetectors - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const normal = new THREE.Vector3(x, y, z).normalize();
      const position = normal.clone().multiplyScalar(this.earthRadius + 1.5);

      const detector = new Detector(i, position);
      
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normal
      );
      detector.group.quaternion.copy(quaternion);

      this.detectors.push(detector);
      this.scene.add(detector.group);
    }
  }

  public update(deltaTime: number): void {
    for (const detector of this.detectors) {
      detector.update(deltaTime);
    }
  }

  public getDetectors(): Detector[] {
    return this.detectors;
  }

  public getDetectorData(): DetectorData[] {
    return this.detectors.map(d => d.data);
  }

  public getDetectorById(id: number): Detector | undefined {
    return this.detectors.find(d => d.id === id);
  }

  public checkCollisions(particlePos: THREE.Vector3, energy: number, time: number): HitEvent | null {
    for (const detector of this.detectors) {
      const sensorPos = detector.getSensorWorldPosition();
      const distance = particlePos.distanceTo(sensorPos);
      
      if (distance < 5) {
        detector.triggerHit(energy, time);
        return {
          detectorId: detector.id,
          energy,
          time,
          position: sensorPos.clone(),
        };
      }
    }
    return null;
  }

  public getTotalHits(): number {
    return this.detectors.reduce((sum, d) => sum + d.data.hitCount, 0);
  }

  public getRecentHitTimes(count: number = 10): number[] {
    const allHits: number[] = [];
    for (const detector of this.detectors) {
      if (detector.data.lastHitTime > 0) {
        allHits.push(detector.data.lastHitTime);
      }
    }
    return allHits.sort((a, b) => b - a).slice(0, count);
  }

  public getDetectorMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const detector of this.detectors) {
      meshes.push(detector.sensorMesh, detector.flashBall, detector.baseMesh);
    }
    return meshes;
  }
}
