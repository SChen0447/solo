import * as THREE from 'three';

export interface EngineParams {
  energy: number;
  temperature: number;
  particleCount: number;
}

interface ParticleData {
  radius: number;
  angle: number;
  angularSpeed: number;
  inclination: number;
  inclinationSpeed: number;
  phase: number;
}

class SimplexNoise {
  private perm: number[];

  constructor() {
    this.perm = [];
    for (let i = 0; i < 256; i++) {
      this.perm[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < 256; i++) {
      this.perm[256 + i] = this.perm[i];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y), u),
      this.lerp(this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1), u),
      v
    );
  }
}

export class EngineCore {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private icosahedron: THREE.LineSegments;
  private plasmaSphere: THREE.Mesh;
  private plasmaCanvas: HTMLCanvasElement;
  private plasmaContext: CanvasRenderingContext2D;
  private plasmaTexture: THREE.CanvasTexture;
  private noise: SimplexNoise;
  private particles: THREE.Points;
  private particleData: ParticleData[];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;

  private params: EngineParams;
  private targetParams: EngineParams;
  private time: number;

  private tempColor: THREE.Color;
  private tempVec3: THREE.Vector3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.time = 0;
    this.noise = new SimplexNoise();
    this.tempColor = new THREE.Color();
    this.tempVec3 = new THREE.Vector3();

    this.params = {
      energy: 50,
      temperature: 2500,
      particleCount: 25
    };
    this.targetParams = { ...this.params };

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.plasmaCanvas = document.createElement('canvas');
    this.plasmaCanvas.width = 256;
    this.plasmaCanvas.height = 256;
    this.plasmaContext = this.plasmaCanvas.getContext('2d')!;

