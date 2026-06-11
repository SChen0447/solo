import * as THREE from 'three';

const MAX_PHEROMONES = 200;

export class Pheromone {
  mesh: THREE.Mesh;
  age: number = 0;
  maxAge: number;
  initialOpacity: number = 0.7;
  currentOpacity: number = 0.7;
  isDead: boolean = false;
  fadingOut: boolean = false;
  fadeOutTimer: number = 0;
  fadeOutDuration: number = 0.2;
  fadeInTimer: number = 0;
  fadeInDuration: number = 0.2;
  evaporationRate: number = 1.0;

  private material: THREE.MeshBasicMaterial;
  private startScale: number;

  constructor(position: THREE.Vector3, evaporationRate: number) {
    this.evaporationRate = evaporationRate;
    this.maxAge = 5 + Math.random() * 3;

    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    this.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#90ee90'),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(position);
    this.mesh.position.y = 0.3;

    this.startScale = 1.0;
    this.currentOpacity = 0;
  }

  update(dt: number): void {
    if (this.isDead) return;

    if (this.fadingOut) {
      this.fadeOutTimer += dt;
      const t = Math.min(this.fadeOutTimer / this.fadeOutDuration, 1);
      const scale = this.startScale * (1 - t);
      this.mesh.scale.setScalar(Math.max(scale, 0.01));
      this.material.opacity = this.currentOpacity * (1 - t);
      if (t >= 1) {
        this.isDead = true;
      }
      return;
    }

    if (this.fadeInTimer < this.fadeInDuration) {
      this.fadeInTimer += dt;
      const t = Math.min(this.fadeInTimer / this.fadeInDuration, 1);
      this.material.opacity = this.initialOpacity * t;
      this.currentOpacity = this.initialOpacity * t;
    }

    this.age += dt * this.evaporationRate;
    if (this.age >= this.maxAge) {
      this.startFadeOut();
      return;
    }

    const lifeRatio = this.age / this.maxAge;
    const color = new THREE.Color('#90ee90').lerp(new THREE.Color('#ff6347'), lifeRatio);
    this.material.color.copy(color);

    this.currentOpacity = this.initialOpacity * (1 - lifeRatio * 0.5);
    if (this.fadeInTimer >= this.fadeInDuration) {
      this.material.opacity = this.currentOpacity;
    }
  }

  onDetected(): void {
    if (this.isDead || this.fadingOut) return;
    this.currentOpacity *= 0.85;
    if (this.fadeInTimer >= this.fadeInDuration) {
      this.material.opacity = this.currentOpacity;
    }
    if (this.currentOpacity < 0.05) {
      this.startFadeOut();
    }
  }

  private startFadeOut(): void {
    if (this.fadingOut) return;
    this.fadingOut = true;
    this.fadeOutTimer = 0;
    this.startScale = this.mesh.scale.x;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export class PheromoneManager {
  pheromones: Pheromone[] = [];

  addPheromone(position: THREE.Vector3, evaporationRate: number): Pheromone {
    if (this.pheromones.length >= MAX_PHEROMONES) {
      const oldest = this.pheromones.shift();
      if (oldest) {
        oldest.isDead = true;
        oldest.dispose();
      }
    }
    const p = new Pheromone(position, evaporationRate);
    this.pheromones.push(p);
    return p;
  }

  update(dt: number): Pheromone[] {
    const dead: Pheromone[] = [];
    for (let i = this.pheromones.length - 1; i >= 0; i--) {
      const p = this.pheromones[i];
      p.update(dt);
      if (p.isDead) {
        dead.push(p);
        this.pheromones.splice(i, 1);
      }
    }
    return dead;
  }

  clear(): void {
    for (const p of this.pheromones) {
      p.dispose();
    }
    this.pheromones.length = 0;
  }

  getTotalCount(): number {
    return this.pheromones.length;
  }
}
