import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

const noise3D = createNoise3D();

const BOTTOM_COLOR = new THREE.Color(0xff8833);
const TOP_COLOR = new THREE.Color(0xffdd44);
const CONTAINER_HEIGHT = 5;
const CONTAINER_MIN_Y = -2.5;

export interface DropletOptions {
  position: THREE.Vector3;
  radius: number;
  riseSpeed: number;
  color?: THREE.Color;
}

export class Droplet {
  public mesh: THREE.Mesh;
  public geometry: THREE.SphereGeometry;
  public material: THREE.MeshPhysicalMaterial;

  public position: THREE.Vector3;
  public baseRadius: number;
  public targetRadius: number;
  public riseSpeed: number;
  public velocity: THREE.Vector3;
  public deformationAmount: number;
  public timeOffset: number;
  public id: number;

  public isMerging: boolean = false;
  public mergeProgress: number = 0;
  public mergeTarget: Droplet | null = null;
  public markedForRemoval: boolean = false;

  public isBreaking: boolean = false;
  public breakProgress: number = 0;

  private originalPositions: Float32Array;
  private static dropletIdCounter = 0;

  constructor(options: DropletOptions) {
    this.id = Droplet.dropletIdCounter++;
    this.position = options.position.clone();
    this.baseRadius = options.radius;
    this.targetRadius = options.radius;
    this.riseSpeed = options.riseSpeed;
    this.velocity = new THREE.Vector3(0, this.riseSpeed, 0);
    this.deformationAmount = 0.05 + Math.random() * 0.1;
    this.timeOffset = Math.random() * 1000;

    const segments = Math.max(16, Math.floor(24 * options.radius / 0.5));
    this.geometry = new THREE.SphereGeometry(options.radius, segments, segments);
    this.originalPositions = new Float32Array(this.geometry.attributes.position.array);

    this.material = new THREE.MeshPhysicalMaterial({
      color: options.color ? options.color.clone() : BOTTOM_COLOR.clone(),
      metalness: 0.1,
      roughness: 0.3,
      transmission: 0.3,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.4,
      emissive: new THREE.Color(0xff4400),
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.92
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
  }

  public update(deltaTime: number, globalTime: number, speedMultiplier: number): void {
    if (this.markedForRemoval) return;

    const currentTime = globalTime + this.timeOffset;

    this.baseRadius += (this.targetRadius - this.baseRadius) * Math.min(1, deltaTime * 4);

    if (this.isMerging && this.mergeTarget) {
      this.mergeProgress = Math.min(1, this.mergeProgress + deltaTime * 2);
      const t = this.mergeProgress;
      this.position.lerp(this.mergeTarget.position, t * 0.3);
      this.material.opacity = 0.92 - t * 0.3;
      if (t >= 1) {
        this.markedForRemoval = true;
      }
    } else {
      this.velocity.y = this.riseSpeed * speedMultiplier;
      this.position.y += this.velocity.y * deltaTime;
      this.position.x += this.velocity.x * deltaTime;
      this.position.z += this.velocity.z * deltaTime;

      const drag = 1 - Math.min(1, deltaTime * 1.5);
      this.velocity.x *= drag;
      this.velocity.z *= drag;

      if (this.position.y > CONTAINER_MIN_Y + CONTAINER_HEIGHT - 0.3) {
        this.velocity.y *= 0.95;
      }

      const wobble = noise3D(
        this.position.x * 0.5,
        this.position.z * 0.5,
        currentTime * 0.3
      );
      this.velocity.x += wobble * 0.3 * deltaTime;
      this.velocity.z += (1 - Math.abs(wobble)) * 0.2 * deltaTime * (Math.sin(currentTime * 0.7) > 0 ? 1 : -1);

      const maxHorizontalRadius = 1.7;
      const hDist = Math.sqrt(this.position.x ** 2 + this.position.z ** 2);
      if (hDist > maxHorizontalRadius) {
        const norm = maxHorizontalRadius / hDist;
        this.position.x *= norm;
        this.position.z *= norm;
        this.velocity.x *= -0.3;
        this.velocity.z *= -0.3;
      }

      this.position.y = Math.max(CONTAINER_MIN_Y + this.baseRadius * 0.5, this.position.y);
    }

    this.mesh.position.copy(this.position);

    this.updateDeformation(currentTime);
    this.updateColorAndOpacity();
  }

  private updateDeformation(time: number): void {
    const posAttr = this.geometry.attributes.position;
    const positions = posAttr.array as Float32Array;
    const orig = this.originalPositions;
    const amount = this.deformationAmount;
    const scale = 1.5 / this.baseRadius;
    const tScale = time * 1.2;

    for (let i = 0; i < positions.length; i += 3) {
      const ox = orig[i];
      const oy = orig[i + 1];
      const oz = orig[i + 2];

      const noiseVal = noise3D(
        ox * scale + tScale * 0.3,
        oy * scale + tScale * 0.5,
        oz * scale + tScale * 0.4
      );

      const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      const nx = ox / len;
      const ny = oy / len;
      const nz = oz / len;

      const displacement = noiseVal * amount * this.baseRadius;

      positions[i] = ox + nx * displacement;
      positions[i + 1] = oy + ny * displacement * 1.2;
      positions[i + 2] = oz + nz * displacement;
    }

    posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private updateColorAndOpacity(): void {
    const heightRatio = THREE.MathUtils.clamp(
      (this.position.y - CONTAINER_MIN_Y) / CONTAINER_HEIGHT,
      0,
      1
    );

    this.material.color.copy(BOTTOM_COLOR).lerp(TOP_COLOR, heightRatio);

    const emissiveIntensity = 0.1 + heightRatio * 0.25;
    this.material.emissiveIntensity = emissiveIntensity;

    this.material.opacity = 0.85 + heightRatio * 0.1;
  }

  public setColor(color: THREE.Color): void {
    this.material.color.copy(color);
  }

  public getColor(): THREE.Color {
    return this.material.color.clone();
  }

  public getRadius(): number {
    return this.baseRadius;
  }

  public setTargetRadius(r: number): void {
    this.targetRadius = r;
  }

  public startMerge(target: Droplet): void {
    this.isMerging = true;
    this.mergeTarget = target;
    this.mergeProgress = 0;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  public static resetIdCounter(): void {
    Droplet.dropletIdCounter = 0;
  }
}
