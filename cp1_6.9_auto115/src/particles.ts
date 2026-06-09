import * as THREE from 'three';

export enum ParticleType {
  BUBBLE = 'bubble',
  FOOD = 'food',
  JELLYFISH_TRAIL = 'jellyfish_trail'
}

export interface Particle {
  mesh: THREE.Mesh;
  type: ParticleType;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

export class FoodParticle {
  public mesh: THREE.Mesh;
  public velocity: THREE.Vector3;
  public life: number;
  public eaten: boolean = false;

  constructor(position: THREE.Vector3, velocity: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(0.05, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 1
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    this.velocity = velocity;
    this.life = 8;
  }

  public update(delta: number, bounds: THREE.Box3): boolean {
    this.life -= delta;
    this.velocity.y -= 0.1 * delta;
    this.velocity.multiplyScalar(0.98);

    this.mesh.position.addScaledVector(this.velocity, delta);

    if (this.mesh.position.y < bounds.min.y + 0.1) {
      this.mesh.position.y = bounds.min.y + 0.1;
      this.velocity.set(0, 0, 0);
    }

    const mat = this.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.min(1, this.life / 2);

    return this.life <= 0 || this.eaten;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }
}

export class JellyfishObstacle {
  public mesh: THREE.Group;
  public velocity: THREE.Vector3;
  public life: number;
  public pulsePhase: number;

  constructor(position: THREE.Vector3, isSpecial: boolean = false) {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.2
    );
    this.life = isSpecial ? 15 : 5 + Math.random() * 5;
    this.pulsePhase = Math.random() * Math.PI * 2;

    const radius = isSpecial ? 0.2 + Math.random() * 0.2 : 0.3;

    const bellColor = isSpecial
      ? new THREE.Color().setHSL(0.5 + Math.random() * 0.3, 1, 0.6)
      : new THREE.Color(0xff69b4);

    const bellGeo = new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const bellMat = new THREE.MeshPhongMaterial({
      color: bellColor,
      transparent: true,
      opacity: isSpecial ? 0.5 : 0.6,
      side: THREE.DoubleSide,
      emissive: bellColor,
      emissiveIntensity: isSpecial ? 0.5 : 0.2
    });
    const bell = new THREE.Mesh(bellGeo, bellMat);
    bell.userData.isSpecial = isSpecial;
    this.mesh.add(bell);

    const tentacleCount = isSpecial ? 8 : 6;
    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const tentacleGeo = new THREE.CylinderGeometry(
        radius * 0.05,
        radius * 0.02,
        radius * (isSpecial ? 2.5 : 1.5),
        4
      );
      tentacleGeo.translate(0, -radius * (isSpecial ? 1.25 : 0.75), 0);

      const tentacleMat = new THREE.MeshPhongMaterial({
        color: bellColor,
        transparent: true,
        opacity: isSpecial ? 0.4 : 0.5,
        emissive: bellColor,
        emissiveIntensity: isSpecial ? 0.3 : 0.1
      });

      const tentacle = new THREE.Mesh(tentacleGeo, tentacleMat);
      tentacle.position.x = Math.cos(angle) * radius * 0.6;
      tentacle.position.z = Math.sin(angle) * radius * 0.6;
      tentacle.userData.baseAngle = angle;
      tentacle.userData.waveOffset = Math.random() * Math.PI * 2;
      this.mesh.add(tentacle);
    }

    if (isSpecial) {
      this.velocity.set(
        (Math.random() - 0.5) * 0.05,
        0.05,
        (Math.random() - 0.5) * 0.05
      );
    }
  }

