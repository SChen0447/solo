import * as THREE from 'three';

type Splash = {
  particles: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
};

export class Water {
  public mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private basePositions: Float32Array;
  private segments: number = 128;
  private size: number = 70;
  private time: number = 0;
  private intensity: number = 30;
  private targetIntensity: number = 30;
  private splashes: Splash[] = [];
  private splashPool: Splash[] = [];
  private maxSplashes: number = 20;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    this.geometry.rotateX(-Math.PI / 2);

    this.basePositions = new Float32Array(this.geometry.attributes.position.count);
    for (let i = 0; i < this.basePositions.length; i++) {
      this.basePositions[i] = 0;
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x1a5276,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.3,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      vertexColors: true
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.position.y = -0.3;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.updateVertexColors();
  }

  private updateVertexColors(): void {
    const colors = new Float32Array(this.geometry.attributes.position.count * 3);
    const color1 = new THREE.Color(0x1a5276);
    const color2 = new THREE.Color(0x73c6b6);

    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const idx = i * (this.segments + 1) + j;
        const u = j / this.segments;
        const v = i / this.segments;
        const distFromCenter = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2;
        const t = Math.min(distFromCenter, 1);
        const color = color1.clone().lerp(color2, t * 0.5);
        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;
      }
    }
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  public setIntensity(value: number): void {
    this.targetIntensity = value;
  }

  public addSplash(worldX: number, worldZ: number): void {
    let splash: Splash;
    if (this.splashPool.length > 0) {
      splash = this.splashPool.pop()!;
      splash.particles.visible = true;
    } else {
      if (this.splashes.length >= this.maxSplashes) return;
      splash = this.createSplash();
    }

    const count = 50;
    const positions = splash.particles.geometry.attributes.position.array as Float32Array;
    const colors = splash.particles.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      positions[i * 3] = worldX + Math.cos(angle) * radius;
      positions[i * 3 + 1] = -0.2;
      positions[i * 3 + 2] = worldZ + Math.sin(angle) * radius;

      const speed = 1.5 + Math.random() * 2;
      const spread = 0.8 + Math.random() * 0.5;
      splash.velocities[i * 3] = Math.cos(angle) * spread;
      splash.velocities[i * 3 + 1] = speed;
      splash.velocities[i * 3 + 2] = Math.sin(angle) * spread;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }

    splash.particles.geometry.attributes.position.needsUpdate = true;
    splash.particles.geometry.attributes.color.needsUpdate = true;
    splash.life = 0;
    splash.maxLife = 0.8;
    this.splashes.push(splash);
  }

  private createSplash(): Splash {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      sizes[i] = 0.1 + Math.random() * 0.15;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geo, mat);
    points.visible = false;
    this.mesh.parent?.add(points);

    return {
      particles: points,
      velocities: new Float32Array(count * 3),
      life: 0,
      maxLife: 0.8
    };
  }

  public update(dt: number): void {
    this.time += dt;

    const intensityDiff = this.targetIntensity - this.intensity;
    if (Math.abs(intensityDiff) > 0.01) {
      this.intensity += intensityDiff * Math.min(dt * 3, 1);
    }

    const amplitude = (this.intensity / 100) * 0.6;
    const speed = 0.5 + (this.intensity / 100) * 2;

    const positions = this.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i <= this.segments; i++) {
      for (let j = 0; j <= this.segments; j++) {
        const idx = i * (this.segments + 1) + j;
        const x = (j / this.segments - 0.5) * this.size;
        const z = (i / this.segments - 0.5) * this.size;

        const edgeFactor = Math.min(
          1,
          (Math.abs(x) / (this.size / 2)) * 0.7 + 0.3,
          (Math.abs(z) / (this.size / 2)) * 0.7 + 0.3
        );
        const waveAmplitude = amplitude * (1 + edgeFactor * 0.5);

        const wave1 = Math.sin(x * 0.3 + this.time * speed) * 0.4;
        const wave2 = Math.sin(z * 0.4 + this.time * speed * 0.7 + 1) * 0.3;
        const wave3 = Math.sin((x + z) * 0.2 + this.time * speed * 1.2) * 0.2;
        const wave4 = Math.sin(Math.sqrt(x * x + z * z) * 0.3 - this.time * speed * 0.5) * 0.1;

        positions[idx * 3 + 1] = this.basePositions[idx] + (wave1 + wave2 + wave3 + wave4) * waveAmplitude;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();

    for (let s = this.splashes.length - 1; s >= 0; s--) {
      const splash = this.splashes[s];
      splash.life += dt;

      if (splash.life >= splash.maxLife) {
        splash.particles.visible = false;
        this.splashPool.push(splash);
        this.splashes.splice(s, 1);
        continue;
      }

      const t = splash.life / splash.maxLife;
      const positions = splash.particles.geometry.attributes.position.array as Float32Array;
      const colors = splash.particles.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < 50; i++) {
        splash.velocities[i * 3 + 1] -= 4 * dt;
        positions[i * 3] += splash.velocities[i * 3] * dt;
        positions[i * 3 + 1] += splash.velocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += splash.velocities[i * 3 + 2] * dt;

        const alpha = 1 - t;
        colors[i * 3] = 1 * alpha;
        colors[i * 3 + 1] = 1 * alpha;
        colors[i * 3 + 2] = 1 * alpha;
      }

      (splash.particles.material as THREE.PointsMaterial).opacity = (1 - t) * 0.9;
      splash.particles.geometry.attributes.position.needsUpdate = true;
      splash.particles.geometry.attributes.color.needsUpdate = true;
    }
  }
}
