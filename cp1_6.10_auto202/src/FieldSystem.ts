import * as THREE from 'three';
import { MagnetSystem } from './MagnetSystem';

const PARTICLES_PER_STREAM = 30;
const DEFAULT_STREAM_COUNT = 1500;
const MIN_STREAM_COUNT = 800;
const MAX_STREAM_COUNT = 3000;
const MIN_SPEED = 0.5;
const MAX_SPEED = 1.5;
const FIELD_EXTENT = 8;

interface StreamData {
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  controlPoint1: THREE.Vector3;
  controlPoint2: THREE.Vector3;
  speeds: Float32Array;
  offsets: Float32Array;
  baseAngle: number;
  baseElevation: number;
  distance: number;
}

export class FieldSystem {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private streamCount: number;
  private streams: StreamData[];
  private magnetSystem: MagnetSystem;
  private positions: Float32Array;
  private colors: Float32Array;
  private isFlipped: boolean = false;
  private targetStreamCount: number;
  private transitionProgress: number = 1;
  private isTransitioning: boolean = false;

  constructor(magnetSystem: MagnetSystem) {
    this.magnetSystem = magnetSystem;
    this.streamCount = DEFAULT_STREAM_COUNT;
    this.targetStreamCount = DEFAULT_STREAM_COUNT;
    this.streams = [];

    const totalParticles = MAX_STREAM_COUNT * PARTICLES_PER_STREAM;
    this.positions = new Float32Array(totalParticles * 3);
    this.colors = new Float32Array(totalParticles * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);

    this.generateStreams(MAX_STREAM_COUNT);
    this.setDrawRange(this.streamCount * PARTICLES_PER_STREAM);
    this.initialUpdate();
  }

  private generateStreams(count: number): void {
    this.streams = [];
    for (let i = 0; i < count; i++) {
      this.streams.push(this.createStream(i, count));
    }
  }

  private createStream(index: number, total: number): StreamData {
    const phi = Math.acos(1 - 2 * (index + 0.5) / total);
    const theta = Math.PI * (1 + Math.sqrt(5)) * index;

    const baseAngle = theta;
    const baseElevation = phi - Math.PI / 2;
    const distance = 1.5 + Math.random() * 0.5;

    const speeds = new Float32Array(PARTICLES_PER_STREAM);
    const offsets = new Float32Array(PARTICLES_PER_STREAM);
    for (let i = 0; i < PARTICLES_PER_STREAM; i++) {
      speeds[i] = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
      offsets[i] = i / PARTICLES_PER_STREAM;
    }

    return {
      startPoint: new THREE.Vector3(),
      endPoint: new THREE.Vector3(),
      controlPoint1: new THREE.Vector3(),
      controlPoint2: new THREE.Vector3(),
      speeds,
      offsets,
      baseAngle,
      baseElevation,
      distance
    };
  }

  private updateStreamPaths(): void {
    const { north, south } = this.magnetSystem.getPolePositions();
    const rotation = this.magnetSystem.getMagnetRotation();

    const startPole = this.isFlipped ? south : north;
    const endPole = this.isFlipped ? north : south;

    for (let i = 0; i < this.streams.length; i++) {
      const stream = this.streams[i];
      const angle = stream.baseAngle + rotation;
      const elev = stream.baseElevation;

      const cosElev = Math.cos(elev);
      const sinElev = Math.sin(elev);
      const dirX = Math.cos(angle) * cosElev;
      const dirY = sinElev;
      const dirZ = Math.sin(angle) * cosElev;

      const startOffset = new THREE.Vector3(dirX, dirY, dirZ).multiplyScalar(0.6);
      stream.startPoint.copy(startPole).add(startOffset);

      const endOffset = new THREE.Vector3(-dirX, -dirY, -dirZ).multiplyScalar(0.6);
      stream.endPoint.copy(endPole).add(endOffset);

      const spread = FIELD_EXTENT * (0.6 + 0.4 * Math.abs(sinElev));
      const midDir = new THREE.Vector3(dirX, dirY * 0.3, dirZ).normalize();

      stream.controlPoint1.copy(stream.startPoint)
        .add(midDir.clone().multiplyScalar(spread));

      stream.controlPoint2.copy(stream.endPoint)
        .add(midDir.clone().multiplyScalar(-spread));
    }
  }

