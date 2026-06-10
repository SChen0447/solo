import * as THREE from 'three';

export type FlowerState = 'bud' | 'blooming' | 'bloomed' | 'shrinking';

export interface PollenParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class Flower {
  public group: THREE.Group;
  public position: THREE.Vector3;
  public state: FlowerState = 'bud';
  public isBloomed: boolean = false;

  private bud: THREE.Mesh;
  private petals: THREE.Mesh[] = [];
  private pollenParticles: PollenParticle[] = [];
  private pollenPool: THREE.Points | null = null;
  private pollenPoolPositions: Float32Array | null = null;
  private pollenPoolVelocities: Float32Array | null = null;
  private pollenPoolLives: Float32Array | null = null;

  private stateTimer: number = 0;
  private bloomDuration: number = 1.5;
  private bloomDelay: number = 0;
  private shrinkDuration: number = 1.0;
  private bloomedDuration: number = 5.0;
  private pollenInterval: number = 1.5;
  private pollenTimer: number = 0;

  private budPulsePhase: number;
  private baseBudColor: THREE.Color;
  private petalCount: number = 6;
  private maxPollenInPool: number = 300;
  private activePollenCount: number = 0;

  private static readonly BUD_RADIUS = 0.3;
  private static readonly PETAL_MAX_RADIUS = 0.8;
  private static readonly POLLEN_PER_WAVE = 60;
  private static readonly POLLEN_LIFE = 3.0;
  private static readonly POLLEN_SPREAD = 3.0;

  constructor(position: THREE.Vector3, scene: THREE.Scene) {
    this.position = position.clone();
    this.group = new THREE.Group();
    this.group.position.copy(position);

    this.budPulsePhase = Math.random() * Math.PI * 2;

    const hue = Math.random();
    const saturation = 0.7 + Math.random() * 0.3;
    const lightness = 0.55 + Math.random() * 0.2;
    this.baseBudColor = new THREE.Color().setHSL(hue, saturation, lightness);

    this.createBud();
    this.createPetals();
    this.createPollenPool();
    scene.add(this.group);
  }

