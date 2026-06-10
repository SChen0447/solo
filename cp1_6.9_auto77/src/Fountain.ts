import * as THREE from 'three';

const MAX_PARTICLES = 3000;
const MAX_LINES = 5000;

const COLOR_PALETTE = [
  new THREE.Color(0xff3366),
  new THREE.Color(0xffcc33),
  new THREE.Color(0x33ffff),
  new THREE.Color(0xaa66ff)
];

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  baseColor: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
  phase: number;
  state: 'rising' | 'falling';
  peakHeight: number;
  colorOffset: number;
  inVortex: boolean;
  vortexBoost: number;
}

interface WebLine {
  a: number;
  b: number;
  life: number;
  maxLife: number;
}

export class Vortex {
  public position: THREE.Vector3;
  public radius: number;
  public strength: number;
  public life: number;
  public rotation: number;
  public active: boolean;

  constructor() {
    this.position = new THREE.Vector3();
    this.radius = 2;
    this.strength = 0;
    this.life = 0;
    this.rotation = 0;
    this.active = false;
  }

  public start(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.radius = 2;
    this.strength = 1;
    this.life = 2;
    this.active = true;
  }

  public updatePosition(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.life = 2;
    this.strength = 1;
  }

  public update(deltaTime: number): void {
    if (!this.active) return;
    this.rotation += deltaTime * 4;
    this.life -= deltaTime;
    if (this.life <= 0) {
      this.active = false;
      this.strength = 0;
    } else {
      this.strength = Math.min(1, this.life / 2);
    }
  }
}

export class Fountain {
  public points: THREE.Points;
  public lines: THREE.LineSegments;
  public vortex: Vortex;