  private bezierPoint(t: number, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): THREE.Vector3 {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return new THREE.Vector3(
      mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
      mt3 * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t3 * p3.z
    );
  }

  private initialUpdate(): void {
    this.updateStreamPaths();
    const { colorN, colorS } = this.magnetSystem.getPolarity();
    const startColor = this.isFlipped ? colorS : colorN;
    const endColor = this.isFlipped ? colorN : colorS;

    for (let s = 0; s < this.streamCount; s++) {
      const stream = this.streams[s];
      for (let p = 0; p < PARTICLES_PER_STREAM; p++) {
        const idx = (s * PARTICLES_PER_STREAM + p) * 3;
        const t = stream.offsets[p];
        const point = this.bezierPoint(t, stream.startPoint, stream.controlPoint1, stream.controlPoint2, stream.endPoint);
        this.positions[idx] = point.x;
        this.positions[idx + 1] = point.y;
        this.positions[idx + 2] = point.z;

        this.colors[idx] = startColor.r * (1 - t) + endColor.r * t;
        this.colors[idx + 1] = startColor.g * (1 - t) + endColor.g * t;
        this.colors[idx + 2] = startColor.b * (1 - t) + endColor.b * t;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public update(deltaTime: number): void {
    this.updateStreamPaths();
    const { colorN, colorS } = this.magnetSystem.getPolarity();
    const startColor = this.isFlipped ? colorS : colorN;
    const endColor = this.isFlipped ? colorN : colorS;

    for (let s = 0; s < this.streamCount; s++) {
      const stream = this.streams[s];
      for (let p = 0; p < PARTICLES_PER_STREAM; p++) {
        stream.offsets[p] = (stream.offsets[p] + (stream.speeds[p] / 10) * deltaTime) % 1;

        const idx = (s * PARTICLES_PER_STREAM + p) * 3;
        const t = stream.offsets[p];
        const point = this.bezierPoint(t, stream.startPoint, stream.controlPoint1, stream.controlPoint2, stream.endPoint);
        this.positions[idx] = point.x;
        this.positions[idx + 1] = point.y;
        this.positions[idx + 2] = point.z;

        const falloff = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
        this.colors[idx] = (startColor.r * (1 - t) + endColor.r * t) * (0.4 + 0.6 * falloff);
        this.colors[idx + 1] = (startColor.g * (1 - t) + endColor.g * t) * (0.4 + 0.6 * falloff);
        this.colors[idx + 2] = (startColor.b * (1 - t) + endColor.b * t) * (0.4 + 0.6 * falloff);
      }
    }

    if (this.isTransitioning) {
      this.transitionProgress = Math.min(this.transitionProgress + deltaTime * 2, 1);
      const targetCount = Math.round(
        this.streamCount + (this.targetStreamCount - this.streamCount) * this.easeOutCubic(this.transitionProgress)
      );
      this.setDrawRange(targetCount * PARTICLES_PER_STREAM);

      if (this.transitionProgress >= 1) {
        this.streamCount = this.targetStreamCount;
        this.setDrawRange(this.streamCount * PARTICLES_PER_STREAM);
        this.isTransitioning = false;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private setDrawRange(count: number): void {
    this.geometry.setDrawRange(0, Math.min(count, MAX_STREAM_COUNT * PARTICLES_PER_STREAM));
  }

  public setParticleCount(count: number): void {
    const clamped = Math.max(MIN_STREAM_COUNT, Math.min(MAX_STREAM_COUNT, count));
    if (clamped !== this.targetStreamCount) {
      this.targetStreamCount = clamped;
      this.isTransitioning = true;
      this.transitionProgress = 0;
    }
  }

  public flipField(): void {
    this.isFlipped = !this.isFlipped;
  }

  public getParticleCount(): number {
    return this.streamCount;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
