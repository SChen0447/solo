import * as THREE from 'three';

export interface TrailParticle {
  position: THREE.Vector3;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  size: number;
  alpha: number;
  highlightTime: number;
}

export class StarTrail {
  public particles: TrailParticle[] = [];
  public points: THREE.Points | null = null;
  public geometry: THREE.BufferGeometry | null = null;
  public material: THREE.PointsMaterial | null = null;
  public totalLength: number = 0;
  public isActive: boolean = false;
  public baseColor: THREE.Color = new THREE.Color(0x88aaff);
  public brightnessMultiplier: number = 1.0;
  private lastPosition: THREE.Vector3 | null = null;
  private readonly particleSpacing: number = 0.1;
  private readonly smoothParticlesPerUnit: number = 5;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  public startTrail(startPos: THREE.Vector3): void {
    this.isActive = true;
    this.particles = [];
    this.totalLength = 0;
    this.lastPosition = startPos.clone();
    this.addParticle(startPos.clone());
  }

  public extendTrail(currentPos: THREE.Vector3, speed: number): void {
    if (!this.isActive || !this.lastPosition) return;

    this.brightnessMultiplier = 1.0 + Math.min(speed * 0.002, 0.5);

    const distance = this.lastPosition.distanceTo(currentPos);
    if (distance >= this.particleSpacing) {
      const steps = Math.floor(distance / this.particleSpacing);
      const direction = currentPos.clone().sub(this.lastPosition).normalize();

      for (let i = 1; i <= steps; i++) {
        const newPos = this.lastPosition.clone().add(
          direction.multiplyScalar(this.particleSpacing)
        );
        this.addParticle(newPos);
        this.totalLength += this.particleSpacing;
      }
      this.lastPosition = this.lastPosition.clone().add(
        direction.multiplyScalar(steps * this.particleSpacing)
      );
    }
  }

  public endTrail(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.smoothAndDensify();
    this.brightnessMultiplier = 1.0;
    this.updateGeometry();
  }

  private addParticle(pos: THREE.Vector3): void {
    this.particles.push({
      position: pos,
      baseColor: this.baseColor.clone(),
      currentColor: this.baseColor.clone(),
      size: 2,
      alpha: 1.0,
      highlightTime: 0
    });
  }

  private smoothAndDensify(): void {
    if (this.particles.length < 2) return;

    const smoothed: TrailParticle[] = [];
    smoothed.push(this.particles[0]);

    for (let i = 0; i < this.particles.length - 1; i++) {
      const p1 = this.particles[i];
      const p2 = this.particles[i + 1];
      const distance = p1.position.distanceTo(p2.position);
      const insertCount = Math.floor(distance * this.smoothParticlesPerUnit);

      for (let j = 1; j <= insertCount; j++) {
        const t = j / (insertCount + 1);
        const newPos = new THREE.Vector3().lerpVectors(p1.position, p2.position, t);
        smoothed.push({
          position: newPos,
          baseColor: this.baseColor.clone(),
          currentColor: this.baseColor.clone(),
          size: 2,
          alpha: 1.0,
          highlightTime: 0
        });
      }
      smoothed.push(p2);
    }

    this.particles = smoothed;
    this.recalculateLength();
  }

  private recalculateLength(): void {
    this.totalLength = 0;
    for (let i = 1; i < this.particles.length; i++) {
      this.totalLength += this.particles[i - 1].position.distanceTo(
        this.particles[i].position
      );
    }
  }

  public updateColor(newColor: THREE.Color): void {
    this.baseColor.copy(newColor);
    for (const p of this.particles) {
      p.baseColor.copy(newColor);
    }
    this.updateGeometry();
  }

  public triggerHighlight(duration: number = 0.3): void {
    for (const p of this.particles) {
      p.highlightTime = duration;
    }
  }

  public update(deltaTime: number): void {
    let needsUpdate = false;
    const whiteColor = new THREE.Color(0xffffff);

    for (const p of this.particles) {
      if (p.highlightTime > 0) {
        p.highlightTime -= deltaTime;
        const t = Math.max(p.highlightTime / 0.3, 0);
        p.currentColor.copy(p.baseColor).lerp(whiteColor, t * this.brightnessMultiplier);
        needsUpdate = true;
      } else if (!p.currentColor.equals(p.baseColor)) {
        const brightColor = p.baseColor.clone().multiplyScalar(this.brightnessMultiplier);
        p.currentColor.copy(brightColor);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.updateGeometry();
    }
  }

  public updateGeometry(): void {
    if (!this.geometry || this.particles.length === 0) return;

    const positions = new Float32Array(this.particles.length * 3);
    const colors = new Float32Array(this.particles.length * 3);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      const brightColor = p.currentColor.clone().multiplyScalar(this.brightnessMultiplier);
      colors[i * 3] = brightColor.r;
      colors[i * 3 + 1] = brightColor.g;
      colors[i * 3 + 2] = brightColor.b;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public dispose(scene: THREE.Scene): void {
    if (this.points) scene.remove(this.points);
    this.geometry?.dispose();
    this.material?.dispose();
  }
}
