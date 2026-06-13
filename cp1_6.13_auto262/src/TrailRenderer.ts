import * as THREE from 'three';
import type { ParticleData } from './ParticleButterfly';

const TRAIL_LENGTH = 10;
const TRAIL_MAX_AGE = 30;

export class TrailRenderer {
  public mesh: THREE.LineSegments;
  public geometry: THREE.BufferGeometry;
  public material: THREE.LineBasicMaterial;

  private particles: ParticleData[];
  private trailPositions: THREE.Vector3[][];
  private trailAges: number[][];

  private positionAttribute: Float32Array;
  private colorAttribute: Float32Array;

  private maxTrails: number;
  private pointsPerTrail: number;

  constructor(particles: ParticleData[]) {
    this.particles = particles;
    this.maxTrails = particles.length;
    this.pointsPerTrail = TRAIL_LENGTH;

    this.trailPositions = [];
    this.trailAges = [];

    for (let i = 0; i < this.maxTrails; i++) {
      const trail: THREE.Vector3[] = [];
      const ages: number[] = [];
      for (let j = 0; j < this.pointsPerTrail; j++) {
        trail.push(particles[i].currentPosition.clone());
        ages.push(0);
      }
      this.trailPositions.push(trail);
      this.trailAges.push(ages);
    }

    const segmentsPerTrail = this.pointsPerTrail - 1;
    const totalSegments = this.maxTrails * segmentsPerTrail;
    const totalVertices = totalSegments * 2;

    this.positionAttribute = new Float32Array(totalVertices * 3);
    this.colorAttribute = new Float32Array(totalVertices * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionAttribute, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorAttribute, 3));

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1
    });

    this.mesh = new THREE.LineSegments(this.geometry, this.material);
  }

  public update(deltaTime: number): void {
    for (let i = 0; i < this.maxTrails; i++) {
      const particle = this.particles[i];
      const trail = this.trailPositions[i];
      const ages = this.trailAges[i];

      for (let j = this.pointsPerTrail - 1; j > 0; j--) {
        trail[j].copy(trail[j - 1]);
        ages[j] = ages[j - 1] + deltaTime;
      }

      trail[0].copy(particle.currentPosition);
      ages[0] = 0;
    }

    this.updateBuffers();

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateBuffers(): void {
    const segmentsPerTrail = this.pointsPerTrail - 1;

    for (let i = 0; i < this.maxTrails; i++) {
      const trail = this.trailPositions[i];
      const ages = this.trailAges[i];
      const particle = this.particles[i];
      const color = particle.color;

      for (let j = 0; j < segmentsPerTrail; j++) {
        const segmentIndex = i * segmentsPerTrail + j;
        const vertexIndex = segmentIndex * 2;

        const pos1 = trail[j];
        const pos2 = trail[j + 1];

        const ageRatio1 = Math.min(1, ages[j] / (TRAIL_MAX_AGE / 60));
        const ageRatio2 = Math.min(1, ages[j + 1] / (TRAIL_MAX_AGE / 60));

        const alpha1 = Math.max(0, 1 - ageRatio1);
        const alpha2 = Math.max(0, 1 - ageRatio2);

        const vi1 = vertexIndex * 3;
        const vi2 = (vertexIndex + 1) * 3;

        this.positionAttribute[vi1] = pos1.x;
        this.positionAttribute[vi1 + 1] = pos1.y;
        this.positionAttribute[vi1 + 2] = pos1.z;

        this.positionAttribute[vi2] = pos2.x;
        this.positionAttribute[vi2 + 1] = pos2.y;
        this.positionAttribute[vi2 + 2] = pos2.z;

        this.colorAttribute[vi1] = color.r * alpha1;
        this.colorAttribute[vi1 + 1] = color.g * alpha1;
        this.colorAttribute[vi1 + 2] = color.b * alpha1;

        this.colorAttribute[vi2] = color.r * alpha2;
        this.colorAttribute[vi2 + 1] = color.g * alpha2;
        this.colorAttribute[vi2 + 2] = color.b * alpha2;
      }
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
