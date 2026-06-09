import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

interface WaxBlob {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  baseRadius: number;
  targetRadius: number;
  color: THREE.Color;
  phase: 'rising' | 'sinking' | 'resting';
  restTimer: number;
  riseSpeed: number;
  sinkSpeed: number;
  deformationOffset: number;
  scaleMultiplier: THREE.Vector3;
  id: number;
  merging: boolean;
  mergeProgress: number;
  mergeTarget: THREE.Vector3 | null;
}

interface GlowParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  baseScale: number;
}

const BLOB_COLORS = [
  new THREE.Color(0xff3300),
  new THREE.Color(0xaa00ff),
  new THREE.Color(0xff8800),
  new THREE.Color(0x00ffaa)
];

const BOTTLE_HEIGHT = 8;
const BOTTLE_RADIUS = 2;
const LIQUID_TOP = BOTTLE_HEIGHT * 0.42;
const LIQUID_BOTTOM = -BOTTLE_HEIGHT * 0.5;
const MERGE_THRESHOLD = 0.5;
const MAX_BLOBS = 50;

export class LavaLamp {
  container: THREE.Group;
  glass: THREE.Mesh;
  liquid: THREE.Mesh;
  cap: THREE.Mesh;
  blobs: WaxBlob[];
  glowParticles: GlowParticle[];
  temperature: number;
  tiltX: number;
  tiltZ: number;
  scene: THREE.Scene;
  private noise3D: (x: number, y: number, z: number) => number;
  private time: number;
  private blobIdCounter: number;
  private sharedGeometry: THREE.SphereGeometry;
  private liquidMaterial: THREE.MeshPhysicalMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.container = new THREE.Group();
    this.blobs = [];
    this.glowParticles = [];
    this.temperature = 50;
    this.tiltX = 0;
    this.tiltZ = 0;
    this.time = 0;
    this.blobIdCounter = 0;
    this.noise3D = createNoise3D();
    this.sharedGeometry = new THREE.SphereGeometry(1, 24, 16);

    this.glass = new THREE.Mesh();
    this.liquid = new THREE.Mesh();
    this.cap = new THREE.Mesh();
    this.liquidMaterial = new THREE.MeshPhysicalMaterial();

    this.createGlassBottle();
    this.createLiquid();
    this.createCap();
    this.createBlobs(25);

