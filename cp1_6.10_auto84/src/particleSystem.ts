import * as THREE from 'three';

interface ParticleData {
  velocity: THREE.Vector3;
  originalColor: THREE.Color;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
  twinkleAngles: number[];
  isStar: boolean;
  life: number;
  maxLife: number;
}

interface HaloEffect {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particleCount: number;
  private gravityStrength: number = 1.0;
  private windStrength: number = 0.3;
  private sizeScale: number = 1.0;

  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;

  private particleData: ParticleData[] = [];

  private starParticles!: THREE.Points;
  private starGeometry!: THREE.BufferGeometry;
  private starMaterial!: THREE.PointsMaterial;
  private starData: ParticleData[] = [];

  private halos: HaloEffect[] = [];

  private readonly NEBULA_RADIUS = 5;
  private readonly STAR_BIRTH_THRESHOLD = 0.5;
  private readonly COLOR_CENTER = new THREE.Color(0xff6b6b);
  private readonly COLOR_MID = new THREE.Color(0x4ecdc4);
  private readonly COLOR_OUTER = new THREE.Color(0x2d3436);
  private readonly COLOR_STAR_FORMING = new THREE.Color(0xe17055);
  private readonly COLOR_STAR_BORN = new THREE.Color(0xffeaa7);

  constructor(scene: THREE.Scene, initialCount: number = 2000) {
    this.scene = scene;
    this.particleCount = initialCount;
    this.init();
  }

  private init(): void {
    this.createNebulaParticles();
    this.createStarParticleSystem();
  }

  private createNebulaParticles(): void {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const alphas = new Float32Array(this.particleCount);

    this.particleData = [];

    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.NEBULA_RADIUS * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const distRatio = r / this.NEBULA_RADIUS;
      let color: THREE.Color;
      if (distRatio < 0.5) {
        color = this.COLOR_CENTER.clone().lerp(this.COLOR_MID, distRatio * 2);
      } else {
        color = this.COLOR_MID.clone().lerp(this.COLOR_OUTER, (distRatio - 0.5) * 2);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const size = 0.1 + distRatio * 0.7;
      sizes[i] = size;

      alphas[i] = 0.3 + Math.random() * 0.4;

      const twinkleAngles: number[] = [];
      for (let j = 0; j < 6; j++) {
        twinkleAngles.push(Math.random() * Math.PI * 2);
      }

      this.particleData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.001,
          (Math.random() - 0.5) * 0.001,
          (Math.random() - 0.5) * 0.001
        ),
        originalColor: color.clone(),
        size: size,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1 + Math.random() * 2,
        twinkleAngles: twinkleAngles,
        isStar: false,
        life: 0,
        maxLife: 0
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  private createStarParticleSystem(): void {
    const maxStars = 1000;
    this.starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxStars * 3);
    const colors = new Float32Array(maxStars * 3);
    const sizes = new Float32Array(maxStars);
    const alphas = new Float32Array(maxStars);

    for (let i = 0; i < maxStars; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -1000;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.92;
      colors[i * 3 + 2] = 0.65;
      sizes[i] = 0.05;
      alphas[i] = 0;
    }

    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.starGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    this.starGeometry.setDrawRange(0, 0);

    this.starMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.starParticles = new THREE.Points(this.starGeometry, this.starMaterial);
    this.scene.add(this.starParticles);
  }

  public setGravityStrength(value: number): void {
    this.gravityStrength = value;
  }

  public setWindStrength(value: number): void {
    this.windStrength = value;
  }

  public setSizeScale(value: number): void {
    this.sizeScale = value;
    this.material.size = 0.1 * value;
  }

  public setParticleCount(count: number): void {
    if (count === this.particleCount) return;

    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();

    this.particleCount = count;
    this.createNebulaParticles();
  }

  private triggerStarBirth(index: number, position: THREE.Vector3): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    positions[index * 3] = (Math.random() - 0.5) * this.NEBULA_RADIUS * 2;
    positions[index * 3 + 1] = (Math.random() - 0.5) * this.NEBULA_RADIUS * 2;
    positions[index * 3 + 2] = (Math.random() - 0.5) * this.NEBULA_RADIUS * 2;

