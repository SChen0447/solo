import * as THREE from 'three';

export type WaveType = 'original' | 'reflection' | 'diffraction';

export class SoundWave {
  public position: THREE.Vector3;
  public radius: number;
  public speed: number;
  public color: string;
  public type: WaveType;
  public maxRadius: number;
  public mesh: THREE.Mesh;
  public sourceId: number;
  public active: boolean = true;

  private baseStep: number;

  constructor(
    position: THREE.Vector3,
    color: string,
    type: WaveType,
    speed: number = 0.05,
    maxRadius: number = 8,
    sourceId: number = 0
  ) {
    this.position = position.clone();
    this.radius = 0.1;
    this.speed = speed;
    this.color = color;
    this.type = type;
    this.maxRadius = maxRadius;
    this.sourceId = sourceId;
    this.baseStep = speed;

    const tubeRadius = 0.05;
    const radialSegments = 64;
    const tubularSegments = 8;
    const torus = new THREE.TorusGeometry(this.radius, tubeRadius, tubularSegments, radialSegments);
    
    let material: THREE.Material;
    
    if (type === 'original') {
      material = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color: this.color,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
        wireframe: true
      });
    }

    this.mesh = new THREE.Mesh(torus, material);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.x = Math.PI / 2;
  }

  public update(deltaTime: number): boolean {
    if (!this.active) return false;
    
    this.radius += this.speed;
    
    const progress = this.radius / this.maxRadius;
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    
    if (this.type === 'original') {
      material.opacity = 0.4 * (1 - progress * 0.7);
    } else {
      material.opacity = 0.25 * (1 - progress * 0.8);
    }

    const tubeRadius = 0.05;
    const radialSegments = 64;
    const tubularSegments = 8;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.TorusGeometry(
      Math.max(this.radius, 0.1),
      tubeRadius,
      tubularSegments,
      radialSegments
    );

    return this.radius >= this.maxRadius;
  }

  public getIntersection(other: SoundWave): THREE.Vector3[] | null {
    const d = this.position.distanceTo(other.position);
    const r1 = this.radius;
    const r2 = other.radius;

    if (d > r1 + r2 || d < Math.abs(r1 - r2) || d === 0) {
      return null;
    }

    const points: THREE.Vector3[] = [];
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(r1 * r1 - a * a);

    const mid = new THREE.Vector3().lerpVectors(
      this.position,
      other.position,
      a / d
    );

    const dir = new THREE.Vector3().subVectors(other.position, this.position).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3().crossVectors(dir, up).normalize();
    if (tangent.length() < 0.01) {
      tangent.set(1, 0, 0);
    }
    const normal = new THREE.Vector3().crossVectors(dir, tangent).normalize();

    const numPoints = 32;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2);
      const point = mid.clone()
        .addScaledVector(tangent, Math.cos(angle) * h)
        .addScaledVector(normal, Math.sin(angle) * h);
      points.push(point);
    }

    return points;
  }

  public dispose(): void {
    this.active = false;
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
