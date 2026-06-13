import * as THREE from 'three';

const COLOR_BOTTOM = new THREE.Color(0x8B2500);
const COLOR_TOP = new THREE.Color(0xFFD700);
const COLOR_ASH_START = new THREE.Color(0xC0C0C0);
const COLOR_ASH_END = new THREE.Color(0xFFB060);
const COLOR_EMBER = new THREE.Color(0x666666);

export interface WindParams {
  direction: number;
  intensity: number;
  active: boolean;
  timeRemaining: number;
}

export class FlameParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  baseSize: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
  opacity: number;
  swayOffset: number;
  swaySpeed: number;
  swayAmplitude: number;
  isDying: boolean;
  deathProgress: number;
  mesh: THREE.Sprite;
  baseY: number;
  riseSpeed: number;

  constructor(baseX: number, baseZ: number, material: THREE.SpriteMaterial) {
    this.baseY = 0;
    this.position = new THREE.Vector3(
      baseX + (Math.random() - 0.5) * 8,
      this.baseY + Math.random() * 5,
      baseZ + (Math.random() - 0.5) * 8
    );
    this.riseSpeed = 0.6 + Math.random() * 0.8;
    this.velocity = new THREE.Vector3(0, this.riseSpeed, 0);
    this.baseSize = 4 + Math.random() * 8;
    this.size = this.baseSize;
    this.maxLife = 80 + Math.random() * 60;
    this.life = 0;
    this.color = new THREE.Color();
    this.opacity = 1;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.03 + Math.random() * 0.04;
    this.swayAmplitude = 2 + Math.random() * 3;
    this.isDying = false;
    this.deathProgress = 0;

    const spriteMaterial = material.clone();
    spriteMaterial.transparent = true;
    spriteMaterial.opacity = 1;
    this.mesh = new THREE.Sprite(spriteMaterial);
    this.mesh.scale.set(this.size, this.size, 1);
    this.mesh.position.copy(this.position);
  }

  update(wind: WindParams, time: number): boolean {
    if (this.isDying) {
      this.deathProgress += 1 / (0.6 * 60);
      const t = Math.min(this.deathProgress, 1);

      this.size = this.baseSize * (1 - t) + 1 * t;
      this.velocity.y -= 0.02;
      this.velocity.y = Math.max(this.velocity.y, -0.3);
      this.position.add(this.velocity);
      this.opacity = 0.3 * (1 - t);
      this.color.lerpColors(this.color.clone(), COLOR_EMBER, 0.05);

      this.mesh.scale.set(this.size, this.size, 1);
      const mat = this.mesh.material as THREE.SpriteMaterial;
      mat.opacity = this.opacity;
      mat.color.copy(this.color);
      this.mesh.position.copy(this.position);

      return t >= 1;
    }

    this.life += 1;
    const lifeRatio = this.life / this.maxLife;

    if (lifeRatio >= 0.85) {
      this.isDying = true;
      this.deathProgress = 0;
      this.velocity.set(
        (Math.random() - 0.5) * 0.5,
        this.velocity.y * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      return false;
    }

    const heightFactor = Math.max(0, Math.min(1, this.position.y / 80));
    this.color.lerpColors(COLOR_BOTTOM, COLOR_TOP, heightFactor);

    const sway = Math.sin(time * this.swaySpeed + this.swayOffset) * this.swayAmplitude * (0.3 + heightFactor * 0.7);

    let windX = 0;
    let windZ = 0;
    if (wind.active) {
      const windAngle = wind.direction;
      windX = Math.cos(windAngle) * wind.intensity * 0.5;
      windZ = Math.sin(windAngle) * wind.intensity * 0.3;
    }

    const targetVX = sway * 0.1 + windX;
    const targetVZ = windZ;
    const targetVY = (this.riseSpeed * (wind.active ? 1.6 : 1)) * (0.7 + Math.random() * 0.3);

    this.velocity.x += (targetVX - this.velocity.x) * 0.15;
    this.velocity.z += (targetVZ - this.velocity.z) * 0.15;
    this.velocity.y += (targetVY - this.velocity.y) * 0.1;

    this.position.add(this.velocity);

    const sizeMod = 1 - lifeRatio * 0.3 + Math.sin(time * 0.05 + this.swayOffset) * 0.08;
    this.size = this.baseSize * sizeMod * (heightFactor < 0.5 ? 1.2 : 1);

    this.opacity = Math.min(1, (1 - lifeRatio * 0.6) * (0.7 + Math.random() * 0.3));

    this.mesh.position.copy(this.position);
    this.mesh.scale.set(this.size, this.size, 1);
    const mat = this.mesh.material as THREE.SpriteMaterial;
    mat.opacity = this.opacity;
    mat.color.copy(this.color);

    return false;
  }

  reset(baseX: number, baseZ: number) {
    this.position.set(
      baseX + (Math.random() - 0.5) * 8,
      this.baseY + Math.random() * 3,
      baseZ + (Math.random() - 0.5) * 8
    );
    this.riseSpeed = 0.6 + Math.random() * 0.8;
    this.velocity.set(0, this.riseSpeed, 0);
    this.baseSize = 4 + Math.random() * 8;
    this.size = this.baseSize;
    this.maxLife = 80 + Math.random() * 60;
    this.life = 0;
    this.opacity = 1;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.03 + Math.random() * 0.04;
    this.swayAmplitude = 2 + Math.random() * 3;
    this.isDying = false;
    this.deathProgress = 0;
    this.color.copy(COLOR_BOTTOM);
    this.mesh.scale.set(this.size, this.size, 1);
    this.mesh.position.copy(this.position);
    const mat = this.mesh.material as THREE.SpriteMaterial;
    mat.opacity = 1;
    mat.color.copy(this.color);
  }
}