  private createBud(): void {
    const budGeom = new THREE.SphereGeometry(Flower.BUD_RADIUS, 12, 12);
    const budMat = new THREE.MeshBasicMaterial({
      color: this.baseBudColor,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.bud = new THREE.Mesh(budGeom, budMat);
    this.group.add(this.bud);

    const glowGeom = new THREE.SphereGeometry(Flower.BUD_RADIUS * 1.8, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.baseBudColor,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    this.group.add(glow);
  }

  private createPetals(): void {
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.bezierCurveTo(0.15, 0.1, 0.25, 0.25, 0.15, 0.5);
    petalShape.bezierCurveTo(0, 0.7, -0.15, 0.5, -0.15, 0.5);
    petalShape.bezierCurveTo(-0.25, 0.25, -0.15, 0.1, 0, 0);

    const petalGeom = new THREE.ShapeGeometry(petalShape, 8);

    const startColor = new THREE.Color(0xfff0b3);
    const midColor = new THREE.Color(0xff66aa);
    const endColor = new THREE.Color(0xcc2244);

    for (let i = 0; i < this.petalCount; i++) {
      const angle = (i / this.petalCount) * Math.PI * 2;
      const petalMat = new THREE.MeshBasicMaterial({
        color: startColor,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const petal = new THREE.Mesh(petalGeom.clone(), petalMat);
      petal.rotation.y = angle;
      petal.scale.setScalar(0.01);
      petal.userData = {
        angle,
        startColor: startColor.clone(),
        midColor: midColor.clone(),
        endColor: endColor.clone()
      };
      this.petals.push(petal);
      this.group.add(petal);
    }
  }

  private createPollenPool(): void {
    const positions = new Float32Array(this.maxPollenInPool * 3);
    const velocities = new Float32Array(this.maxPollenInPool * 3);
    const lives = new Float32Array(this.maxPollenInPool);
    const colors = new Float32Array(this.maxPollenInPool * 3);

    for (let i = 0; i < this.maxPollenInPool; i++) {
      lives[i] = 0;
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.87;
      colors[i * 3 + 2] = 0.0;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.pollenPool = new THREE.Points(geom, mat);
    this.pollenPoolPositions = positions;
    this.pollenPoolVelocities = velocities;
    this.pollenPoolLives = lives;
    this.group.add(this.pollenPool);
  }

  public startBloom(delay: number = 0): void {
    if (this.state !== 'bud') return;
    this.bloomDelay = delay;
    this.stateTimer = 0;
    this.state = 'blooming';
  }

  public startShrink(): void {
    if (this.state === 'bud' || this.state === 'shrinking') return;
    this.stateTimer = 0;
    this.state = 'shrinking';
  }

  public onButterflyNearby(): void {
    if (this.state === 'bloomed') {
      this.spawnPollenWave(20);
    }
  }

  public update(delta: number, elapsed: number): void {
    this.updateBudPulse(elapsed);

    switch (this.state) {
      case 'bud':
        this.state = 'bud';
        break;
      case 'blooming':
        this.updateBlooming(delta);
        break;
      case 'bloomed':
        this.updateBloomed(delta);
        break;
      case 'shrinking':
        this.updateShrinking(delta);
        break;
    }

    this.updatePollen(delta);
  }

  private updateBudPulse(elapsed: number): void {
    const pulse = Math.sin(elapsed * Math.PI * 2 + this.budPulsePhase) * 0.1 + 1;
    this.bud.scale.setScalar(pulse);

    if (this.state === 'bud') {
      (this.bud.material as THREE.MeshBasicMaterial).opacity = 0.85 + Math.sin(elapsed * 2 + this.budPulsePhase) * 0.1;
    }
  }

  private updateBlooming(delta: number): void {
    if (this.bloomDelay > 0) {
      this.bloomDelay -= delta;
      return;
    }

    this.stateTimer += delta;
    const t = Math.min(1, this.stateTimer / this.bloomDuration);
    const easedT = easeOutCubic(t);

    this.bud.scale.setScalar(1 - easedT * 0.5);
    (this.bud.material as THREE.MeshBasicMaterial).opacity = 0.9 - easedT * 0.5;

    this.petals.forEach((petal, i) => {
      const mat = petal.material as THREE.MeshBasicMaterial;
      const petalT = Math.min(1, Math.max(0, (t - i * 0.05) / 0.7));
      const easedPetalT = easeOutBack(petalT);

      petal.scale.setScalar(0.01 + easedPetalT * Flower.PETAL_MAX_RADIUS / 0.5);
      mat.opacity = easedPetalT * 0.85;
      petal.rotation.x = -easedPetalT * 0.4;

      const color = this.interpolatePetalColor(petalT);
      mat.color.copy(color);
    });

    if (t >= 1) {
      this.state = 'bloomed';
      this.stateTimer = 0;
      this.pollenTimer = 0;
      this.isBloomed = true;
      this.spawnPollenWave(Flower.POLLEN_PER_WAVE);
    }
  }

  private updateBloomed(delta: number): void {
    this.stateTimer += delta;
    this.pollenTimer += delta;

    const breathe = Math.sin(this.stateTimer * 2) * 0.03;
    this.petals.forEach((petal, i) => {
      const angle = this.stateTimer * 0.5 + i * 0.5;
      petal.rotation.z = Math.sin(angle) * 0.05;
      petal.scale.setScalar(Flower.PETAL_MAX_RADIUS / 0.5 + breathe);
    });

    if (this.pollenTimer >= this.pollenInterval) {
      this.pollenTimer = 0;
      this.spawnPollenWave(Flower.POLLEN_PER_WAVE);
    }

    if (this.stateTimer >= this.bloomedDuration) {
      this.startShrink();
    }
  }

  private updateShrinking(delta: number): void {
    this.stateTimer += delta;
    const t = Math.min(1, this.stateTimer / this.shrinkDuration);
    const easedT = easeInCubic(t);

    this.bud.scale.setScalar(0.5 + easedT * 0.5);
    (this.bud.material as THREE.MeshBasicMaterial).opacity = 0.4 + easedT * 0.5;

    this.petals.forEach((petal) => {
      const mat = petal.material as THREE.MeshBasicMaterial;
      const reverseT = 1 - easedT;
      petal.scale.setScalar(reverseT * Flower.PETAL_MAX_RADIUS / 0.5);
      mat.opacity = reverseT * 0.85;
    });

    if (t >= 1) {
      this.state = 'bud';
      this.isBloomed = false;
      this.petals.forEach(petal => {
        petal.scale.setScalar(0.01);
        (petal.material as THREE.MeshBasicMaterial).opacity = 0;
      });
    }
  }

  private spawnPollenWave(count: number): void {
    if (!this.pollenPoolPositions || !this.pollenPoolVelocities || !this.pollenPoolLives) return;

    let spawned = 0;
    for (let i = 0; i < this.maxPollenInPool && spawned < count; i++) {
      if (this.pollenPoolLives[i] <= 0) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = 0.3 + Math.random() * 0.5;

        this.pollenPoolPositions[i * 3] = 0;
        this.pollenPoolPositions[i * 3 + 1] = 0.1;
        this.pollenPoolPositions[i * 3 + 2] = 0;

        this.pollenPoolVelocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        this.pollenPoolVelocities[i * 3 + 1] = Math.cos(phi) * speed * 0.5 + 0.2;
        this.pollenPoolVelocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

        this.pollenPoolLives[i] = Flower.POLLEN_LIFE;
        spawned++;
        this.activePollenCount = Math.max(this.activePollenCount, i + 1);
      }
    }

    (this.pollenPool!.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private updatePollen(delta: number): void {
    if (!this.pollenPoolPositions || !this.pollenPoolVelocities || !this.pollenPoolLives || !this.pollenPool) return;

    for (let i = 0; i < this.activePollenCount; i++) {
      if (this.pollenPoolLives[i] > 0) {
        this.pollenPoolLives[i] -= delta;

        this.pollenPoolPositions[i * 3] += this.pollenPoolVelocities[i * 3] * delta;
        this.pollenPoolPositions[i * 3 + 1] += this.pollenPoolVelocities[i * 3 + 1] * delta;
        this.pollenPoolPositions[i * 3 + 2] += this.pollenPoolVelocities[i * 3 + 2] * delta;

        this.pollenPoolVelocities[i * 3] *= 0.98;
        this.pollenPoolVelocities[i * 3 + 1] -= delta * 0.1;
        this.pollenPoolVelocities[i * 3 + 2] *= 0.98;

        if (this.pollenPoolLives[i] <= 0) {
          this.pollenPoolPositions[i * 3] = 1000;
          this.pollenPoolPositions[i * 3 + 1] = 1000;
          this.pollenPoolPositions[i * 3 + 2] = 1000;
        }
      }
    }

    (this.pollenPool.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private interpolatePetalColor(t: number): THREE.Color {
    if (t < 0.5) {
      const localT = t * 2;
      return this.petals[0].userData.startColor.clone().lerp(
        this.petals[0].userData.midColor,
        easeOutCubic(localT)
      );
    } else {
      const localT = (t - 0.5) * 2;
      return this.petals[0].userData.midColor.clone().lerp(
        this.petals[0].userData.endColor,
        easeOutCubic(localT)
      );
    }
  }

  public dispose(): void {
    this.group.parent?.remove(this.group);
  }

  public static spawnFlowers(scene: THREE.Scene, count: number): Flower[] {
    const flowers: Flower[] = [];
    const noise2D = (x: number, z: number) => {
      return Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.5;
    };

    for (let i = 0; i < count; i++) {
      let x, y, z;
      const margin = 3;
      do {
        x = (Math.random() - 0.5) * 18;
        z = (Math.random() - 0.5) * 18;
      } while (Math.sqrt(x * x + z * z) < 2);

      y = 4 + Math.random() * 5;

      flowers.push(new Flower(new THREE.Vector3(x, y, z), scene));
    }
    return flowers;
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