    scene.add(this.container);
  }

  private createGlassBottle(): void {
    const glassGroup = new THREE.Group();

    const cylinderGeo = new THREE.CylinderGeometry(
      BOTTLE_RADIUS, BOTTLE_RADIUS, BOTTLE_HEIGHT, 48, 1, true
    );
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.1,
      side: THREE.DoubleSide
    });

    const cylinder = new THREE.Mesh(cylinderGeo, glassMaterial);
    glassGroup.add(cylinder);

    const bottomGeo = new THREE.SphereGeometry(BOTTLE_RADIUS, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const bottom = new THREE.Mesh(bottomGeo, glassMaterial);
    bottom.position.y = -BOTTLE_HEIGHT / 2;
    bottom.rotation.x = Math.PI;
    glassGroup.add(bottom);

    const topGeo = new THREE.SphereGeometry(BOTTLE_RADIUS * 0.95, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const top = new THREE.Mesh(topGeo, glassMaterial);
    top.position.y = BOTTLE_HEIGHT / 2;
    top.scale.set(1, 0.4, 1);
    glassGroup.add(top);

    this.glass = cylinder;
    this.container.add(glassGroup);
  }

  private createLiquid(): void {
    const liquidHeight = LIQUID_TOP - LIQUID_BOTTOM;
    
    const liquidGeo = new THREE.CylinderGeometry(
      BOTTLE_RADIUS * 0.96, BOTTLE_RADIUS * 0.96, liquidHeight, 48
    );
    
    this.liquidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.15,
      roughness: 0.2,
      metalness: 0.0
    });

    this.liquid = new THREE.Mesh(liquidGeo, this.liquidMaterial);
    this.liquid.position.y = LIQUID_BOTTOM + liquidHeight / 2;
    this.container.add(this.liquid);

    const bottomGlowGeo = new THREE.CylinderGeometry(
      BOTTLE_RADIUS * 0.9, BOTTLE_RADIUS * 0.95, 0.5, 32
    );
    const bottomGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.25
    });
    const bottomGlow = new THREE.Mesh(bottomGlowGeo, bottomGlowMat);
    bottomGlow.position.y = LIQUID_BOTTOM + 0.25;
    this.container.add(bottomGlow);
  }

  private createCap(): void {
    const capGeo = new THREE.CylinderGeometry(
      BOTTLE_RADIUS * 1.05, BOTTLE_RADIUS * 1.1, 0.8, 48
    );
    const capMaterial = new THREE.MeshStandardMaterial({
      color: 0xaa8866,
      metalness: 0.8,
      roughness: 0.3
    });
    this.cap = new THREE.Mesh(capGeo, capMaterial);
    this.cap.position.y = BOTTLE_HEIGHT / 2 + 0.5;
    this.container.add(this.cap);

    const capRimGeo = new THREE.CylinderGeometry(
      BOTTLE_RADIUS * 1.12, BOTTLE_RADIUS * 1.15, 0.15, 48
    );
    const capRim = new THREE.Mesh(capRimGeo, capMaterial);
    capRim.position.y = BOTTLE_HEIGHT / 2 + 0.15;
    this.container.add(capRim);
  }

  private createBlobMaterial(color: THREE.Color): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.25,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.15
    });
  }

  private createBlobs(count: number): void {
    for (let i = 0; i < count; i++) {
      this.addBlob();
    }
  }

  private addBlob(
    position?: THREE.Vector3,
    radius?: number,
    color?: THREE.Color
  ): WaxBlob | null {
    if (this.blobs.length >= MAX_BLOBS) return null;

    const blobRadius = radius ?? (0.15 + Math.random() * 0.25);
    const blobColor = color ?? BLOB_COLORS[Math.floor(Math.random() * BLOB_COLORS.length)].clone();
    
    const material = this.createBlobMaterial(blobColor);
    const mesh = new THREE.Mesh(this.sharedGeometry, material);
    
    const pos = position ?? new THREE.Vector3(
      (Math.random() - 0.5) * BOTTLE_RADIUS * 1.2,
      LIQUID_BOTTOM + blobRadius + Math.random() * 0.5,
      (Math.random() - 0.5) * BOTTLE_RADIUS * 1.2
    );

    mesh.position.copy(pos);
    mesh.scale.setScalar(blobRadius);

    const blob: WaxBlob = {
      mesh,
      position: pos.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      radius: blobRadius,
      baseRadius: blobRadius,
      targetRadius: blobRadius,
      color: blobColor,
      phase: 'rising',
      restTimer: 0,
      riseSpeed: 0.3 + Math.random() * 0.5,
      sinkSpeed: 0.2 + Math.random() * 0.2,
      deformationOffset: Math.random() * Math.PI * 2,
      scaleMultiplier: new THREE.Vector3(1, 1, 1),
      id: this.blobIdCounter++,
      merging: false,
      mergeProgress: 0,
      mergeTarget: null
    };

    this.blobs.push(blob);
    this.container.add(mesh);
    return blob;
  }

  createGlowParticles(position: THREE.Vector3, color: THREE.Color, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 0.8 + Math.random() * 0.6;
      
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        (Math.random() - 0.3) * speed * 0.5,
        Math.sin(angle) * speed
      );

      const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const particleMesh = new THREE.Mesh(this.sharedGeometry, glowMat);
      particleMesh.position.copy(position);
      const baseScale = 0.1 + Math.random() * 0.1;
      particleMesh.scale.setScalar(baseScale);

      this.container.add(particleMesh);
      this.glowParticles.push({
        mesh: particleMesh,
        velocity,
        life: 1.0,
        maxLife: 1.0,
        baseScale
      });
    }
  }

  private getTemperatureMultiplier(): number {
    return 1.0 + (this.temperature / 100) * 1.0;
  }

  private updateLiquidColor(): void {
    const t = this.temperature / 100;
    const coldColor = new THREE.Color(0x550000);
    const hotColor = new THREE.Color(0xff4400);
    this.liquidMaterial.color.copy(coldColor).lerp(hotColor, t);
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
    this.updateLiquidColor();
    this.updateBlobs(deltaTime);
    this.updateGlowParticles(deltaTime);
    this.checkCollisions();
    this.updateContainerTilt(deltaTime);
  }

  private updateContainerTilt(deltaTime: number): void {
    const targetRotX = (this.tiltX * Math.PI) / 180;
    const targetRotZ = (this.tiltZ * Math.PI) / 180;
    const lerpFactor = 1 - Math.pow(0.001, deltaTime);
    
    this.container.rotation.x += (targetRotX - this.container.rotation.x) * lerpFactor;
    this.container.rotation.z += (targetRotZ - this.container.rotation.z) * lerpFactor;
  }

  private updateBlobs(deltaTime: number): void {
    const tempMult = this.getTemperatureMultiplier();
    const gravityDir = this.getGravityDirection();

    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const blob = this.blobs[i];

      if (blob.merging && blob.mergeTarget) {
        blob.mergeProgress += deltaTime * 2;
        const t = Math.min(blob.mergeProgress, 1);
        blob.position.lerp(blob.mergeTarget, t * 0.15);
        blob.radius += (blob.targetRadius - blob.radius) * t * 0.1;
        
        if (blob.mergeProgress >= 1) {
          this.removeBlob(i);
          continue;
        }
      } else {
        this.updateBlobPhysics(blob, deltaTime, tempMult, gravityDir);
      }

      this.updateBlobDeformation(blob, deltaTime);
      blob.mesh.position.copy(blob.position);
      blob.mesh.scale.set(
        blob.radius * blob.scaleMultiplier.x,
        blob.radius * blob.scaleMultiplier.y,
        blob.radius * blob.scaleMultiplier.z
      );
    }

    this.maintainBlobCount();
  }

  private getGravityDirection(): THREE.Vector3 {
    const rotX = (this.tiltX * Math.PI) / 180;
    const rotZ = (this.tiltZ * Math.PI) / 180;
    const gravity = new THREE.Vector3(0, -1, 0);
    
    const euler = new THREE.Euler(-rotX, 0, -rotZ);
    gravity.applyEuler(euler);
    
    return gravity.normalize();
  }

  private updateBlobPhysics(
    blob: WaxBlob,
    deltaTime: number,
    tempMult: number,
    gravityDir: THREE.Vector3
  ): void {
    const noiseScale = 0.8;
    const noiseX = this.noise3D(
      blob.position.x * noiseScale + this.time * 0.3,
      blob.position.y * noiseScale,
      blob.position.z * noiseScale + this.time * 0.2
    );
    const noiseZ = this.noise3D(
      blob.position.x * noiseScale + this.time * 0.2 + 100,
      blob.position.y * noiseScale + 100,
      blob.position.z * noiseScale + this.time * 0.3
    );

    if (blob.phase === 'rising') {
      const riseSpeed = blob.riseSpeed * tempMult;
      blob.velocity.y = riseSpeed;
      blob.velocity.x = noiseX * 0.4 + gravityDir.x * 0.6;
      blob.velocity.z = noiseZ * 0.4 + gravityDir.z * 0.6;

      if (blob.position.y >= LIQUID_TOP - blob.radius) {
        blob.phase = 'resting';
        blob.restTimer = 0.5 + Math.random() * 1.0;
        blob.velocity.set(0, 0, 0);
      }
    } else if (blob.phase === 'resting') {
      blob.restTimer -= deltaTime;
      blob.velocity.y *= 0.95;
      blob.velocity.x = noiseX * 0.2;
      blob.velocity.z = noiseZ * 0.2;

      if (blob.restTimer <= 0) {
        blob.phase = 'sinking';
      }
    } else if (blob.phase === 'sinking') {
      const sinkSpeed = blob.sinkSpeed;
      blob.velocity.y = -sinkSpeed;
      blob.velocity.x = noiseX * 0.3 + gravityDir.x * 0.4;
      blob.velocity.z = noiseZ * 0.3 + gravityDir.z * 0.4;

      if (blob.position.y <= LIQUID_BOTTOM + blob.radius + 0.2) {
        blob.phase = 'rising';
        blob.position.y = LIQUID_BOTTOM + blob.radius + 0.2;
      }
    }

    blob.position.addScaledVector(blob.velocity, deltaTime);
    this.constrainBlobToBottle(blob);
  }

  private constrainBlobToBottle(blob: WaxBlob): void {
    const maxDist = BOTTLE_RADIUS * 0.92 - blob.radius * 0.5;
    const distXZ = Math.sqrt(blob.position.x ** 2 + blob.position.z ** 2);

    if (distXZ > maxDist) {
      const scale = maxDist / distXZ;
      blob.position.x *= scale;
      blob.position.z *= scale;
      
      const normal = new THREE.Vector2(blob.position.x, blob.position.z).normalize();
      blob.velocity.x -= normal.x * 0.3;
      blob.velocity.z -= normal.y * 0.3;
    }

    blob.position.y = Math.max(
      LIQUID_BOTTOM + blob.radius,
      Math.min(LIQUID_TOP - blob.radius * 0.5, blob.position.y)
    );
  }

  private updateBlobDeformation(blob: WaxBlob, deltaTime: number): void {
    const phase = this.time * 1.5 + blob.deformationOffset;
    const noiseX = this.noise3D(phase, blob.id * 0.1, 0);
    const noiseY = this.noise3D(phase + 50, blob.id * 0.1 + 50, 0);
    const noiseZ = this.noise3D(phase + 100, blob.id * 0.1 + 100, 0);

    const baseScale = 0.9 + Math.abs(Math.sin(phase * 0.7)) * 0.3;
    
    blob.scaleMultiplier.x = baseScale + noiseX * 0.15;
    blob.scaleMultiplier.y = baseScale + noiseY * 0.2;
    blob.scaleMultiplier.z = baseScale + noiseZ * 0.15;

    const sizeDiff = blob.targetRadius - blob.radius;
    if (Math.abs(sizeDiff) > 0.001) {
      blob.radius += sizeDiff * deltaTime * 3;
    }
  }

  private updateGlowParticles(deltaTime: number): void {
    for (let i = this.glowParticles.length - 1; i >= 0; i--) {
      const particle = this.glowParticles[i];
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        this.container.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        this.glowParticles.splice(i, 1);
        continue;
      }

      const lifeRatio = particle.life / particle.maxLife;
      particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
      particle.velocity.multiplyScalar(0.97);
      
      const scale = particle.baseScale * (0.5 + lifeRatio * 1.5);
      particle.mesh.scale.setScalar(scale);
      
      const mat = particle.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = lifeRatio * 0.5;
    }
  }

  private checkCollisions(): void {
    const mergeChanceMult = 0.5 + (this.temperature / 100) * 0.5;

    for (let i = 0; i < this.blobs.length; i++) {
      const blobA = this.blobs[i];
      if (blobA.merging) continue;

      for (let j = i + 1; j < this.blobs.length; j++) {
        const blobB = this.blobs[j];
        if (blobB.merging) continue;

        const dist = blobA.position.distanceTo(blobB.position);
        const mergeDist = MERGE_THRESHOLD * (blobA.radius + blobB.radius) * 1.5;

        if (dist < mergeDist && Math.random() < 0.02 * mergeChanceMult) {
          this.mergeBlobs(i, j);
          break;
        }
      }
    }
  }

  private mergeBlobs(indexA: number, indexB: number): void {
    const blobA = this.blobs[indexA];
    const blobB = this.blobs[indexB];

    const newRadius = (blobA.radius + blobB.radius) * 0.7;
    const newColor = blobA.color.clone().lerp(blobB.color, 0.5);
    
    const midpoint = new THREE.Vector3()
      .addVectors(blobA.position, blobB.position)
      .multiplyScalar(0.5);

    this.createGlowParticles(midpoint, newColor, 10);

    blobA.targetRadius = newRadius;
    (blobA.mesh.material as THREE.MeshPhysicalMaterial).color.copy(newColor);
    (blobA.mesh.material as THREE.MeshPhysicalMaterial).emissive.copy(newColor);
    blobA.color.copy(newColor);

    blobB.mergeTarget = midpoint.clone();
    blobB.merging = true;
    blobB.mergeProgress = 0;
    blobB.targetRadius = 0;

    const totalArea = blobA.baseRadius ** 2 + blobB.baseRadius ** 2;
    blobA.baseRadius = Math.sqrt(totalArea * 0.7);
  }

  private removeBlob(index: number): void {
    const blob = this.blobs[index];
    this.container.remove(blob.mesh);
    (blob.mesh.material as THREE.Material).dispose();
    this.blobs.splice(index, 1);
  }

  private maintainBlobCount(): void {
    const minBlobs = 20;
    if (this.blobs.length < minBlobs) {
      for (let i = this.blobs.length; i < minBlobs; i++) {
        this.addBlob();
      }
    }
  }

  setTemperature(value: number): void {
    this.temperature = Math.max(0, Math.min(100, value));
  }

  setTilt(x: number, z: number): void {
    const maxTilt = 30;
    this.tiltX = Math.max(-maxTilt, Math.min(maxTilt, x));
    this.tiltZ = Math.max(-maxTilt, Math.min(maxTilt, z));
  }

  resetTilt(): void {
    this.tiltX = 0;
    this.tiltZ = 0;
  }

  getBlobCount(): number {
    return this.blobs.length;
  }
}
