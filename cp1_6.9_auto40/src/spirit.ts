import * as THREE from 'three';
import { World } from './world';

interface SpiritInstance {
  id: number;
  bookId: number;
  group: THREE.Group;
  outerSphere: THREE.Mesh;
  innerFire: THREE.Mesh;
  auraParticles: THREE.Points;
  bone: THREE.Bone;
  skeleton: THREE.Skeleton;
  skinnedMesh: THREE.SkinnedMesh;
  phase: number;
  baseColor: THREE.Color;
  isEmerging: boolean;
  emergeProgress: number;
  targetPosition: THREE.Vector3;
  startPosition: THREE.Vector3;
  isMoving: boolean;
  moveProgress: number;
  flashTimer: number;
  isFlashing: boolean;
}

export class SpiritManager {
  private world: World;
  private spirits: Map<number, SpiritInstance> = new Map();
  private spiritPool: SpiritInstance[] = [];
  private readonly MAX_POOL_SIZE = 20;
  private readonly MAX_TOTAL_PARTICLES = 1500;
  private particlesPerSpirit = 75;

  private readonly PEDESTAL_CENTER = new THREE.Vector3(0, 1.1, 0);
  private readonly ORBIT_RADIUS = 1.8;

  constructor(world: World) {
    this.world = world;
  }

  private createSpiritMesh(bookId: number): SpiritInstance {
    const group = new THREE.Group();

    const sphereGeo = new THREE.SphereGeometry(0.15, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x8866ff,
      transparent: true,
      opacity: 0.35,
      emissive: 0x4422aa,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const outerSphere = new THREE.Mesh(sphereGeo, sphereMat);

    const fireGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const fireMat = new THREE.MeshBasicMaterial({
      color: 0xbb99ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const innerFire = new THREE.Mesh(fireGeo, fireMat);
    innerFire.position.y = 0.02;

    const particleCount = this.particlesPerSpirit;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const offsets = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.15 + Math.random() * 0.1;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const colorMix = Math.random();
      colors[i * 3] = 0.53 + colorMix * 0.2;
      colors[i * 3 + 1] = 0.4 + colorMix * 0.2;
      colors[i * 3 + 2] = 1.0;

      offsets[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.5 + Math.random() * 1.5;
    }

    const auraGeo = new THREE.BufferGeometry();
    auraGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    auraGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    auraGeo.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));
    auraGeo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

    const auraMat = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });
    const auraParticles = new THREE.Points(auraGeo, auraMat);

    const rootBone = new THREE.Bone();
    const midBone = new THREE.Bone();
    const tipBone = new THREE.Bone();
    rootBone.add(midBone);
    midBone.add(tipBone);
    midBone.position.y = 0.08;
    tipBone.position.y = 0.08;

