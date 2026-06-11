import * as THREE from 'three';

export interface ControlParams {
  primaryTone: number;
  secondaryTone: number;
  driftSpeed: number;
}

interface StarData {
  basePosition: THREE.Vector3;
  oscillationPhase: number;
  oscillationPeriod: number;
  isFlashing: boolean;
  flashStartTime: number;
  lastDistance: number;
}

export class NebulaSystem {
  private scene: THREE.Scene;
  private particleCount: number = 8000;
  private starCount: number = 20;
  private nebulaRadius: number = 15;

  private nebulaGeometry!: THREE.BufferGeometry;
  private nebulaMaterial!: THREE.PointsMaterial;
  private nebulaPoints!: THREE.Points;

  private starGeometry!: THREE.BufferGeometry;
  private starMaterial!: THREE.PointsMaterial;
  private starPoints!: THREE.Points;

  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private baseSizes!: Float32Array;
  private pulsePhases!: Float32Array;
  private driftOffsets!: Float32Array;
  private radii!: Float32Array;

  private starPositions!: Float32Array;
  private starColors!: Float32Array;
  private starSizes!: Float32Array;
  private starOpacities!: Float32Array;
  private starDataArray: StarData[] = [];

  private positionAttribute!: THREE.BufferAttribute;
  private colorAttribute!: THREE.BufferAttribute;
  private sizeAttribute!: THREE.BufferAttribute;

  private starPositionAttribute!: THREE.BufferAttribute;
  private starColorAttribute!: THREE.BufferAttribute;
  private starSizeAttribute!: THREE.BufferAttribute;
  private starOpacityAttribute!: THREE.BufferAttribute;

  private readonly pulsePeriod: number = 2;
  private readonly pulseAmplitude: number = 0.5;
  private readonly flashDuration: number = 0.5;
  private readonly flashTriggerDistance: number = 3;
  private readonly starBaseSize: number = 0.8;
  private readonly starFlashSize: number = 1.5;

  private params: ControlParams = {
    primaryTone: 0,
    secondaryTone: 0,
    driftSpeed: 0.001
  };

  private colorMagenta = new THREE.Color(0xff00ff);
  private colorOrangeRed = new THREE.Color(0xff4500);
  private colorIndigo = new THREE.Color(0x4b0082);
  private colorViolet = new THREE.Color(0x9400d3);
  private colorStarYellow = new THREE.Color(0xffffaa);