  private particles: Particle[] = [];
  private webs: WebLine[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private lineGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private lineMaterial: THREE.LineBasicMaterial;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private linePositions: Float32Array;
  private lineColors: Float32Array;

  private emissionRate: number = 100;
  private emissionAccumulator: number = 0;
  private elapsedTime: number = 0;

  private tmpVecA: THREE.Vector3 = new THREE.Vector3();
  private tmpVecB: THREE.Vector3 = new THREE.Vector3();
  private tmpColor: THREE.Color = new THREE.Color();

  constructor() {
    this.vortex = new Vortex();

    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.particleGeometry.setDrawRange(0, 0);

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.particleGeometry, this.particleMaterial);

    this.linePositions = new Float32Array(MAX_LINES * 2 * 3);
    this.lineColors = new Float32Array(MAX_LINES * 2 * 3);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));
    this.lineGeometry.setDrawRange(0, 0);

    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 0.5
    });

    this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
  }

  public setEmissionRate(rate: number): void {
    this.emissionRate = Math.max(50, Math.min(200, rate));
  }

  public getEmissionRate(): number {
    return this.emissionRate;
  }

  private interpolateColor(t: number): THREE.Color {
    const normalized = ((t % 1) + 1) % 1;
    const scaled = normalized * COLOR_PALETTE.length;
    const index = Math.floor(scaled);
    const f = scaled - index;
    const c1 = COLOR_PALETTE[index % COLOR_PALETTE.length];
    const c2 = COLOR_PALETTE[(index + 1) % COLOR_PALETTE.length];
    return this.tmpColor.copy(c1).lerp(c2, f);
  }

  private spawnParticle(): void {
    if (this.particles.length >= MAX_PARTICLES) return;

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.3;
    const pos = new THREE.Vector3(
      Math.cos(angle) * radius,
      -4 + Math.random() * 0.2,
      Math.sin(angle) * radius
    );

    const speed = 0.5 + Math.random() * 1.0;
    const spread = (Math.random() - 0.5) * 0.3;
    const vel = new THREE.Vector3(
      spread,
      speed,
      spread * 0.5
    );

    const colorOffset = Math.random();
    const baseColor = this.interpolateColor(colorOffset).clone();

    const particle: Particle = {
      position: pos,
      velocity: vel,
      color: baseColor.clone(),
      baseColor: baseColor.clone(),
      life: 0,
      maxLife: 5 + Math.random() * 3,
      size: 0.08 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
      state: 'rising',
      peakHeight: 3 + Math.random() * 4,
      colorOffset: colorOffset,
      inVortex: false,
      vortexBoost: 0
    };

    this.particles.push(particle);
  }

  private applyVortex(particle: Particle, deltaTime: number): void {
    if (!this.vortex.active) {
      particle.vortexBoost *= 0.95;
      if (particle.vortexBoost < 0.01) particle.vortexBoost = 0;
      return;
    }

    const dx = particle.position.x - this.vortex.position.x;
    const dy = particle.position.y - this.vortex.position.y;
    const dz = particle.position.z - this.vortex.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < this.vortex.radius * 2 && dist > 0.01) {
      const influence = Math.max(0, 1 - dist / (this.vortex.radius * 2)) * this.vortex.strength;
      particle.vortexBoost = Math.max(particle.vortexBoost, influence);

      const angle = this.vortex.rotation + Math.atan2(dz, dx);
      const targetRadius = this.vortex.radius * 0.5 * (1 - influence * 0.3);
      const targetX = this.vortex.position.x + Math.cos(angle) * targetRadius;
      const targetZ = this.vortex.position.z + Math.sin(angle) * targetRadius;
      const targetY = this.vortex.position.y + Math.sin(angle * 2) * 0.5;

      const speedMult = 1 + particle.vortexBoost;
      particle.velocity.x += (targetX - particle.position.x) * influence * 3 * deltaTime;
      particle.velocity.y += (targetY - particle.position.y) * influence * 3 * deltaTime;
      particle.velocity.z += (targetZ - particle.position.z) * influence * 3 * deltaTime;
      particle.velocity.multiplyScalar(speedMult * 0.98 + 0.02);
    } else {
      particle.vortexBoost *= 0.9;
    }
  }

  private updateParticle(p: Particle, deltaTime: number): boolean {
    p.life += deltaTime;
    if (p.life >= p.maxLife) return false;

    this.applyVortex(p, deltaTime);

    const colorT = this.elapsedTime * 0.15 + p.colorOffset;
    const interpolated = this.interpolateColor(colorT);
    p.color.copy(interpolated);

    if (p.vortexBoost > 0.1) {
      const brightness = 1 + p.vortexBoost * 0.5;
      p.color.multiplyScalar(brightness);
      p.color.r = Math.min(1, p.color.r);
      p.color.g = Math.min(1, p.color.g);
      p.color.b = Math.min(1, p.color.b);
    }

    if (p.state === 'rising') {
      p.velocity.y -= 0.3 * deltaTime;
      p.velocity.x += (Math.random() - 0.5) * 0.5 * deltaTime;
      p.velocity.z += (Math.random() - 0.5) * 0.5 * deltaTime;

      if (p.position.y >= p.peakHeight || p.velocity.y <= 0.1) {
        p.state = 'falling';
        const spreadAngle = Math.random() * Math.PI * 2;
        const spreadForce = 0.8 + Math.random() * 1.2;
        p.velocity.x = Math.cos(spreadAngle) * spreadForce;
        p.velocity.z = Math.sin(spreadAngle) * spreadForce;
        p.velocity.y = Math.random() * 0.3;
      }
    } else {
      p.velocity.y -= 1.5 * deltaTime;
      p.velocity.x *= 0.99;
      p.velocity.z *= 0.99;

      const wobble = Math.sin(this.elapsedTime * 2 + p.phase) * 0.3;
      p.velocity.x += wobble * deltaTime;
      p.velocity.z += Math.cos(this.elapsedTime * 1.5 + p.phase) * 0.2 * deltaTime;
    }

    p.position.addScaledVector(p.velocity, deltaTime);

    if (p.position.y < -6) return false;

    return true;
  }

  private updateWebs(deltaTime: number): void {
    for (let i = this.webs.length - 1; i >= 0; i--) {
      this.webs[i].life += deltaTime;
      if (this.webs[i].life >= this.webs[i].maxLife) {
        this.webs.splice(i, 1);
      }
    }

    const checkCount = Math.min(this.particles.length, 800);
    const maxNewLines = 50;
    let newLines = 0;

    for (let i = 0; i < checkCount && newLines < maxNewLines; i++) {
      const pi = this.particles[i];
      if (pi.state !== 'falling') continue;

      for (let j = i + 1; j < Math.min(checkCount, i + 30) && newLines < maxNewLines; j++) {
        const pj = this.particles[j];
        if (pj.state !== 'falling') continue;

        const dx = pi.position.x - pj.position.x;
        const dy = pi.position.y - pj.position.y;
        const dz = pi.position.z - pj.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < 0.64 && distSq > 0.01) {
          let exists = false;
          for (const w of this.webs) {
            if ((w.a === i && w.b === j) || (w.a === j && w.b === i)) {
              exists = true;
              break;
            }
          }
          if (!exists && this.webs.length < MAX_LINES) {
            this.webs.push({
              a: i,
              b: j,
              life: 0,
              maxLife: 0.5 + Math.random() * 0.5
            });
            newLines++;
          }
        }
      }
    }
  }

  private updateBuffers(): void {
    const count = this.particles.length;
    this.particleGeometry.setDrawRange(0, count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const p = this.particles[i];
      this.positions[i3] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;

      this.colors[i3] = p.color.r;
      this.colors[i3 + 1] = p.color.g;
      this.colors[i3 + 2] = p.color.b;

      const lifeRatio = 1 - p.life / p.maxLife;
      const sizeMult = 1 + p.vortexBoost * 0.5;
      this.sizes[i] = p.size * sizeMult * (0.5 + 0.5 * lifeRatio);
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;

    const lineCount = Math.min(this.webs.length, MAX_LINES);
    this.lineGeometry.setDrawRange(0, lineCount * 2);

    for (let i = 0; i < lineCount; i++) {
      const web = this.webs[i];
      const i6 = i * 6;
      const pa = this.particles[web.a];
      const pb = this.particles[web.b];

      if (!pa || !pb) continue;

      this.linePositions[i6] = pa.position.x;
      this.linePositions[i6 + 1] = pa.position.y;
      this.linePositions[i6 + 2] = pa.position.z;
      this.linePositions[i6 + 3] = pb.position.x;
      this.linePositions[i6 + 4] = pb.position.y;
      this.linePositions[i6 + 5] = pb.position.z;

      const lifeRatio = 1 - web.life / web.maxLife;
      const alpha = 0.2 + 0.3 * lifeRatio;

      this.lineColors[i6] = Math.min(1, (pa.color.r + 0.5)) * alpha;
      this.lineColors[i6 + 1] = Math.min(1, (pa.color.g + 0.5)) * alpha;
      this.lineColors[i6 + 2] = Math.min(1, (pa.color.b + 0.5)) * alpha;
      this.lineColors[i6 + 3] = Math.min(1, (pb.color.r + 0.5)) * alpha;
      this.lineColors[i6 + 4] = Math.min(1, (pb.color.g + 0.5)) * alpha;
      this.lineColors[i6 + 5] = Math.min(1, (pb.color.b + 0.5)) * alpha;
    }

    this.lineGeometry.attributes.position.needsUpdate = true;
    this.lineGeometry.attributes.color.needsUpdate = true;
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    this.emissionAccumulator += this.emissionRate * deltaTime;
    while (this.emissionAccumulator >= 1) {
      this.spawnParticle();
      this.emissionAccumulator -= 1;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.updateParticle(this.particles[i], deltaTime)) {
        this.particles.splice(i, 1);
      }
    }

    this.vortex.update(deltaTime);
    this.updateWebs(deltaTime);
    this.updateBuffers();
  }

  public dispose(): void {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
  }
}