    const skinGeo = new THREE.SphereGeometry(0.14, 16, 16, 1, 1, 0, Math.PI);
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x9988ff,
      transparent: true,
      opacity: 0.0,
      emissive: 0x6644cc,
      emissiveIntensity: 0.0,
      depthWrite: false
    });
    const skinnedMesh = new THREE.SkinnedMesh(skinGeo, skinMat);
    const skeleton = new THREE.Skeleton([rootBone, midBone, tipBone]);
    skinnedMesh.add(rootBone);
    skinnedMesh.bind(skeleton);

    group.add(outerSphere);
    group.add(innerFire);
    group.add(auraParticles);
    group.add(skinnedMesh);

    const hue = 0.72 + Math.random() * 0.08;
    const baseColor = new THREE.Color().setHSL(hue, 0.7, 0.7);

    return {
      id: -1,
      bookId,
      group,
      outerSphere,
      innerFire,
      auraParticles,
      bone: rootBone,
      skeleton,
      skinnedMesh,
      phase: Math.random() * Math.PI * 2,
      baseColor,
      isEmerging: true,
      emergeProgress: 0,
      targetPosition: new THREE.Vector3(),
      startPosition: new THREE.Vector3(),
      isMoving: false,
      moveProgress: 0,
      flashTimer: 0,
      isFlashing: false
    };
  }

  private recycleSpirit(spirit: SpiritInstance): void {
    spirit.isEmerging = true;
    spirit.emergeProgress = 0;
    spirit.isMoving = false;
    spirit.moveProgress = 0;
    spirit.flashTimer = 0;
    spirit.isFlashing = false;
    spirit.group.visible = false;
    this.world.scene.remove(spirit.group);

    if (this.spiritPool.length < this.MAX_POOL_SIZE) {
      this.spiritPool.push(spirit);
    }
  }

  private acquireSpirit(bookId: number): SpiritInstance {
    let spirit: SpiritInstance;
    if (this.spiritPool.length > 0) {
      spirit = this.spiritPool.pop()!;
      spirit.bookId = bookId;
    } else {
      spirit = this.createSpiritMesh(bookId);
    }
    spirit.group.visible = true;
    return spirit;
  }

  private calculateSpiritPosition(index: number): THREE.Vector3 {
    if (index === 0) {
      return this.PEDESTAL_CENTER.clone();
    }
    const effectiveIndex = index - 1;
    const ringIndex = Math.floor(effectiveIndex / 6);
    const posInRing = effectiveIndex % 6;
    const ringRadius = this.ORBIT_RADIUS + ringIndex * 0.5;
    const angleOffset = ringIndex % 2 === 0 ? 0 : Math.PI / 6;
    const angle = (posInRing / 6) * Math.PI * 2 + angleOffset;
    const heightOffset = Math.sin(posInRing * 1.2) * 0.15 + ringIndex * 0.08;
    return new THREE.Vector3(
      Math.cos(angle) * ringRadius,
      this.PEDESTAL_CENTER.y + heightOffset,
      Math.sin(angle) * ringRadius
    );
  }

  public createSpirit(bookId: number, spawnPosition: THREE.Vector3): void {
    if (this.spirits.has(bookId)) {
      this.flashSpirit(bookId);
      return;
    }

    if (this.spirits.size >= 20) return;

    const spirit = this.acquireSpirit(bookId);
    const id = Date.now() + Math.random();
    spirit.id = id;
    spirit.bookId = bookId;
    spirit.phase = Math.random() * Math.PI * 2;
    spirit.startPosition.copy(spawnPosition);
    spirit.startPosition.y += 0.2;
    spirit.group.position.copy(spirit.startPosition);
    spirit.isEmerging = true;
    spirit.emergeProgress = 0;
    spirit.isMoving = false;
    spirit.moveProgress = 0;

    const currentCount = this.spirits.size;
    spirit.targetPosition = this.calculateSpiritPosition(currentCount);

    (spirit.outerSphere.material as THREE.MeshStandardMaterial).opacity = 0;
    (spirit.outerSphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
    (spirit.innerFire.material as THREE.MeshBasicMaterial).opacity = 0;
    (spirit.auraParticles.material as THREE.PointsMaterial).opacity = 0;
    spirit.group.scale.setScalar(0.1);

    this.world.scene.add(spirit.group);
    this.spirits.set(bookId, spirit);
  }

  public flashSpirit(bookId: number): void {
    const spirit = this.spirits.get(bookId);
    if (spirit) {
      spirit.isFlashing = true;
      spirit.flashTimer = 0;
    }
  }

  public getSpiritCount(): number {
    return this.spirits.size;
  }

  public update(elapsed: number, delta: number): void {
    this.spirits.forEach((spirit) => {
      if (spirit.isEmerging) {
        spirit.emergeProgress += delta / 0.8;
        if (spirit.emergeProgress >= 1) {
          spirit.emergeProgress = 1;
          spirit.isEmerging = false;
          spirit.isMoving = true;
          spirit.moveProgress = 0;
        }
        const t = this.easeOutCubic(spirit.emergeProgress);
        spirit.group.scale.setScalar(0.1 + t * 0.9);
        (spirit.outerSphere.material as THREE.MeshStandardMaterial).opacity = t * 0.35;
        (spirit.outerSphere.material as THREE.MeshStandardMaterial).emissiveIntensity = t * 0.6;
        (spirit.innerFire.material as THREE.MeshBasicMaterial).opacity = t * 0.8;
        (spirit.auraParticles.material as THREE.PointsMaterial).opacity = t * 0.6;
      }

      if (spirit.isMoving) {
        spirit.moveProgress += delta / 1.2;
        if (spirit.moveProgress >= 1) {
          spirit.moveProgress = 1;
          spirit.isMoving = false;
        }
        const t = this.easeInOutCubic(spirit.moveProgress);
        spirit.group.position.lerpVectors(spirit.startPosition, spirit.targetPosition, t);
      }

      if (!spirit.isMoving && !spirit.isEmerging) {
        const floatY = Math.sin(elapsed * Math.PI + spirit.phase) * 0.1;
        spirit.group.position.y = spirit.targetPosition.y + floatY;
        spirit.group.rotation.y += 0.1 * delta;
      }

      spirit.bone.rotation.z = Math.sin(elapsed * 2 + spirit.phase) * 0.15;
      spirit.bone.children[0].rotation.x = Math.sin(elapsed * 3 + spirit.phase * 1.5) * 0.1;

      spirit.innerFire.rotation.y = elapsed * 2;
      spirit.innerFire.rotation.x = elapsed * 1.3;
      const fireScale = 1 + Math.sin(elapsed * 4 + spirit.phase) * 0.15;
      spirit.innerFire.scale.setScalar(fireScale);

      const positions = spirit.auraParticles.geometry.attributes.position as THREE.BufferAttribute;
      const offsets = spirit.auraParticles.geometry.attributes.offset as THREE.BufferAttribute;
      const speeds = spirit.auraParticles.geometry.attributes.speed as THREE.BufferAttribute;
      const particleCount = this.particlesPerSpirit;

      for (let i = 0; i < particleCount; i++) {
        const offset = offsets.getX(i);
        const speed = speeds.getX(i);
        const theta = elapsed * speed + offset;
        const phi = elapsed * speed * 0.7 + offset * 2;
        const r = 0.16 + Math.sin(elapsed * speed * 2 + offset) * 0.05;
        positions.setX(i, r * Math.sin(phi) * Math.cos(theta));
        positions.setY(i, r * Math.sin(phi) * Math.sin(theta));
        positions.setZ(i, r * Math.cos(phi));
      }
      positions.needsUpdate = true;

      if (spirit.isFlashing) {
        spirit.flashTimer += delta;
        const flashDuration = 0.3;
        if (spirit.flashTimer >= flashDuration) {
          spirit.isFlashing = false;
          spirit.flashTimer = 0;
          (spirit.outerSphere.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x4422aa);
          (spirit.outerSphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
          (spirit.innerFire.material as THREE.MeshBasicMaterial).color = new THREE.Color(0xbb99ff);
        } else {
          const t = spirit.flashTimer / flashDuration;
          const flashIntensity = Math.sin(t * Math.PI);
          (spirit.outerSphere.material as THREE.MeshStandardMaterial).emissive.lerpColors(
            new THREE.Color(0x4422aa),
            new THREE.Color(0xffffff),
            flashIntensity
          );
          (spirit.outerSphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + flashIntensity * 1.5;
          (spirit.innerFire.material as THREE.MeshBasicMaterial).color.lerpColors(
            new THREE.Color(0xbb99ff),
            new THREE.Color(0xffffff),
            flashIntensity
          );
        }
      } else {
        const colorPulse = (Math.sin(elapsed * 1.5 + spirit.phase) + 1) / 2;
        (spirit.outerSphere.material as THREE.MeshStandardMaterial).opacity = 0.3 + colorPulse * 0.1;
        (spirit.outerSphere.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + colorPulse * 0.3;
      }
    });
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
