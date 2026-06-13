import * as THREE from 'three';
import { GardenGenerator, CrystalData } from './GardenGenerator';

export class ParticleSystem {
  private scene: THREE.Scene;
  private gardenGenerator: GardenGenerator;
  public orbitParticles!: THREE.Points;
  public orbitParticleCount: number = 500;
  public orbitRadiusA: number = 350;
  public orbitRadiusB: number = 200;
  public orbitTilt: number = 20 * Math.PI / 180;
  public baseOrbitSpeed: number = 0.08;
  public orbitSpeedMultiplier: number = 1;
  public speedBoostEndTime: number = 0;
  public waveEndTime: number = 0;
  public waveStartTime: number = 0;
  public waveAmplitude: number = 15;

  public sparkleParticles: Map<number, THREE.Mesh> = new Map();
  public rippleParticles: Map<number, {
    mesh: THREE.Mesh;
    startTime: number;
    duration: number;
    center: THREE.Vector3;
    initialRadius: number;
    finalRadius: number;
    angle: number;
  }> = new Map();
  public decayParticles: Map<number, {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    startTime: number;
    duration: number;
  }> = new Map();

  private sparkleIdCounter: number = 0;
  private rippleIdCounter: number = 0;
  private decayIdCounter: number = 0;
  private totalParticleCount: number = 0;
  private readonly MAX_PARTICLES: number = 6000;

  private orbitGeometry!: THREE.BufferGeometry;
  private orbitAngles: Float32Array;
  private orbitPhases: Float32Array;
  private orbitOffsets: Float32Array;

  private sparkleTexture: THREE.Texture | null = null;

  private colorA = new THREE.Color('#ff9a9e');
  private colorB = new THREE.Color('#fecfef');
  private colorC = new THREE.Color('#a1c4fd');

  constructor(scene: THREE.Scene, gardenGenerator: GardenGenerator) {
    this.scene = scene;
    this.gardenGenerator = gardenGenerator;
    this.orbitAngles = new Float32Array(this.orbitParticleCount);
    this.orbitPhases = new Float32Array(this.orbitParticleCount);
    this.orbitOffsets = new Float32Array(this.orbitParticleCount * 3);
    this.createSparkleTexture();
    this.initOrbitParticles();
  }

  private createSparkleTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(200, 200, 255, 0.6)');
    gradient.addColorStop(0.7, 'rgba(150, 150, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(100, 100, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    this.sparkleTexture = new THREE.CanvasTexture(canvas);
  }

  private initOrbitParticles(): void {
    this.orbitGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.orbitParticleCount * 3);
    const colors = new Float32Array(this.orbitParticleCount * 3);
    const sizes = new Float32Array(this.orbitParticleCount);

    for (let i = 0; i < this.orbitParticleCount; i++) {
      this.orbitAngles[i] = Math.random() * Math.PI * 2;
      this.orbitPhases[i] = Math.random() * Math.PI * 2;
      this.updateOrbitParticlePosition(i, positions, 0);
      this.updateOrbitParticleColor(i, colors);
      sizes[i] = 2 + Math.random() * 3;
    }