    this.icosahedron = this.createIcosahedron();
    this.plasmaSphere = this.createPlasmaSphere();
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });
    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particleData = [];

    this.group.add(this.icosahedron);
    this.group.add(this.plasmaSphere);
    this.group.add(this.particles);

    this.rebuildParticles();
  }

  private createIcosahedron(): THREE.LineSegments {
    const geometry = new THREE.IcosahedronGeometry(1.5, 1);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0xFFD700,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    const lineSegments = new THREE.LineSegments(edges, material);
    return lineSegments;
  }

  private createPlasmaSphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1.2, 64, 64);
    this.plasmaTexture = new THREE.CanvasTexture(this.plasmaCanvas);
    this.plasmaTexture.wrapS = THREE.RepeatWrapping;
    this.plasmaTexture.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshBasicMaterial({
      map: this.plasmaTexture,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    const sphere = new THREE.Mesh(geometry, material);
    return sphere;
  }

  private getTemperatureColor(t: number): THREE.Color {
    const normalized = Math.max(0, Math.min(1, t / 5000));
    const coldColor = new THREE.Color(0x00BFFF);
    const hotColor = new THREE.Color(0xFF4500);
    return coldColor.clone().lerp(hotColor, normalized);
  }

  private updatePlasmaTexture(): void {
    const ctx = this.plasmaContext;
    const width = this.plasmaCanvas.width;
    const height = this.plasmaCanvas.height;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const tempColor = this.getTemperatureColor(this.params.temperature);
    const energyFactor = this.params.energy / 100;
    const timeScale = 0.8 + energyFactor * 0.8;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width * 4;
        const ny = y / height * 4;

        let value = 0;
        value += this.noise.noise2D(nx + this.time * timeScale, ny) * 0.5;
        value += this.noise.noise2D(nx * 2 - this.time * timeScale * 0.7, ny * 2) * 0.3;
        value += this.noise.noise2D(nx * 4 + this.time * timeScale * 1.3, ny * 4) * 0.2;

        value = (value + 1) * 0.5;

        const centerX = width / 2;
        const centerY = height / 2;
        const dx = (x - centerX) / centerX;
        const dy = (y - centerY) / centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radial = Math.max(0, 1 - dist * 1.1);

        const intensity = value * radial * (0.5 + energyFactor * 0.5);

        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, tempColor.r * 255 * intensity * 1.5);
        data[idx + 1] = Math.min(255, tempColor.g * 255 * intensity * 1.3);
        data[idx + 2] = Math.min(255, tempColor.b * 255 * intensity * 1.2);
        data[idx + 3] = Math.min(255, intensity * 220);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    this.plasmaTexture.needsUpdate = true;
  }

  private rebuildParticles(): void {
    const count = this.params.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    this.particleData = [];
    const tempColor = this.getTemperatureColor(this.params.temperature);

    for (let i = 0; i < count; i++) {
      this.particleData.push({
        radius: 3 + Math.random() * 5,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (0.5 + Math.random() * 1.5) * (Math.random() > 0.5 ? 1 : -1),
        inclination: Math.random() * Math.PI - Math.PI / 2,
        inclinationSpeed: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2
      });

      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      const brightness = 0.7 + Math.random() * 0.3;
      colors[i * 3] = tempColor.r * brightness;
      colors[i * 3 + 1] = tempColor.g * brightness;
      colors[i * 3 + 2] = tempColor.b * brightness;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  private updateParticleColors(): void {
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const tempColor = this.getTemperatureColor(this.params.temperature);

    for (let i = 0; i < this.particleData.length; i++) {
      const brightness = 0.7 + ((this.particleData[i].phase) % 1) * 0.3;
      colors[i * 3] = tempColor.r * brightness;
      colors[i * 3 + 1] = tempColor.g * brightness;
      colors[i * 3 + 2] = tempColor.b * brightness;
    }
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  private updateParticles(delta: number, mouseWorld: THREE.Vector3): void {
    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const energyFactor = this.params.energy / 100;

    for (let i = 0; i < this.particleData.length; i++) {
      const p = this.particleData[i];
      p.angle += p.angularSpeed * delta * (0.5 + energyFactor * 0.5);
      p.inclination += p.inclinationSpeed * delta;
      p.phase += delta * 2;

      if (p.inclination > Math.PI / 2.5) p.inclinationSpeed = -Math.abs(p.inclinationSpeed);
      if (p.inclination < -Math.PI / 2.5) p.inclinationSpeed = Math.abs(p.inclinationSpeed);

      const r = p.radius + Math.sin(p.phase) * 0.3;
      const cosInc = Math.cos(p.inclination);
      let px = r * Math.cos(p.angle) * cosInc;
      let py = r * Math.sin(p.inclination);
      let pz = r * Math.sin(p.angle) * cosInc;

      const dx = px - mouseWorld.x;
      const dy = py - mouseWorld.y;
      const dz = pz - mouseWorld.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 1.5 && dist > 0.01) {
        const force = (1.5 - dist) / 1.5;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        px += nx * force * 2;
        py += ny * force * 2;
        pz += nz * force * 2;
      }

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
  }

  private lerpParams(): void {
    const speed = 1 - Math.pow(0.001, 1 / 60);
    this.params.energy += (this.targetParams.energy - this.params.energy) * speed;
    this.params.temperature += (this.targetParams.temperature - this.params.temperature) * speed;
    if (this.params.particleCount !== this.targetParams.particleCount) {
      this.params.particleCount = this.targetParams.particleCount;
      this.rebuildParticles();
    }
  }

  update(delta: number, mouseWorld: THREE.Vector3): void {
    this.time += delta;
    this.lerpParams();

    this.icosahedron.rotation.y += THREE.MathUtils.degToRad(10) * delta;
    this.icosahedron.rotation.x = Math.sin(this.time * 0.3) * 0.1;

    const energyScale = 0.8 + (this.params.energy / 100) * 0.6;
    this.plasmaSphere.scale.setScalar(energyScale);
    this.plasmaSphere.rotation.y -= delta * 0.2;

    const frameMat = this.icosahedron.material as THREE.LineBasicMaterial;
    frameMat.opacity = 0.7 + (this.params.energy / 100) * 0.3;

    this.updatePlasmaTexture();
    this.updateParticles(delta, mouseWorld);
    this.updateParticleColors();
  }

  setParams(params: Partial<EngineParams>): void {
    if (params.energy !== undefined) {
      this.targetParams.energy = Math.max(0, Math.min(100, params.energy));
    }
    if (params.temperature !== undefined) {
      this.targetParams.temperature = Math.max(0, Math.min(5000, params.temperature));
    }
    if (params.particleCount !== undefined) {
      this.targetParams.particleCount = Math.max(1, Math.min(50, params.particleCount));
    }
  }

  getParams(): EngineParams {
    return { ...this.targetParams };
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.icosahedron.geometry.dispose();
    (this.icosahedron.material as THREE.Material).dispose();
    this.plasmaSphere.geometry.dispose();
    (this.plasmaSphere.material as THREE.Material).dispose();
    this.plasmaTexture.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }
}
