import * as THREE from 'three';

export interface CelestialBodyData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
  radius: number;
  color: THREE.Color;
}

export const BODY_COLORS = [
  new THREE.Color('#4488FF'),
  new THREE.Color('#6C63FF'),
  new THREE.Color('#00BCD4'),
  new THREE.Color('#4FC3F7'),
  new THREE.Color('#81C784'),
  new THREE.Color('#FFD54F'),
  new THREE.Color('#FF9800'),
  new THREE.Color('#FF6B6B'),
  new THREE.Color('#FF4444'),
];

export function massToRadius(mass: number): number {
  const t = (Math.max(1, Math.min(10, mass)) - 1) / 9;
  return 0.3 + t * 1.7;
}

export function massToColor(mass: number): THREE.Color {
  const blue = new THREE.Color('#4488FF');
  const red = new THREE.Color('#FF4444');
  const t = (Math.max(1, Math.min(10, mass)) - 1) / 9;
  return blue.clone().lerp(red, t);
}

export class CelestialBody {
  public data: CelestialBodyData;
  public mesh: THREE.Mesh;
  public glow: THREE.Mesh;
  public halo: THREE.Mesh;
  public trail: THREE.Line;
  public trailPositions: THREE.Vector3[] = [];
  public trailGeometry: THREE.BufferGeometry;
  public group: THREE.Group;
  public selected: boolean = false;
  public isStar: boolean = false;
  public pulsePhase: number = 0;
  public pulseAmplitude: number = 0;
  public pulseFrequency: number = 0;
  public id: number;
  private static _idCounter: number = 0;
  private baseRadius: number;
  private baseColor: THREE.Color;

  constructor(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    mass: number,
    color?: THREE.Color,
    radius?: number,
    isStar: boolean = false,
    pulseAmplitude: number = 0,
    pulseFrequency: number = 0
  ) {
    this.id = ++CelestialBody._idCounter;
    this.baseRadius = radius ?? massToRadius(mass);
    this.baseColor = color ?? massToColor(mass);
    this.isStar = isStar;
    this.pulseAmplitude = pulseAmplitude;
    this.pulseFrequency = pulseFrequency;

    this.data = {
      position: position.clone(),
      velocity: velocity.clone(),
      mass,
      radius: this.baseRadius,
      color: this.baseColor.clone(),
    };

    this.group = new THREE.Group();

    const geo = new THREE.SphereGeometry(this.baseRadius, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: this.baseColor,
      transparent: true,
      opacity: 1,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mesh);

    const glowGeo = new THREE.SphereGeometry(this.baseRadius * 1.4, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.baseColor,
      transparent: true,
      opacity: isStar ? 0.5 : 0.25,
      side: THREE.BackSide,
    });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(this.glow);

    const haloGeo = new THREE.RingGeometry(this.baseRadius * 1.2, this.baseRadius * 1.22, 64);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.halo = new THREE.Mesh(haloGeo, haloMat);
    this.halo.rotation.x = -Math.PI / 2;
    this.group.add(this.halo);

    this.trailGeometry = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({
      color: this.baseColor,
      transparent: true,
      opacity: 0.8,
      linewidth: 1,
    });
    this.trail = new THREE.Line(this.trailGeometry, trailMat);
    this.trail.frustumCulled = false;
    this.group.add(this.trail);

    this.group.position.copy(this.data.position);
  }

  public updatePosition(pos: THREE.Vector3): void {
    this.data.position.copy(pos);
    this.group.position.copy(pos);
  }

  public updateTrail(maxPoints: number = 200): void {
    this.trailPositions.push(this.data.position.clone());
    if (this.trailPositions.length > maxPoints) {
      this.trailPositions.shift();
    }
    const positions = new Float32Array(this.trailPositions.length * 3);
    const colors = new Float32Array(this.trailPositions.length * 3);
    for (let i = 0; i < this.trailPositions.length; i++) {
      const p = this.trailPositions[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      const alpha = i / this.trailPositions.length;
      colors[i * 3] = this.baseColor.r * alpha;
      colors[i * 3 + 1] = this.baseColor.g * alpha;
      colors[i * 3 + 2] = this.baseColor.b * alpha;
    }
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    (this.trail.material as THREE.LineBasicMaterial).vertexColors = true;
    this.trailGeometry.computeBoundingSphere();
  }

  public clearTrail(): void {
    this.trailPositions = [];
    const positions = new Float32Array(0);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  public setSelected(selected: boolean): void {
    this.selected = selected;
    (this.halo.material as THREE.MeshBasicMaterial).opacity = selected ? 0.7 : 0;
  }

  public animateHalo(time: number): void {
    if (this.selected) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 4);
      const scale = 1 + pulse * 0.2;
      this.halo.scale.set(scale, scale, 1);
      (this.halo.material as THREE.MeshBasicMaterial).opacity = 0.4 + pulse * 0.4;
    }
  }

  public animatePulse(dt: number): void {
    if (this.isStar && this.pulseAmplitude > 0) {
      this.pulsePhase += dt * this.pulseFrequency * Math.PI * 2;
      const pulse = 1 + Math.sin(this.pulsePhase) * this.pulseAmplitude;
      this.mesh.scale.setScalar(pulse);
      this.glow.scale.setScalar(pulse * 1.1);
      this.data.radius = this.baseRadius * pulse;
    }
  }

  public setMerging(progress: number): void {
    const s = 1 - progress;
    this.mesh.scale.setScalar(s);
    this.glow.scale.setScalar(s * 1.4);
    const brightness = 1 + progress * 3;
    (this.mesh.material as THREE.MeshBasicMaterial).color.setRGB(
      Math.min(1, this.baseColor.r * brightness),
      Math.min(1, this.baseColor.g * brightness),
      Math.min(1, this.baseColor.b * brightness)
    );
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.glow.geometry.dispose();
    (this.glow.material as THREE.Material).dispose();
    this.halo.geometry.dispose();
    (this.halo.material as THREE.Material).dispose();
    this.trailGeometry.dispose();
    (this.trail.material as THREE.Material).dispose();
  }
}

export class MergeParticle {
  public mesh: THREE.Mesh;
  public velocity: THREE.Vector3;
  public life: number;
  public maxLife: number;
  public dead: boolean = false;

  constructor(position: THREE.Vector3, color: THREE.Color) {
    this.maxLife = 0.5;
    this.life = this.maxLife;
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 2 + Math.random() * 4;
    this.velocity = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed
    );
  }

  public update(dt: number): void {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    this.mesh.position.addScaledVector(this.velocity, dt);
    const alpha = this.life / this.maxLife;
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
    const s = 0.5 + alpha * 0.5;
    this.mesh.scale.setScalar(s);
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