  public update(delta: number, bounds: THREE.Box3, time: number): boolean {
    this.life -= delta;
    this.pulsePhase += delta * 2;

    this.mesh.position.addScaledVector(this.velocity, delta);

    const margin = 0.3;
    if (this.mesh.position.x < bounds.min.x + margin) this.velocity.x = Math.abs(this.velocity.x);
    if (this.mesh.position.x > bounds.max.x - margin) this.velocity.x = -Math.abs(this.velocity.x);
    if (this.mesh.position.y < bounds.min.y + margin) this.velocity.y = Math.abs(this.velocity.y);
    if (this.mesh.position.y > bounds.max.y - margin) this.velocity.y = -Math.abs(this.velocity.y);
    if (this.mesh.position.z < bounds.min.z + margin) this.velocity.z = Math.abs(this.velocity.z);
    if (this.mesh.position.z > bounds.max.z - margin) this.velocity.z = -Math.abs(this.velocity.z);

    const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
    if (this.mesh.children[0]) {
      this.mesh.children[0].scale.set(pulse, pulse, pulse);
    }

    for (let i = 1; i < this.mesh.children.length; i++) {
      const tentacle = this.mesh.children[i] as THREE.Mesh;
      const baseAngle = tentacle.userData.baseAngle as number;
      const waveOffset = tentacle.userData.waveOffset as number;
      const wave = Math.sin(time * 3 + waveOffset) * 0.3;
      tentacle.rotation.x = Math.cos(baseAngle) * wave;
      tentacle.rotation.z = Math.sin(baseAngle) * wave;
    }

    return this.life <= 0;
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  public getRadius(): number {
    const bell = this.mesh.children[0] as THREE.Mesh;
    return ((bell.geometry as THREE.SphereGeometry).parameters.radius || 0.3) * bell.scale.x;
  }

  public isSpecial(): boolean {
    const bell = this.mesh.children[0] as THREE.Mesh;
    return bell.userData.isSpecial === true;
  }
}

export class ParticleManager {
  public bubbles: Particle[] = [];
  public foods: FoodParticle[] = [];
  public jellyfishTrails: Particle[] = [];
  public jellyfishObstacles: JellyfishObstacle[] = [];
  public specialJellyfish: JellyfishObstacle[] = [];

  private scene: THREE.Scene;
  private bounds: THREE.Box3;
  private readonly MAX_PARTICLES = 200;

  private bubbleGeo: THREE.SphereGeometry;
  private trailGeo: THREE.SphereGeometry;
  private bubbleMat: THREE.MeshBasicMaterial;
  private trailMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.scene = scene;
    this.bounds = bounds;

