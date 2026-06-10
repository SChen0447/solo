import * as THREE from 'three';

const PARTICLE_COUNT = 3000;
const SPHERE_RADIUS_MAX = 10;
const SPHERE_RADIUS_MIN = 5;
const BREATHING_PERIOD = 5;
const INITIAL_SPEED = 0.2;

const COLOR_PALETTE = [
  0xff3366,
  0xff9933,
  0x33cc66,
  0x3399ff,
  0x9933ff
];

interface ParticleData {
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  baseSize: number;
  colorIndex: number;
  baseHue: number;
}

export interface MouseInteractionParams {
  cameraDistance: number;
  rotationAngle: number;
  rotationAxis: THREE.Vector3;
  isDragging: boolean;
}

export class DataStream {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particleData: ParticleData[] = [];
  private time: number = 0;
  private breathingPhase: number = 0;
  private currentRadius: number = (SPHERE_RADIUS_MAX + SPHERE_RADIUS_MIN) / 2;
  private currentBrightness: number = 0.8;
  private targetRotationAngle: number = 0;
  private currentRotationAngle: number = 0;
  private rotationSmoothTime: number = 2;
  private cameraDistance: number = 15;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  private workingColor = new THREE.Color();
  private workingVector = new THREE.Vector3();
  private workingVector2 = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);

    this.initializeParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  private initializeParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = Math.random() * SPHERE_RADIUS_MAX;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const basePos = new THREE.Vector3(x, y, z);
      const velocity = basePos.clone().normalize().multiplyScalar(INITIAL_SPEED);

      const baseSize = 2 + Math.random() * 4;
      const colorIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
      const color = new THREE.Color(COLOR_PALETTE[colorIndex]);
      const baseHue = { h: 0, s: 0, l: 0 };
      color.getHSL(baseHue);

      this.particleData.push({
        basePosition: basePos,
        velocity,
        baseSize,
        colorIndex,
        baseHue: baseHue.h
      });

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = baseSize;
    }
  }

  public getBreathingState(): 'expanding' | 'contracting' {
    return this.breathingPhase < Math.PI ? 'expanding' : 'contracting';
  }

  public getCurrentRadius(): number {
    return this.currentRadius;
  }

  public getParticleCount(): number {
    return PARTICLE_COUNT;
  }

  public getMaxRadius(): number {
    return SPHERE_RADIUS_MAX;
  }

  public getMinRadius(): number {
    return SPHERE_RADIUS_MIN;
  }

  public update(deltaTime: number, params: MouseInteractionParams): void {
    this.time += deltaTime;
    this.cameraDistance = params.cameraDistance;

    this.breathingPhase = (this.time % BREATHING_PERIOD) / BREATHING_PERIOD * Math.PI * 2;
    const breathFactor = (Math.sin(this.breathingPhase - Math.PI / 2) + 1) / 2;
    this.currentRadius = SPHERE_RADIUS_MIN + breathFactor * (SPHERE_RADIUS_MAX - SPHERE_RADIUS_MIN);
    this.currentBrightness = 0.6 + breathFactor * 0.4;

    if (params.isDragging) {
      this.targetRotationAngle = Math.min(params.rotationAngle, THREE.MathUtils.degToRad(30));
    } else {
      this.targetRotationAngle = 0;
    }

    const smoothFactor = deltaTime / this.rotationSmoothTime;
    this.currentRotationAngle += (this.targetRotationAngle - this.currentRotationAngle) * Math.min(smoothFactor * 5, 1);

    const distanceFactor = THREE.MathUtils.clamp(
      (30 - this.cameraDistance) / (30 - 5),
      0,
      1
    );
    const sizeMultiplier = 2 + distanceFactor * 10;
    const speedMultiplier = 0.1 + (1 - distanceFactor) * 0.9;
    const opacityMultiplier = 0.3 + distanceFactor * 0.7;

    this.material.opacity = opacityMultiplier;

    const contracting = this.breathingPhase >= Math.PI;
    const shrinkFactor = contracting ? 0.8 : 1.0;

    const hueShift = THREE.MathUtils.radToDeg(this.currentRotationAngle) * 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const data = this.particleData[i];
      const i3 = i * 3;

      this.workingVector.set(
        this.positions[i3],
        this.positions[i3 + 1],
        this.positions[i3 + 2]
      );

      const speed = INITIAL_SPEED * speedMultiplier;
      data.velocity.copy(this.workingVector).normalize();

      if (this.currentRotationAngle > 0.001 && params.rotationAxis.lengthSq() > 0) {
        this.workingVector2.copy(data.velocity);
        this.workingVector2.applyAxisAngle(params.rotationAxis, this.currentRotationAngle);
        data.velocity.lerp(this.workingVector2, 0.5);
      }

      data.velocity.normalize().multiplyScalar(speed);

      this.workingVector.addScaledVector(data.velocity, deltaTime);

      const dist = this.workingVector.length();
      const scaledRadius = this.currentRadius;
      if (dist > scaledRadius) {
        const resetRadius = Math.random() * 0.5 + 0.1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        this.workingVector.set(
          resetRadius * Math.sin(phi) * Math.cos(theta),
          resetRadius * Math.sin(phi) * Math.sin(theta),
          resetRadius * Math.cos(phi)
        );
      }

      this.positions[i3] = this.workingVector.x;
      this.positions[i3 + 1] = this.workingVector.y;
      this.positions[i3 + 2] = this.workingVector.z;

      const finalHue = (data.baseHue + hueShift / 360) % 1;
      this.workingColor.setHSL(finalHue, 0.8, this.currentBrightness * 0.15);

      this.colors[i3] = this.workingColor.r;
      this.colors[i3 + 1] = this.workingColor.g;
      this.colors[i3 + 2] = this.workingColor.b;

      this.sizes[i] = data.baseSize * sizeMultiplier * shrinkFactor * 0.12;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.particles);
  }
}