    this.orbitGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.orbitGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.orbitGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const vertexShader = `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist);
        alpha = pow(alpha, 1.5);
        gl_FragColor = vec4(vColor * 1.2, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.orbitParticles = new THREE.Points(this.orbitGeometry, material);
    this.scene.add(this.orbitParticles);
  }

  private updateOrbitParticlePosition(i: number, positions: Float32Array, time: number, waveOffset: number = 0): void {
    const angle = this.orbitAngles[i];
    const x = Math.cos(angle) * this.orbitRadiusA;
    const z = Math.sin(angle) * this.orbitRadiusB;

    const cosTilt = Math.cos(this.orbitTilt);
    const sinTilt = Math.sin(this.orbitTilt);
    const yTilted = z * sinTilt;
    const zTilted = z * cosTilt;

    let yOffset = 0;
    if (waveOffset > 0) {
      const wavePhase = Math.sin(this.orbitPhases[i] + angle * 3 + time * 3) * waveOffset;
      const nx = -Math.sin(angle);
      const nz = Math.cos(angle);
      positions[i * 3] = x + nx * wavePhase * 0.3;
      positions[i * 3 + 1] = yTilted + wavePhase;
      positions[i * 3 + 2] = zTilted + nz * wavePhase * 0.3;
      return;
    }

    const floatY = Math.sin(time * 0.5 + this.orbitPhases[i]) * 2;
    positions[i * 3] = x;
    positions[i * 3 + 1] = yTilted + floatY;
    positions[i * 3 + 2] = zTilted;
  }

  private updateOrbitParticleColor(i: number, colors: Float32Array): void {
    const angle = this.orbitAngles[i];
    const normalized = (angle / (Math.PI * 2) + 1) % 1;

    let color: THREE.Color;
    if (normalized < 0.33) {
      color = this.colorA.clone().lerp(this.colorB, normalized / 0.33);
    } else if (normalized < 0.66) {
      color = this.colorB.clone().lerp(this.colorC, (normalized - 0.33) / 0.33);
    } else {
      color = this.colorC.clone().lerp(this.colorA, (normalized - 0.66) / 0.34);
    }

    const brightness = 0.85 + Math.sin(this.orbitPhases[i]) * 0.15;
    colors[i * 3] = color.r * brightness;
    colors[i * 3 + 1] = color.g * brightness;
    colors[i * 3 + 2] = color.b * brightness;
  }

  public triggerWave(): void {
    this.waveStartTime = performance.now() / 1000;
    this.waveEndTime = this.waveStartTime + 0.6;
    this.waveAmplitude = 10 + Math.random() * 10;
  }

  public triggerSpeedBoost(): void {
    this.speedBoostEndTime = performance.now() / 1000 + 1.5;
    this.orbitSpeedMultiplier = 2;
  }

  public createSpawnSparkles(center: THREE.Vector3, colorHex: string, count: number = 8): void {
    if (!this.sparkleTexture) return;
    if (this.totalParticleCount + count > this.MAX_PARTICLES) return;

    const color = new THREE.Color(colorHex);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 20 + Math.random() * 30;

      const size = 2 + Math.random() * 2;
      const geometry = new THREE.PlaneGeometry(size, size);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        map: this.sparkleTexture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(center);
      mesh.position.y += 10;
      mesh.userData = {
        angle,
        radius,
        startTime: performance.now() / 1000,
        duration: 1.2
      };

      this.scene.add(mesh);
      const id = this.sparkleIdCounter++;
      this.sparkleParticles.set(id, mesh);
      this.totalParticleCount++;
    }
  }

  public createSplitRipple(center: THREE.Vector3, colorHex: string): void {
    if (!this.sparkleTexture) return;

    const particleCount = 50;
    const baseColor = new THREE.Color(colorHex);

    if (this.totalParticleCount + particleCount > this.MAX_PARTICLES) return;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;

      const size = 3 + Math.random() * 2;
      const geometry = new THREE.PlaneGeometry(size, size);

      const hueShift = (Math.random() - 0.5) * 0.1;
      const pColor = baseColor.clone();
      pColor.offsetHSL(hueShift, 0, (Math.random() - 0.5) * 0.2);

      const material = new THREE.MeshBasicMaterial({
        color: pColor,
        map: this.sparkleTexture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(center);
      this.gardenGenerator.gardenGroup.add(mesh);

      const id = this.rippleIdCounter++;
      this.rippleParticles.set(id, {
        mesh,
        startTime: performance.now() / 1000,
        duration: 0.8,
        center: center.clone(),
        initialRadius: 20,
        finalRadius: 120,
        angle
      });
      this.totalParticleCount++;
    }
  }

  public createDecayParticles(crystal: CrystalData): void {
    if (!this.sparkleTexture) return;

    const particleCount = 15;
    if (this.totalParticleCount + particleCount > this.MAX_PARTICLES) return;

    const worldPos = new THREE.Vector3();
    crystal.mesh.getWorldPosition(worldPos);

    for (let i = 0; i < particleCount; i++) {
      const size = 2 + Math.random() * 2;
      const geometry = new THREE.PlaneGeometry(size, size);

      const hueShift = (Math.random() - 0.5) * 0.15;
      const pColor = crystal.baseColor.clone();
      pColor.offsetHSL(hueShift, 0, (Math.random() - 0.5) * 0.3);

      const material = new THREE.MeshBasicMaterial({
        color: pColor,
        map: this.sparkleTexture,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(worldPos);
      mesh.position.y += crystal.height / 2;
      this.gardenGenerator.gardenGroup.add(mesh);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.5 + Math.random() * 1.5;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.abs(Math.cos(phi)) * speed + 0.3,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      const id = this.decayIdCounter++;
      this.decayParticles.set(id, {
        mesh,
        velocity,
        startTime: performance.now() / 1000,
        duration: 1.0
      });
      this.totalParticleCount++;
    }
  }

  public update(time: number, deltaTime: number): void {
    const positions = this.orbitGeometry.attributes.position.array as Float32Array;

    let currentSpeedMult = 1;
    if (time < this.speedBoostEndTime) {
      const remaining = this.speedBoostEndTime - time;
      currentSpeedMult = 1 + Math.min(1, remaining / 1.5) * (this.orbitSpeedMultiplier - 1);
    }

    let waveOffset = 0;
    if (time < this.waveEndTime) {
      const elapsed = time - this.waveStartTime;
      const progress = elapsed / 0.6;
      waveOffset = this.waveAmplitude * Math.sin(progress * Math.PI);
    }

    for (let i = 0; i < this.orbitParticleCount; i++) {
      this.orbitAngles[i] += this.baseOrbitSpeed * currentSpeedMult * deltaTime;
      if (this.orbitAngles[i] > Math.PI * 2) {
        this.orbitAngles[i] -= Math.PI * 2;
      }
      this.updateOrbitParticlePosition(i, positions, time, waveOffset);
    }
    this.orbitGeometry.attributes.position.needsUpdate = true;

    this.updateSparkles(time);
    this.updateRipples(time);
    this.updateDecayParticles(time, deltaTime);
  }

  private updateSparkles(time: number): void {
    const toRemove: number[] = [];
    const cameraDir = new THREE.Vector3(0, 0, 1);

    for (const [id, mesh] of this.sparkleParticles.entries()) {
      const data = mesh.userData;
      const elapsed = time - data.startTime;
      const progress = elapsed / data.duration;

      if (progress >= 1) {
        toRemove.push(id);
        continue;
      }

      const dist = data.radius * progress;
      mesh.position.x = data.radius * 0 + Math.cos(data.angle) * dist;
      mesh.position.z = data.radius * 0 + Math.sin(data.angle) * dist;
      mesh.position.y = data.radius * 0 + (1 - progress) * 30;

      const blink = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2);
      const fade = 1 - progress;
      (mesh.material as THREE.MeshBasicMaterial).opacity = blink * fade;

      mesh.lookAt(mesh.position.clone().add(cameraDir));
    }

    for (const id of toRemove) {
      const mesh = this.sparkleParticles.get(id)!;
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.sparkleParticles.delete(id);
      this.totalParticleCount--;
    }
  }

  private updateRipples(time: number): void {
    const toRemove: number[] = [];
    const cameraDir = new THREE.Vector3(0, 0, 1);

    for (const [id, data] of this.rippleParticles.entries()) {
      const elapsed = time - data.startTime;
      const progress = elapsed / data.duration;

      if (progress >= 1) {
        toRemove.push(id);
        continue;
      }

      const radius = data.initialRadius + (data.finalRadius - data.initialRadius) * progress;
      data.mesh.position.x = data.center.x + Math.cos(data.angle) * radius;
      data.mesh.position.z = data.center.z + Math.sin(data.angle) * radius;
      data.mesh.position.y = data.center.y + Math.sin(progress * Math.PI * 2) * 10;

      const fade = Math.sin(progress * Math.PI);
      (data.mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.9;

      data.mesh.lookAt(data.mesh.position.clone().add(cameraDir));
    }

    for (const id of toRemove) {
      const data = this.rippleParticles.get(id)!;
      this.gardenGenerator.gardenGroup.remove(data.mesh);
      data.mesh.geometry.dispose();
      (data.mesh.material as THREE.Material).dispose();
      this.rippleParticles.delete(id);
      this.totalParticleCount--;
    }
  }

  private updateDecayParticles(time: number, deltaTime: number): void {
    const toRemove: number[] = [];
    const cameraDir = new THREE.Vector3(0, 0, 1);

    for (const [id, data] of this.decayParticles.entries()) {
      const elapsed = time - data.startTime;
      const progress = elapsed / data.duration;

      if (progress >= 1) {
        toRemove.push(id);
        continue;
      }

      data.velocity.y -= 0.5 * deltaTime;
      data.mesh.position.x += data.velocity.x;
      data.mesh.position.y += data.velocity.y;
      data.mesh.position.z += data.velocity.z;

      const fade = 1 - progress;
      (data.mesh.material as THREE.MeshBasicMaterial).opacity = fade;

      data.mesh.lookAt(data.mesh.position.clone().add(cameraDir));
    }

    for (const id of toRemove) {
      const data = this.decayParticles.get(id)!;
      this.gardenGenerator.gardenGroup.remove(data.mesh);
      data.mesh.geometry.dispose();
      (data.mesh.material as THREE.Material).dispose();
      this.decayParticles.delete(id);
      this.totalParticleCount--;
    }
  }

  public resize(scale: number): void {
    this.orbitRadiusA *= scale;
    this.orbitRadiusB *= scale;
  }

  public getTotalParticles(): number {
    return this.orbitParticleCount +
      this.sparkleParticles.size +
      this.rippleParticles.size +
      this.decayParticles.size;
  }
}
