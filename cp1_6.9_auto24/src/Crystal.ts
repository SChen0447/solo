import * as THREE from 'three';

const COLD_COLOR_START = new THREE.Color('#4a00e0');
const COLD_COLOR_END = new THREE.Color('#8e2de2');
const WARM_COLOR_START = new THREE.Color('#ff6b6b');
const WARM_COLOR_END = new THREE.Color('#ffd93d');
const ENERGY_THRESHOLD = 100;
const SCALE_ANIMATION_SPEED = 8;
const PULSE_INTERVAL = 3;

export interface CrystalUpdateResult {
  collected: boolean;
  currentEnergy: number;
}

export class Crystal {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public size: number;
  public energy: number = 0;
  public collected: boolean = false;
  public colorProgress: number = 0;

  private material: THREE.MeshStandardMaterial;
  private pulsePhase: number;
  private pulseTimer: number;
  private scaleAnimation: number = 0;
  private baseScale: THREE.Vector3;
  private isPulsing: boolean = false;
  private collectAnimation: number = 0;
  private isCollecting: boolean = false;

  constructor(position: THREE.Vector3, size: number) {
    this.position = position.clone();
    this.size = size;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseTimer = Math.random() * PULSE_INTERVAL;
    this.baseScale = new THREE.Vector3(size, size, size);

    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    const octaGeo = new THREE.OctahedronGeometry(1, 0);
    const dodecaGeo = new THREE.DodecahedronGeometry(0.7, 0);

    this.material = new THREE.MeshStandardMaterial({
      color: COLD_COLOR_START.clone().lerp(COLD_COLOR_END, Math.random()),
      emissive: COLD_COLOR_START.clone().lerp(COLD_COLOR_END, Math.random()),
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 1.0
    });

    const octaMesh = new THREE.Mesh(octaGeo, this.material);
    const dodecaMesh = new THREE.Mesh(dodecaGeo, this.material);
    dodecaMesh.rotation.set(Math.PI / 4, Math.PI / 4, 0);

    this.mesh.add(octaMesh);
    this.mesh.add(dodecaMesh);
    this.mesh.scale.copy(this.baseScale);
  }

  public applySoundWave(intensity: number): void {
    if (this.collected || this.isCollecting) return;
    this.energy = Math.min(ENERGY_THRESHOLD, this.energy + intensity * 35);
    this.colorProgress = this.energy / ENERGY_THRESHOLD;
    this.scaleAnimation = 1.0;
    this.updateColor();
  }

  public triggerPulse(): void {
    if (this.collected || this.isCollecting) return;
    this.isPulsing = true;
    this.pulsePhase = 0;
  }

  public startCollection(): void {
    if (this.collected) return;
    this.isCollecting = true;
    this.collectAnimation = 0;
  }

  public getPosition(): THREE.Vector3 {
    return this.position;
  }

  public getColor(): THREE.Color {
    return this.material.color.clone();
  }

  public update(deltaTime: number): CrystalUpdateResult {
    this.pulseTimer += deltaTime;
    if (this.pulseTimer >= PULSE_INTERVAL && !this.collected && !this.isCollecting) {
      this.pulseTimer = 0;
      this.triggerPulse();
    }

    if (this.isPulsing) {
      this.pulsePhase += deltaTime * 3;
      const pulseAmount = Math.sin(this.pulsePhase) * 0.15;
      const brightness = 1.0 - Math.abs(Math.sin(this.pulsePhase)) * 0.3;
      this.material.emissiveIntensity = 0.6 * brightness;
      this.mesh.scale.set(
        this.baseScale.x * (1 + pulseAmount * 0.2),
        this.baseScale.y * (1 + pulseAmount),
        this.baseScale.z * (1 + pulseAmount * 0.2)
      );
      if (this.pulsePhase >= Math.PI) {
        this.isPulsing = false;
        this.material.emissiveIntensity = 0.6;
      }
    }

    if (this.scaleAnimation > 0 && !this.isPulsing && !this.isCollecting) {
      this.scaleAnimation = Math.max(0, this.scaleAnimation - deltaTime * SCALE_ANIMATION_SPEED);
      const stretch = this.scaleAnimation * 0.2;
      this.mesh.scale.set(
        this.baseScale.x * (1 - stretch * 0.3),
        this.baseScale.y * (1 + stretch),
        this.baseScale.z * (1 - stretch * 0.3)
      );
    }

    if (this.isCollecting) {
      this.collectAnimation = Math.min(1, this.collectAnimation + deltaTime * 3);
      const s = 1 - this.collectAnimation;
      this.mesh.scale.setScalar(s);
      this.material.opacity = s;
      if (this.collectAnimation >= 1) {
        this.collected = true;
        this.mesh.visible = false;
      }
    }

    return {
      collected: this.collected && this.isCollecting && this.collectAnimation >= 1,
      currentEnergy: this.energy
    };
  }

  private updateColor(): void {
    const t = this.colorProgress;
    const coldColor = COLD_COLOR_START.clone().lerp(COLD_COLOR_END, 0.5);
    const warmColor = WARM_COLOR_START.clone().lerp(WARM_COLOR_END, t);
    const finalColor = coldColor.clone().lerp(warmColor, t);
    this.material.color.copy(finalColor);
    this.material.emissive.copy(finalColor);
  }

  public dispose(): void {
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    this.material.dispose();
  }
}