export class AshParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
  opacity: number;
  mesh: THREE.Sprite;
  gravity: number;

  constructor(startX: number, startY: number, startZ: number, material: THREE.SpriteMaterial) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    const upward = 1 + Math.random() * 2;

    this.position = new THREE.Vector3(
      startX + (Math.random() - 0.5) * 10,
      startY + Math.random() * 20,
      startZ + (Math.random() - 0.5) * 10
    );
    this.velocity = new THREE.Vector3(
      Math.cos(angle) * speed,
      upward,
      Math.sin(angle) * speed
    );
    this.size = 2 + Math.random() * 2;
    this.maxLife = 2 * 60;
    this.life = 0;
    this.color = new THREE.Color();
    this.opacity = 0.5 + Math.random() * 0.3;
    this.gravity = 0.02 + Math.random() * 0.02;

    const spriteMaterial = material.clone();
    spriteMaterial.transparent = true;
    spriteMaterial.opacity = this.opacity;
    this.mesh = new THREE.Sprite(spriteMaterial);
    this.mesh.scale.set(this.size, this.size, 1);
    this.mesh.position.copy(this.position);
  }

  update(): boolean {
    this.life += 1;
    const t = this.life / this.maxLife;

    if (t >= 1) return true;

    this.velocity.y -= this.gravity;
    this.velocity.x *= 0.99;
    this.velocity.z *= 0.99;
    this.position.add(this.velocity);

    this.color.lerpColors(COLOR_ASH_START, COLOR_ASH_END, t);

    const fadeStart = 0.5;
    if (t > fadeStart) {
      this.opacity = (0.5 + Math.random() * 0.3) * (1 - (t - fadeStart) / (1 - fadeStart));
    }

    this.mesh.position.copy(this.position);
    this.mesh.scale.set(this.size, this.size, 1);
    const mat = this.mesh.material as THREE.SpriteMaterial;
    mat.opacity = this.opacity;
    mat.color.copy(this.color);

    return false;
  }
}
