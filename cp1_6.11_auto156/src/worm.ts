import * as THREE from 'three';

export interface WormInfo {
  height: number;
  tentacleBranches: number;
  symbiosisActivity: number;
  growthHistory: { timestamp: number; height: number }[];
}

interface GrowthRecord {
  timestamp: number;
  height: number;
}

export class Worm {
  public mesh: THREE.Group;
  public height: number;
  public baseHeight: number;
  public radius: number;
  public tentacleBranchCount: number;
  public symbiosisIndex: number;
  public growthHistory: GrowthRecord[];

  private tubeMesh: THREE.Mesh;
  private tentaclesGroup: THREE.Group;
  private colonyParticles: THREE.Points;
  private tentacleCurves: THREE.CatmullRomCurve3[];
  private tentacleMeshes: THREE.Mesh[];
  private swayPhase: number;
  private swayFrequency: number;
  private swayAmplitude: number;
  private currentSaturation: number;
  private colonyBrightness: number;
  private tubeMaterial: THREE.MeshStandardMaterial;
  private tentacleMaterials: THREE.MeshStandardMaterial[];
  private colonyMaterial: THREE.PointsMaterial;
  private baseColor: THREE.Color;
  private targetColor: THREE.Color;
  private time: number;
  private lastGrowthTime: number;
  private position: THREE.Vector3;

  constructor(position: THREE.Vector3, baseHeight: number, radius: number) {
    this.position = position.clone();
    this.baseHeight = baseHeight;
    this.height = baseHeight;
    this.radius = radius;
    this.tentacleBranchCount = 3 + Math.floor(Math.random() * 3);
    this.symbiosisIndex = 50;
    this.growthHistory = [{
      timestamp: Date.now(),
      height: baseHeight
    }];
    this.swayPhase = Math.random() * Math.PI * 2;
    this.swayFrequency = 0.5 + Math.random() * 0.5;
    this.swayAmplitude = 0.2;
    this.currentSaturation = 0.5;
    this.colonyBrightness = 0.5;
    this.tentacleCurves = [];
    this.tentacleMeshes = [];
    this.tentacleMaterials = [];
    this.baseColor = new THREE.Color(0xcccccc);
    this.targetColor = new THREE.Color(0xcc0000);
    this.time = 0;
    this.lastGrowthTime = Date.now();

    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    this.mesh.userData.worm = this;

    this.tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.colonyMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.createTube();
    this.createTentacles();
    this.createColonyParticles();
  }

  private createTube(): void {
    const geometry = new THREE.CylinderGeometry(
      this.radius * 0.8,
      this.radius,
      this.height,
      16,
      1,
      true
    );

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const noise = Math.sin(y * 5 + this.position.x * 10) * 0.05;
      positions.setX(i, positions.getX(i) + noise);
      positions.setZ(i, positions.getZ(i) + noise);
    }
    geometry.computeVertexNormals();