    colors[index * 3] = this.COLOR_CENTER.r;
    colors[index * 3 + 1] = this.COLOR_CENTER.g;
    colors[index * 3 + 2] = this.COLOR_CENTER.b;

    this.particleData[index].velocity.set(
      (Math.random() - 0.5) * 0.001,
      (Math.random() - 0.5) * 0.001,
      (Math.random() - 0.5) * 0.001
    );
    this.particleData[index].originalColor.copy(this.COLOR_CENTER);

    const starPosAttr = this.starGeometry.attributes.position.array as Float32Array;
    const starColorAttr = this.starGeometry.attributes.color.array as Float32Array;
    const starSizeAttr = this.starGeometry.attributes.size.array as Float32Array;
    const starAlphaAttr = this.starGeometry.attributes.alpha.array as Float32Array;

    for (let i = 0; i < 10; i++) {
      const starIndex = this.starData.length;
      if (starIndex >= 1000) break;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.02 + Math.random() * 0.02;

      starPosAttr[starIndex * 3] = position.x;
      starPosAttr[starIndex * 3 + 1] = position.y;
      starPosAttr[starIndex * 3 + 2] = position.z;

      starColorAttr[starIndex * 3] = this.COLOR_STAR_BORN.r;
      starColorAttr[starIndex * 3 + 1] = this.COLOR_STAR_BORN.g;
      starColorAttr[starIndex * 3 + 2] = this.COLOR_STAR_BORN.b;

      starSizeAttr[starIndex] = 0.05;
      starAlphaAttr[starIndex] = 1;

      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      const twinkleAngles: number[] = [];
      for (let j = 0; j < 6; j++) {
        twinkleAngles.push(Math.random() * Math.PI * 2);
      }

      this.starData.push({
        velocity: vel,
        originalColor: this.COLOR_STAR_BORN.clone(),
        size: 0.05,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1 + Math.random() * 2,
        twinkleAngles: twinkleAngles,
        isStar: true,
        life: 0,
        maxLife: 3 + Math.random() * 2
      });

      this.starGeometry.setDrawRange(0, this.starData.length);
    }