  private sizeCompensation: number = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initNebulaParticles();
    this.initStarParticles();
  }

  private initNebulaParticles(): void {
    this.nebulaGeometry = new THREE.BufferGeometry();

    const vertexCount = this.particleCount;
    this.positions = new Float32Array(vertexCount * 3);
    this.colors = new Float32Array(vertexCount * 3);
    this.sizes = new Float32Array(vertexCount);
    this.baseSizes = new Float32Array(vertexCount);
    this.pulsePhases = new Float32Array(vertexCount);
    this.driftOffsets = new Float32Array(vertexCount * 3);
    this.radii = new Float32Array(vertexCount);

    for (let i = 0; i < vertexCount; i++) {
      const i3 = i * 3;

      const position = this.randomInSphere(this.nebulaRadius);
      this.positions[i3] = position.x;
      this.positions[i3 + 1] = position.y;
      this.positions[i3 + 2] = position.z;

      const radius = position.length();
      this.radii[i] = radius;

      const color = this.interpolateColor(radius);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      const baseSize = 0.5 + Math.random() * 2.5;
      this.baseSizes[i] = baseSize;
      this.sizes[i] = baseSize;

      this.pulsePhases[i] = Math.random() * Math.PI * 2;

      this.driftOffsets[i3] = (Math.random() - 0.5) * 0.01;
      this.driftOffsets[i3 + 1] = (Math.random() - 0.5) * 0.01;
      this.driftOffsets[i3 + 2] = (Math.random() - 0.5) * 0.01;
    }

    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(this.colors, 3);
    this.sizeAttribute = new THREE.BufferAttribute(this.sizes, 1);

    this.nebulaGeometry.setAttribute('position', this.positionAttribute);
    this.nebulaGeometry.setAttribute('color', this.colorAttribute);
    this.nebulaGeometry.setAttribute('size', this.sizeAttribute);

    this.nebulaMaterial = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.nebulaPoints = new THREE.Points(this.nebulaGeometry, this.nebulaMaterial);
    this.scene.add(this.nebulaPoints);
  }

  private initStarParticles(): void {
    this.starGeometry = new THREE.BufferGeometry();

    const vertexCount = this.starCount;
    this.starPositions = new Float32Array(vertexCount * 3);
    this.starColors = new Float32Array(vertexCount * 3);
    this.starSizes = new Float32Array(vertexCount);
    this.starOpacities = new Float32Array(vertexCount);

    for (let i = 0; i < vertexCount; i++) {
      const i3 = i * 3;

      const starRadius = this.nebulaRadius * 0.3;
      const position = this.randomInSphere(starRadius);

      this.starPositions[i3] = position.x;
      this.starPositions[i3 + 1] = position.y;
      this.starPositions[i3 + 2] = position.z;

      this.starColors[i3] = this.colorStarYellow.r;
      this.starColors[i3 + 1] = this.colorStarYellow.g;
      this.starColors[i3 + 2] = this.colorStarYellow.b;

      this.starSizes[i] = this.starBaseSize;
      this.starOpacities[i] = 1.0;

      this.starDataArray.push({
        basePosition: position.clone(),
        oscillationPhase: Math.random() * Math.PI * 2,
        oscillationPeriod: 3 + Math.random() * 4,
        isFlashing: false,
        flashStartTime: 0,
        lastDistance: Infinity
      });
    }

    this.starPositionAttribute = new THREE.BufferAttribute(this.starPositions, 3);
    this.starColorAttribute = new THREE.BufferAttribute(this.starColors, 3);
    this.starSizeAttribute = new THREE.BufferAttribute(this.starSizes, 1);
    this.starOpacityAttribute = new THREE.BufferAttribute(this.starOpacities, 1);

    this.starGeometry.setAttribute('position', this.starPositionAttribute);
    this.starGeometry.setAttribute('color', this.starColorAttribute);
    this.starGeometry.setAttribute('size', this.starSizeAttribute);
    this.starGeometry.setAttribute('opacity', this.starOpacityAttribute);

    this.starMaterial = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.starPoints = new THREE.Points(this.starGeometry, this.starMaterial);
    this.scene.add(this.starPoints);
  }

  private randomInSphere(radius: number): THREE.Vector3 {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(Math.random());

    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }

  private interpolateColor(radius: number): THREE.Color {
    const t = radius / this.nebulaRadius;

    const centerColor = this.colorMagenta.clone().lerp(this.colorOrangeRed, this.params.primaryTone);
    const edgeColor = this.colorIndigo.clone().lerp(this.colorViolet, this.params.secondaryTone);

    return centerColor.clone().lerp(edgeColor, t);
  }

  public update(time: number, camera: THREE.PerspectiveCamera): void {
    this.updateNebulaParticles(time);
    this.updateStarParticles(time, camera);
  }

  private updateNebulaParticles(time: number): void {
    const driftSpeed = this.params.driftSpeed;
    const pulseFreq = (2 * Math.PI) / this.pulsePeriod;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];

      const driftX = px * driftSpeed * 0.1 + this.driftOffsets[i3] * driftSpeed * 10;
      const driftY = py * driftSpeed * 0.1 + this.driftOffsets[i3 + 1] * driftSpeed * 10;
      const driftZ = pz * driftSpeed * 0.1 + this.driftOffsets[i3 + 2] * driftSpeed * 10;

      this.positions[i3] += driftX;
      this.positions[i3 + 1] += driftY;
      this.positions[i3 + 2] += driftZ;

      const newRadius = Math.sqrt(
        this.positions[i3] ** 2 +
        this.positions[i3 + 1] ** 2 +
        this.positions[i3 + 2] ** 2
      );

      if (newRadius > this.nebulaRadius * 1.2) {
        const scale = (this.nebulaRadius * 0.8) / newRadius;
        this.positions[i3] *= scale;
        this.positions[i3 + 1] *= scale;
        this.positions[i3 + 2] *= scale;
      }

      const radius = Math.sqrt(
        this.positions[i3] ** 2 +
        this.positions[i3 + 1] ** 2 +
        this.positions[i3 + 2] ** 2
      );
      this.radii[i] = radius;

      const t = radius / this.nebulaRadius;
      const centerColor = this.colorMagenta.clone().lerp(this.colorOrangeRed, this.params.primaryTone);
      const edgeColor = this.colorIndigo.clone().lerp(this.colorViolet, this.params.secondaryTone);
      const color = centerColor.clone().lerp(edgeColor, Math.min(t, 1));

      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      const pulse = Math.sin(time * pulseFreq + this.pulsePhases[i]) * this.pulseAmplitude;
      this.sizes[i] = (this.baseSizes[i] + pulse) * this.sizeCompensation;
    }

    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
  }

  private updateStarParticles(time: number, camera: THREE.PerspectiveCamera): void {
    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      const starData = this.starDataArray[i];

      const oscillationFreq = (2 * Math.PI) / starData.oscillationPeriod;
      const oscillation = Math.sin(time * oscillationFreq + starData.oscillationPhase) * 0.1;

      const basePos = starData.basePosition;
      const dirX = basePos.x / basePos.length();
      const dirY = basePos.y / basePos.length();
      const dirZ = basePos.z / basePos.length();

      this.starPositions[i3] = basePos.x + dirX * oscillation;
      this.starPositions[i3 + 1] = basePos.y + dirY * oscillation;
      this.starPositions[i3 + 2] = basePos.z + dirZ * oscillation;

      const starWorldPos = new THREE.Vector3(
        this.starPositions[i3],
        this.starPositions[i3 + 1],
        this.starPositions[i3 + 2]
      );
      const distance = starWorldPos.distanceTo(camera.position);

      if (distance < this.flashTriggerDistance && !starData.isFlashing && starData.lastDistance >= this.flashTriggerDistance) {
        starData.isFlashing = true;
        starData.flashStartTime = time;
      }
      starData.lastDistance = distance;

      if (starData.isFlashing) {
        const elapsed = time - starData.flashStartTime;
        if (elapsed >= this.flashDuration) {
          starData.isFlashing = false;
          this.starSizes[i] = this.starBaseSize * this.sizeCompensation;
          this.starOpacities[i] = 1.0;
        } else {
          const flashProgress = elapsed / this.flashDuration;
          const flashIntensity = Math.sin(flashProgress * Math.PI * 6) * 0.25 + 0.75;

          this.starSizes[i] = this.starFlashSize * this.sizeCompensation;
          this.starOpacities[i] = 0.5 + flashIntensity * 0.5;
        }
      } else {
        this.starSizes[i] = this.starBaseSize * this.sizeCompensation;
        this.starOpacities[i] = 1.0;
      }
    }

    this.starPositionAttribute.needsUpdate = true;
    this.starSizeAttribute.needsUpdate = true;
    this.starOpacityAttribute.needsUpdate = true;
  }

  public setParams(params: Partial<ControlParams>): void {
    this.params = { ...this.params, ...params };
    this.updateAllColors();
  }

  private updateAllColors(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const radius = this.radii[i];
      const color = this.interpolateColor(radius);

      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
    }
    this.colorAttribute.needsUpdate = true;
  }

  public setSizeCompensation(compensation: number): void {
    this.sizeCompensation = compensation;
  }

  public getPoints(): THREE.Points {
    return this.nebulaPoints;
  }

  public getStarPoints(): THREE.Points {
    return this.starPoints;
  }

  public dispose(): void {
    this.scene.remove(this.nebulaPoints);
    this.scene.remove(this.starPoints);

    this.nebulaGeometry.dispose();
    this.nebulaMaterial.dispose();
    this.starGeometry.dispose();
    this.starMaterial.dispose();
  }
}