    this.bubbleGeo = new THREE.SphereGeometry(0.05, 6, 6);
    this.trailGeo = new THREE.SphereGeometry(0.01, 4, 4);
    this.bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    });
    this.trailMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2
    });
  }

  public reset(): void {
    [...this.bubbles, ...this.jellyfishTrails].forEach((p) => this.scene.remove(p.mesh));
    this.foods.forEach((f) => this.scene.remove(f.mesh));
    [...this.jellyfishObstacles, ...this.specialJellyfish].forEach((j) => this.scene.remove(j.mesh));

    this.bubbles = [];
    this.foods = [];
    this.jellyfishTrails = [];
    this.jellyfishObstacles = [];
    this.specialJellyfish = [];
  }

  public getTotalParticleCount(): number {
    return this.bubbles.length + this.foods.length + this.jellyfishTrails.length;
  }

  public spawnBubbles(position: THREE.Vector3, count: number = 3): void {
    for (let i = 0; i < count; i++) {
      if (this.getTotalParticleCount() >= this.MAX_PARTICLES) break;

      const radius = 0.03 + Math.random() * 0.05;
      const geo = new THREE.SphereGeometry(radius, 6, 6);
      const mat = this.bubbleMat.clone();

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * 0.5;
      mesh.position.z += (Math.random() - 0.5) * 0.5;

      this.scene.add(mesh);
      this.bubbles.push({
        mesh,
        type: ParticleType.BUBBLE,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          0.1 + Math.random() * 0.05,
          (Math.random() - 0.5) * 0.05
        ),
        life: 5 + Math.random() * 3,
        maxLife: 8,
        size: radius
      });
    }
  }

  public spawnFood(position: THREE.Vector3, count: number = 10): void {
    for (let i = 0; i < count; i++) {
      if (this.getTotalParticleCount() >= this.MAX_PARTICLES) break;

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        0.2 + Math.random() * 0.2,
        (Math.random() - 0.5) * 0.5
      );
      velocity.y = -0.2;

      const food = new FoodParticle(position.clone(), velocity);
      this.scene.add(food.mesh);
      this.foods.push(food);
    }
  }

  public spawnJellyfishTrail(position: THREE.Vector3): void {
    if (this.getTotalParticleCount() >= this.MAX_PARTICLES) return;

    const mesh = new THREE.Mesh(this.trailGeo, this.trailMat.clone());
    mesh.position.copy(position);
    mesh.position.x += (Math.random() - 0.5) * 0.1;
    mesh.position.y += (Math.random() - 0.5) * 0.1;
    mesh.position.z += (Math.random() - 0.5) * 0.1;

    this.scene.add(mesh);
    this.jellyfishTrails.push({
      mesh,
      type: ParticleType.JELLYFISH_TRAIL,
      velocity: new THREE.Vector3(0, -0.02, 0),
      life: 1.5,
      maxLife: 1.5,
      size: 0.01
    });
  }

  public spawnJellyfishObstacle(): void {
    if (this.jellyfishObstacles.length >= 3) return;

    const x = this.bounds.min.x + 1 + Math.random() * (this.bounds.max.x - this.bounds.min.x - 2);
    const y = this.bounds.min.y + 1 + Math.random() * (this.bounds.max.y - this.bounds.min.y - 2);
    const z = this.bounds.min.z + 1 + Math.random() * (this.bounds.max.z - this.bounds.min.z - 2);

    const jelly = new JellyfishObstacle(new THREE.Vector3(x, y, z), false);
    this.scene.add(jelly.mesh);
    this.jellyfishObstacles.push(jelly);
  }

  public triggerJellyfishTide(): void {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const x = this.bounds.min.x + 0.5 + Math.random() * (this.bounds.max.x - this.bounds.min.x - 1);
      const z = this.bounds.min.z + 0.5 + Math.random() * (this.bounds.max.z - this.bounds.min.z - 1);
      const delay = i * 0.3;

      setTimeout(() => {
        const jelly = new JellyfishObstacle(
          new THREE.Vector3(x, this.bounds.min.y + 0.2, z),
          true
        );
        this.scene.add(jelly.mesh);
        this.specialJellyfish.push(jelly);
      }, delay * 1000);
    }
  }

  public update(delta: number, time: number): void {
    this.bubbles = this.bubbles.filter((b) => {
      b.life -= delta;
      b.velocity.x += (Math.random() - 0.5) * 0.01;
      b.velocity.z += (Math.random() - 0.5) * 0.01;
      b.mesh.position.addScaledVector(b.velocity, delta);
      (b.mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (b.life / b.maxLife);

      if (b.life <= 0 || b.mesh.position.y > this.bounds.max.y - 0.1) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });

    this.foods = this.foods.filter((f) => {
      const shouldRemove = f.update(delta, this.bounds);
      if (shouldRemove) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE.Material).dispose();
      }
      return !shouldRemove;
    });

    this.jellyfishTrails = this.jellyfishTrails.filter((t) => {
      t.life -= delta;
      t.mesh.position.addScaledVector(t.velocity, delta);
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = 0.2 * (t.life / t.maxLife);

      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        return false;
      }
      return true;
    });

    this.jellyfishObstacles = this.jellyfishObstacles.filter((j) => {
      const shouldRemove = j.update(delta, this.bounds, time);
      if (shouldRemove) {
        this.scene.remove(j.mesh);
        return false;
      }
      return true;
    });

    this.specialJellyfish = this.specialJellyfish.filter((j) => {
      const shouldRemove = j.update(delta, this.bounds, time);
      if (!shouldRemove && Math.random() < 0.3) {
        this.spawnJellyfishTrail(j.getPosition());
      }
      if (shouldRemove) {
        this.scene.remove(j.mesh);
        return false;
      }
      return true;
    });
  }

  public getFoodPositions(): THREE.Vector3[] {
    return this.foods.filter((f) => !f.eaten).map((f) => f.getPosition());
  }

  public eatFoodAt(pos: THREE.Vector3): boolean {
    for (let i = 0; i < this.foods.length; i++) {
      if (this.foods[i].eaten) continue;
      const dist = this.foods[i].getPosition().distanceTo(pos);
      if (dist < 0.3) {
        this.foods[i].eaten = true;
        this.scene.remove(this.foods[i].mesh);
        return true;
      }
    }
    return false;
  }

  public getJellyfishObstacles(): JellyfishObstacle[] {
    return this.jellyfishObstacles;
  }
}