    this.createHalo(position);
  }

  private createHalo(position: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffeaa7,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide
    });

    const halo = new THREE.Mesh(geometry, material);
    halo.position.copy(position);
    halo.scale.setScalar(0.1);
    this.scene.add(halo);

    this.halos.push({
      mesh: halo,
      life: 0,
      maxLife: 1
    });
  }

  public update(deltaTime: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    const time = performance.now() * 0.001;

    for (let i = 0; i < this.particleCount; i++) {
      const ix = i * 3;
      const x = positions[ix];
      const y = positions[ix + 1];
      const z = positions[ix + 2];

      const distSq = x * x + y * y + z * z;
      const dist = Math.sqrt(distSq);

      if (dist < this.STAR_BIRTH_THRESHOLD && dist > 0.001) {
        this.triggerStarBirth(i, new THREE.Vector3(x, y, z));
        continue;
      }

      if (dist > 0.001) {
        const gravityForce = (this.gravityStrength * 0.0005) / Math.max(dist, 0.1);
        this.particleData[i].velocity.x -= (x / dist) * gravityForce;
        this.particleData[i].velocity.y -= (y / dist) * gravityForce;
        this.particleData[i].velocity.z -= (z / dist) * gravityForce;
      }

      this.particleData[i].velocity.x += (Math.random() - 0.5) * this.windStrength * 0.0005;
      this.particleData[i].velocity.y += (Math.random() - 0.5) * this.windStrength * 0.0005;
      this.particleData[i].velocity.z += (Math.random() - 0.5) * this.windStrength * 0.0005;

      this.particleData[i].velocity.multiplyScalar(0.995);

      positions[ix] += this.particleData[i].velocity.x;
      positions[ix + 1] += this.particleData[i].velocity.y;
      positions[ix + 2] += this.particleData[i].velocity.z;

      const distRatio = Math.min(dist / this.NEBULA_RADIUS, 1);
      const collapseFactor = Math.max(0, 1 - distRatio * 1.5);

      const formingColor = this.particleData[i].originalColor.clone().lerp(
        this.COLOR_STAR_FORMING,
        collapseFactor
      );

      const twinkle = Math.sin(time * this.particleData[i].twinkleSpeed + this.particleData[i].twinklePhase) * 0.15 + 0.85;
      colors[ix] = formingColor.r * twinkle;
      colors[ix + 1] = formingColor.g * twinkle;
      colors[ix + 2] = formingColor.b * twinkle;

      sizes[i] = this.particleData[i].size * this.sizeScale;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.updateStars(deltaTime, time);
    this.updateHalos(deltaTime);
  }

  private updateStars(deltaTime: number, time: number): void {
    if (this.starData.length === 0) return;

    const positions = this.starGeometry.attributes.position.array as Float32Array;
    const alphas = this.starGeometry.attributes.alpha.array as Float32Array;

    for (let i = this.starData.length - 1; i >= 0; i--) {
      const ix = i * 3;
      this.starData[i].life += deltaTime;

      if (this.starData[i].life >= this.starData[i].maxLife) {
        this.removeStar(i);
        continue;
      }

      positions[ix] += this.starData[i].velocity.x;
      positions[ix + 1] += this.starData[i].velocity.y;
      positions[ix + 2] += this.starData[i].velocity.z;

      this.starData[i].velocity.multiplyScalar(0.98);

      const lifeRatio = this.starData[i].life / this.starData[i].maxLife;
      const twinkle = Math.sin(time * this.starData[i].twinkleSpeed + this.starData[i].twinklePhase) * 0.3 + 0.7;
      alphas[i] = (1 - lifeRatio) * twinkle;
    }

    this.starGeometry.attributes.position.needsUpdate = true;
    this.starGeometry.attributes.alpha.needsUpdate = true;
  }

  private removeStar(index: number): void {
    const positions = this.starGeometry.attributes.position.array as Float32Array;
    const colors = this.starGeometry.attributes.color.array as Float32Array;
    const sizes = this.starGeometry.attributes.size.array as Float32Array;
    const alphas = this.starGeometry.attributes.alpha.array as Float32Array;

    const lastIndex = this.starData.length - 1;

    if (index !== lastIndex) {
      positions[index * 3] = positions[lastIndex * 3];
      positions[index * 3 + 1] = positions[lastIndex * 3 + 1];
      positions[index * 3 + 2] = positions[lastIndex * 3 + 2];

      colors[index * 3] = colors[lastIndex * 3];
      colors[index * 3 + 1] = colors[lastIndex * 3 + 1];
      colors[index * 3 + 2] = colors[lastIndex * 3 + 2];

      sizes[index] = sizes[lastIndex];
      alphas[index] = alphas[lastIndex];

      this.starData[index] = this.starData[lastIndex];
    }

    this.starData.pop();
    this.starGeometry.setDrawRange(0, this.starData.length);
  }

  private updateHalos(deltaTime: number): void {
    for (let i = this.halos.length - 1; i >= 0; i--) {
      this.halos[i].life += deltaTime;

      if (this.halos[i].life >= this.halos[i].maxLife) {
        this.scene.remove(this.halos[i].mesh);
        this.halos[i].mesh.geometry.dispose();
        (this.halos[i].mesh.material as THREE.Material).dispose();
        this.halos.splice(i, 1);
        continue;
      }

      const progress = this.halos[i].life / this.halos[i].maxLife;
      const scale = 0.1 + progress * 0.9;
      this.halos[i].mesh.scale.setScalar(scale);
      (this.halos[i].mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - progress);
    }
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();

    this.scene.remove(this.starParticles);
    this.starGeometry.dispose();
    this.starMaterial.dispose();

    for (const halo of this.halos) {
      this.scene.remove(halo.mesh);
      halo.mesh.geometry.dispose();
      (halo.mesh.material as THREE.Material).dispose();
    }
    this.halos = [];
  }
}
