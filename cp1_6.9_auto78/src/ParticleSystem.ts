import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

interface LightTrail {
  line: THREE.Line;
  life: number;
  maxLife: number;
  material: THREE.LineBasicMaterial;
}

interface Beam {
  line: THREE.Line;
  life: number;
  maxLife: number;
  material: THREE.LineBasicMaterial;
  from: THREE.Vector3;
  to: THREE.Vector3;
  progress: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private points: THREE.Points;
  private lightTrails: LightTrail[] = [];
  private beams: Beam[] = [];
  private maxParticles = 300;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    this.particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute([], 3));
    this.particleGeometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.points);
  }

  public emitBurst(position: THREE.Vector3, color: THREE.Color, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.5 + Math.random() * 1.5;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      this.particles.push({
        position: position.clone(),
        velocity,
        color: color.clone(),
        life: 0.8,
        maxLife: 0.8,
        size: 0.04 + Math.random() * 0.06
      });
    }
  }

  public emitBeam(from: THREE.Vector3, to: THREE.Vector3, color: THREE.Color): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([from.clone(), from.clone()]);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    this.beams.push({
      line,
      life: 0.5,
      maxLife: 0.5,
      material,
      from: from.clone(),
      to: to.clone(),
      progress: 0
    });
  }

  public emitLightTrail(start: THREE.Vector3, end: THREE.Vector3, color: THREE.Color): void {
    const points: THREE.Vector3[] = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      points.push(new THREE.Vector3().lerpVectors(start, end, t));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      linewidth: 3
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    this.lightTrails.push({
      line,
      life: 2.0,
      maxLife: 2.0,
      material
    });
  }

  public emitFullscreenBurst(): void {
    const colors = [
      new THREE.Color(0xff3366),
      new THREE.Color(0x33ccff),
      new THREE.Color(0x33cc66),
      new THREE.Color(0xffdd44),
      new THREE.Color(0xcc66ff),
      new THREE.Color(0xff6633)
    ];

    for (let i = 0; i < 200; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1 + Math.random() * 3;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      this.particles.push({
        position: new THREE.Vector3(0, 2, 0),
        velocity,
        color: colors[Math.floor(Math.random() * colors.length)].clone(),
        life: 2.0,
        maxLife: 2.0,
        size: 0.06 + Math.random() * 0.08
      });
    }
  }

  public update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.position.addScaledVector(p.velocity, delta);
      p.velocity.multiplyScalar(0.98);
    }

    this.updateParticleGeometry();

    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= delta;
      b.progress = Math.min(1, b.progress + delta * 4);

      const currentEnd = new THREE.Vector3().lerpVectors(b.from, b.to, this.easeOut(b.progress));
      const positions = new Float32Array([
        b.from.x, b.from.y, b.from.z,
        currentEnd.x, currentEnd.y, currentEnd.z
      ]);
      b.line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      b.material.opacity = b.life / b.maxLife;

      if (b.life <= 0) {
        this.scene.remove(b.line);
        b.line.geometry.dispose();
        b.material.dispose();
        this.beams.splice(i, 1);
      }
    }

    for (let i = this.lightTrails.length - 1; i >= 0; i--) {
      const t = this.lightTrails[i];
      t.life -= delta;
      t.material.opacity = 0.3 * (t.life / t.maxLife);

      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.material.dispose();
        this.lightTrails.splice(i, 1);
      }
    }
  }

  private updateParticleGeometry(): void {
    const count = this.particles.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const alpha = p.life / p.maxLife;

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      colors[i * 3] = p.color.r * alpha;
      colors[i * 3 + 1] = p.color.g * alpha;
      colors[i * 3 + 2] = p.color.b * alpha;

      sizes[i] = p.size * alpha;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public dispose(): void {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }
}