    this.tubeMesh = new THREE.Mesh(geometry, this.tubeMaterial);
    this.tubeMesh.position.y = this.height / 2;
    this.tubeMesh.castShadow = true;
    this.tubeMesh.receiveShadow = true;
    this.mesh.add(this.tubeMesh);
  }

  private createTentacles(): void {
    this.tentaclesGroup = new THREE.Group();
    this.tentaclesGroup.position.y = this.height;

    for (let i = 0; i < this.tentacleBranchCount; i++) {
      const angle = (i / this.tentacleBranchCount) * Math.PI * 2;
      const curvePoints: THREE.Vector3[] = [];
      const startRadius = this.radius * 0.5;
      const height = 1.0 + Math.random() * 0.5;
      const curveOffset = Math.random() * 0.5;

      for (let t = 0; t <= 1; t += 0.1) {
        const radius = startRadius + t * 0.3 + Math.sin(t * Math.PI) * 0.2;
        const x = Math.cos(angle + t * curveOffset) * radius;
        const y = t * height;
        const z = Math.sin(angle + t * curveOffset) * radius;
        curvePoints.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(curvePoints);
      this.tentacleCurves.push(curve);

      const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.03, 8, false);

      const color = new THREE.Color();
      color.lerpColors(
        new THREE.Color(0xff4444),
        new THREE.Color(0xff8888),
        Math.random()
      );

      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.5,
        metalness: 0.2,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });

      this.tentacleMaterials.push(material);

      const tentacleMesh = new THREE.Mesh(tubeGeometry, material);
      tentacleMesh.castShadow = true;
      this.tentacleMeshes.push(tentacleMesh);
      this.tentaclesGroup.add(tentacleMesh);
    }

    this.mesh.add(this.tentaclesGroup);
  }

  private createColonyParticles(): void {
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = this.radius * (0.9 + Math.random() * 0.2);
      const height = Math.random() * this.height * 0.8;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      const hue = 0.4 + Math.random() * 0.1;
      const color = new THREE.Color().setHSL(hue, 1, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.colonyMaterial = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.colonyParticles = new THREE.Points(geometry, this.colonyMaterial);
    this.mesh.add(this.colonyParticles);
  }

  public update(deltaTime: number, temperature: number, sulfide: number, currentSpeed: number): void {
    this.time += deltaTime;

    this.swayPhase += deltaTime * this.swayFrequency * (1 + currentSpeed * 0.5);
    this.updateTentacleSway();

    this.symbiosisIndex = Math.min(100, Math.max(0, sulfide * 50));
    this.updateColonyBrightness(sulfide);

    const growthRate = this.calculateGrowthRate(temperature, sulfide);
    if (this.time - this.lastGrowthTime > 10) {
      this.grow(growthRate);
      this.lastGrowthTime = this.time;
    }

    this.updateParticleAnimation(deltaTime);
  }

  private updateTentacleSway(): void {
    for (let i = 0; i < this.tentacleCurves.length; i++) {
      const curve = this.tentacleCurves[i];
      const points = curve.getPoints(50);
      const swayOffset = Math.sin(this.swayPhase + i * 0.5) * this.swayAmplitude;

      for (let j = 0; j < points.length; j++) {
        const t = j / (points.length - 1);
        const swayAmount = Math.sin(t * Math.PI) * swayOffset;
        const angle = (i / this.tentacleBranchCount) * Math.PI * 2;
        points[j].x += Math.cos(angle) * swayAmount;
        points[j].z += Math.sin(angle) * swayAmount;
      }

      const newCurve = new THREE.CatmullRomCurve3(points);
      const mesh = this.tentacleMeshes[i];
      const oldGeometry = mesh.geometry;
      mesh.geometry = new THREE.TubeGeometry(newCurve, 20, 0.03, 8, false);
      oldGeometry.dispose();
      this.tentacleCurves[i] = newCurve;
    }
  }

  private updateColonyBrightness(sulfide: number): void {
    const targetBrightness = 0.2 + sulfide * 0.4;
    this.colonyBrightness += (targetBrightness - this.colonyBrightness) * 0.05;
    this.colonyMaterial.opacity = this.colonyBrightness;
  }

  private calculateGrowthRate(temperature: number, sulfide: number): number {
    const tempFactor = Math.sin(((temperature - 2) / 13) * Math.PI);
    const sulfideFactor = Math.min(1, sulfide / 1.5);
    return 0.05 + tempFactor * sulfideFactor * 0.25;
  }

  public grow(amount: number): void {
    const maxHeight = this.baseHeight * 2;
    const newHeight = Math.min(maxHeight, this.height + amount);

    if (newHeight > this.height) {
      this.height = newHeight;
      this.updateTubeGeometry();
      this.tentaclesGroup.position.y = this.height;

      this.growthHistory.push({
        timestamp: Date.now(),
        height: this.height
      });

      if (this.growthHistory.length > 10) {
        this.growthHistory.shift();
      }
    }
  }

  private updateTubeGeometry(): void {
    const oldGeometry = this.tubeMesh.geometry;
    const newGeometry = new THREE.CylinderGeometry(
      this.radius * 0.8,
      this.radius,
      this.height,
      16,
      1,
      true
    );

    const positions = newGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const noise = Math.sin(y * 5 + this.position.x * 10) * 0.05;
      positions.setX(i, positions.getX(i) + noise);
      positions.setZ(i, positions.getZ(i) + noise);
    }
    newGeometry.computeVertexNormals();

    this.tubeMesh.geometry = newGeometry;
    this.tubeMesh.position.y = this.height / 2;
    oldGeometry.dispose();
  }

  private updateParticleAnimation(deltaTime: number): void {
    const positions = this.colonyParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length / 3; i++) {
      const idx = i * 3;
      positions[idx + 1] += deltaTime * 0.05;
      if (positions[idx + 1] > this.height) {
        positions[idx + 1] = 0;
      }
    }
    this.colonyParticles.geometry.attributes.position.needsUpdate = true;
  }

  public setColorSaturation(saturation: number): void {
    this.currentSaturation = saturation;
    const newColor = new THREE.Color();
    newColor.lerpColors(this.baseColor, this.targetColor, saturation);
    this.tubeMaterial.color.copy(newColor);

    const emissive = new THREE.Color(0xff0000);
    this.tubeMaterial.emissive.copy(emissive);
    this.tubeMaterial.emissiveIntensity = saturation * 0.2;
  }

  public setColonyBrightness(brightness: number): void {
    this.colonyBrightness = Math.max(0.2, Math.min(1.0, brightness));
    this.colonyMaterial.opacity = this.colonyBrightness;
  }

  public getInfo(): WormInfo {
    return {
      height: parseFloat(this.height.toFixed(2)),
      tentacleBranches: this.tentacleBranchCount,
      symbiosisActivity: Math.round(this.symbiosisIndex),
      growthHistory: [...this.growthHistory]
    };
  }

  public dispose(): void {
    this.tubeMesh.geometry.dispose();
    this.tubeMaterial.dispose();

    this.tentacleMeshes.forEach(mesh => {
      mesh.geometry.dispose();
    });
    this.tentacleMaterials.forEach(mat => {
      mat.dispose();
    });

    this.colonyParticles.geometry.dispose();
    this.colonyMaterial.dispose();
  }
}
