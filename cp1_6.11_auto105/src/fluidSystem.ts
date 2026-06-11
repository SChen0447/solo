import * as THREE from 'three';
import gsap from 'gsap';
import {
  createFluidMaterial,
  ColorTheme,
  ThemeName,
  COLOR_THEMES,
  getRandomThemeColor,
  adjustColorSaturation,
  lerpColor
} from './materials';

const LAMP_HEIGHT = 5;
const LAMP_RADIUS = 2;
const WALL_THICKNESS = 0.05;
const INNER_HEIGHT = LAMP_HEIGHT - WALL_THICKNESS * 2;
const INNER_RADIUS = LAMP_RADIUS - WALL_THICKNESS;

interface CollisionState {
  active: boolean;
  startTime: number;
  duration: number;
  magnitude: number;
  direction: THREE.Vector3;
}

interface MergeState {
  active: boolean;
  startTime: number;
  duration: number;
  targetOpacity: number;
  baseOpacity: number;
}

export class FluidBall {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  baseRadius: number;
  currentRadius: number;
  velocity: THREE.Vector3;
  baseSpeed: number;
  baseColorHex: string;
  targetColorHex: string;
  currentColorHex: string;
  baseSaturation: number;
  baseOpacity: number;
  id: number;
  isMovingUp: boolean;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmplitude: number;
  collisionState: CollisionState;
  mergeState: MergeState;
  positionOffset: THREE.Vector3;
  inertialForce: THREE.Vector3;
  inertialDamping: number;

  constructor(
    id: number,
    radius: number,
    startPosition: THREE.Vector3,
    colorHex: string,
    speed: number
  ) {
    this.id = id;
    this.baseRadius = radius;
    this.currentRadius = radius;
    this.baseColorHex = colorHex;
    this.targetColorHex = colorHex;
    this.currentColorHex = colorHex;
    this.baseSaturation = 70;
    this.baseOpacity = 0.85;
    this.baseSpeed = speed;
    this.isMovingUp = Math.random() > 0.5;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 1.5 + Math.random() * 1.0;
    this.wobbleAmplitude = 0.1 + Math.random() * 0.15;

    this.material = createFluidMaterial(colorHex);
    const geometry = new THREE.SphereGeometry(radius, 48, 48);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(startPosition);

    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      this.isMovingUp ? speed : -speed,
      (Math.random() - 0.5) * 0.3
    );

    this.collisionState = {
      active: false,
      startTime: 0,
      duration: 300,
      magnitude: 0,
      direction: new THREE.Vector3()
    };

    this.mergeState = {
      active: false,
      startTime: 0,
      duration: 500,
      targetOpacity: this.baseOpacity,
      baseOpacity: this.baseOpacity
    };

    this.positionOffset = new THREE.Vector3();
    this.inertialForce = new THREE.Vector3();
    this.inertialDamping = 0.95;
  }

  setTargetColor(colorHex: string, duration: number = 500): void {
    this.targetColorHex = colorHex;
    const startColor = this.currentColorHex;
    const progress = { t: 0 };

    gsap.to(progress, {
      t: 1,
      duration: duration / 1000,
      ease: 'power2.out',
      onUpdate: () => {
        this.currentColorHex = lerpColor(startColor, this.targetColorHex, progress.t);
        this.updateMaterialColor();
      }
    });
  }

  updateMaterialColor(): void {
    const adjustedColor = adjustColorSaturation(this.currentColorHex, this.baseSaturation);
    this.material.color.set(adjustedColor);
    this.material.emissive = new THREE.Color(adjustedColor).multiplyScalar(0.15);
  }

  setSaturation(saturation: number): void {
    this.baseSaturation = Math.min(Math.max(saturation, 0), 100);
    this.updateMaterialColor();
  }

  triggerCollision(direction: THREE.Vector3, magnitude: number = 0.1, now: number = performance.now()): void {
    this.collisionState.active = true;
    this.collisionState.startTime = now;
    this.collisionState.magnitude = magnitude;
    this.collisionState.direction.copy(direction).normalize();
  }

  triggerMerge(now: number = performance.now()): void {
    if (this.mergeState.active) return;
    this.mergeState.active = true;
    this.mergeState.startTime = now;
    this.mergeState.baseOpacity = this.material.opacity;
    this.mergeState.targetOpacity = Math.min(this.baseOpacity + 0.1, 1.0);
  }

  applyInertialForce(force: THREE.Vector3): void {
    this.inertialForce.add(force);
  }

  update(
    deltaTime: number,
    speedMultiplier: number,
    now: number
  ): void {
    const pos = this.mesh.position;
    const halfHeight = INNER_HEIGHT / 2;
    const maxRadius = INNER_RADIUS - this.baseRadius;

    this.wobblePhase += this.wobbleSpeed * deltaTime;

    this.inertialForce.multiplyScalar(this.inertialDamping);
    if (this.inertialForce.lengthSq() < 0.0001) {
      this.inertialForce.set(0, 0, 0);
    }

    const currentSpeed = this.baseSpeed * speedMultiplier;

    if (!this.collisionState.active) {
      this.velocity.y = this.isMovingUp ? currentSpeed : -currentSpeed;
    }

    this.velocity.x += this.inertialForce.x * deltaTime * 60;
    this.velocity.z += this.inertialForce.z * deltaTime * 60;

    this.velocity.x += Math.sin(this.wobblePhase * 1.3) * this.wobbleAmplitude * deltaTime;
    this.velocity.z += Math.cos(this.wobblePhase * 0.9) * this.wobbleAmplitude * deltaTime;

    const damping = 0.98;
    this.velocity.x *= damping;
    this.velocity.z *= damping;

    const maxHorizontalSpeed = 0.8 * speedMultiplier;
    const horizontalSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    if (horizontalSpeed > maxHorizontalSpeed) {
      const scale = maxHorizontalSpeed / horizontalSpeed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    pos.x += this.velocity.x * deltaTime;
    pos.y += this.velocity.y * deltaTime;
    pos.z += this.velocity.z * deltaTime;

    const horizontalDist = Math.sqrt(pos.x ** 2 + pos.z ** 2);
    if (horizontalDist > maxRadius) {
      const scale = maxRadius / horizontalDist;
      pos.x *= scale;
      pos.z *= scale;
      const nx = pos.x / horizontalDist;
      const nz = pos.z / horizontalDist;
      const dot = this.velocity.x * nx + this.velocity.z * nz;
      if (dot > 0) {
        this.velocity.x -= 2 * dot * nx;
        this.velocity.z -= 2 * dot * nz;
      }
    }

    const topLimit = halfHeight - this.baseRadius;
    const bottomLimit = -halfHeight + this.baseRadius;

    if (pos.y >= topLimit) {
      pos.y = topLimit;
      this.isMovingUp = false;
      this.randomizeColorFromCurrentTheme();
    } else if (pos.y <= bottomLimit) {
      pos.y = bottomLimit;
      this.isMovingUp = true;
      this.randomizeColorFromCurrentTheme();
    }

    this.updateCollisionDeformation(now);
    this.updateMergeEffect(now);
  }

  private randomizeColorFromCurrentTheme(): void {
    const currentTheme = this.getCurrentTheme();
    if (currentTheme) {
      const newColor = getRandomThemeColor(currentTheme);
      this.setTargetColor(newColor, 500);
    }
  }

  private getCurrentTheme(): ColorTheme | null {
    const baseColorObj = new THREE.Color(this.baseColorHex);
    const baseHsl = { h: 0, s: 0, l: 0 };
    baseColorObj.getHSL(baseHsl);

    let bestMatch: ColorTheme | null = null;
    let bestScore = Infinity;

    for (const theme of COLOR_THEMES) {
      for (const themeColor of theme.colors) {
        const themeColorObj = new THREE.Color(themeColor);
        const themeHsl = { h: 0, s: 0, l: 0 };
        themeColorObj.getHSL(themeHsl);
        const dist = Math.abs(baseHsl.h - themeHsl.h);
        const score = Math.min(dist, 1 - dist);
        if (score < bestScore) {
          bestScore = score;
          bestMatch = theme;
        }
      }
    }
    return bestMatch;
  }

  private updateCollisionDeformation(now: number): void {
    if (!this.collisionState.active) {
      this.mesh.scale.set(1, 1, 1);
      this.currentRadius = this.baseRadius;
      return;
    }

    const elapsed = now - this.collisionState.startTime;
    const progress = elapsed / this.collisionState.duration;

    if (progress >= 1) {
      this.collisionState.active = false;
      this.mesh.scale.set(1, 1, 1);
      this.currentRadius = this.baseRadius;
      return;
    }

    const deformCurve = 4 * progress * (1 - progress);
    const magnitude = this.collisionState.magnitude * deformCurve;

    const dir = this.collisionState.direction;
    const absX = Math.abs(dir.x);
    const absY = Math.abs(dir.y);
    const absZ = Math.abs(dir.z);
    const maxComp = Math.max(absX, absY, absZ);

    const scaleX = 1 + magnitude * (absX === maxComp ? -0.5 : (absX / maxComp) * 0.3);
    const scaleY = 1 + magnitude * (absY === maxComp ? -0.5 : (absY / maxComp) * 0.3);
    const scaleZ = 1 + magnitude * (absZ === maxComp ? -0.5 : (absZ / maxComp) * 0.3);

    this.mesh.scale.set(scaleX, scaleY, scaleZ);
    this.currentRadius = this.baseRadius * (1 + magnitude * 0.15);
  }

  private updateMergeEffect(now: number): void {
    if (!this.mergeState.active) {
      this.material.opacity = this.baseOpacity;
      return;
    }

    const elapsed = now - this.mergeState.startTime;
    const progress = elapsed / this.mergeState.duration;

    if (progress >= 1) {
      this.mergeState.active = false;
      this.material.opacity = this.baseOpacity;
      return;
    }

    const fadeCurve = 4 * progress * (1 - progress);
    this.material.opacity = this.mergeState.baseOpacity +
      (this.mergeState.targetOpacity - this.mergeState.baseOpacity) * fadeCurve;
  }

  checkCollisionWith(other: FluidBall): boolean {
    const dist = this.mesh.position.distanceTo(other.mesh.position);
    const minDist = this.currentRadius + other.currentRadius;
    return dist < minDist && dist > 0;
  }

  resolveCollisionWith(other: FluidBall, now: number): void {
    const posA = this.mesh.position;
    const posB = other.mesh.position;
    const distVec = new THREE.Vector3().subVectors(posA, posB);
    const dist = distVec.length();

    if (dist === 0) return;

    const normal = distVec.clone().normalize();
    const minDist = this.currentRadius + other.currentRadius;
    const overlap = (minDist - dist) / 2;

    posA.add(normal.clone().multiplyScalar(overlap));
    posB.sub(normal.clone().multiplyScalar(overlap));

    const relVel = new THREE.Vector3().subVectors(this.velocity, other.velocity);
    const velAlongNormal = relVel.dot(normal);

    if (velAlongNormal > 0) return;

    const restitution = 0.6;
    const impulse = -(1 + restitution) * velAlongNormal / 2;
    const impulseVec = normal.clone().multiplyScalar(impulse);

    this.velocity.add(impulseVec);
    other.velocity.sub(impulseVec);

    const deformMagnitude = 0.1;
    this.triggerCollision(normal.clone().negate(), deformMagnitude, now);
    other.triggerCollision(normal.clone(), deformMagnitude, now);

    this.triggerMerge(now);
    other.triggerMerge(now);
  }
}

export interface FluidSystemConfig {
  ballCount?: number;
  minRadius?: number;
  maxRadius?: number;
  minSpeed?: number;
  maxSpeed?: number;
  initialTheme?: ThemeName;
}

export class FluidSystem {
  balls: FluidBall[];
  group: THREE.Group;
  speedMultiplier: number;
  saturationLevel: number;
  currentTheme: ColorTheme;
  private lastCollisionCheck: number;
  private collisionCheckInterval: number;

  constructor(config: FluidSystemConfig = {}) {
    const {
      ballCount = 8,
      minRadius = 0.3,
      maxRadius = 1.0,
      minSpeed = 0.2,
      maxSpeed = 0.5,
      initialTheme = 'neon'
    } = config;

    this.balls = [];
    this.group = new THREE.Group();
    this.speedMultiplier = 1.0;
    this.saturationLevel = 70;
    this.lastCollisionCheck = 0;
    this.collisionCheckInterval = 16;

    this.currentTheme = COLOR_THEMES.find(t => t.name === initialTheme) || COLOR_THEMES[0];
    this.createBalls(ballCount, minRadius, maxRadius, minSpeed, maxSpeed);
  }

  private createBalls(
    count: number,
    minR: number,
    maxR: number,
    minSpd: number,
    maxSpd: number
  ): void {
    const halfHeight = INNER_HEIGHT / 2;

    for (let i = 0; i < count; i++) {
      const radius = minR + Math.random() * (maxR - minR);
      const speed = minSpd + Math.random() * (maxSpd - minSpd);
      const colorHex = getRandomThemeColor(this.currentTheme);

      let position: THREE.Vector3;
      let attempts = 0;
      do {
        const maxRad = INNER_RADIUS - radius - 0.05;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * maxRad;
        position = new THREE.Vector3(
          Math.cos(angle) * r,
          -halfHeight + radius + 0.1 + Math.random() * (INNER_HEIGHT - radius * 2 - 0.2),
          Math.sin(angle) * r
        );
        attempts++;
      } while (this.hasOverlap(position, radius) && attempts < 50);

      const ball = new FluidBall(i, radius, position, colorHex, speed);
      ball.setSaturation(this.saturationLevel);
      this.balls.push(ball);
      this.group.add(ball.mesh);
    }
  }

  private hasOverlap(pos: THREE.Vector3, radius: number): boolean {
    for (const ball of this.balls) {
      const dist = pos.distanceTo(ball.mesh.position);
      if (dist < radius + ball.baseRadius + 0.05) {
        return true;
      }
    }
    return false;
  }

  setHeatLevel(level: number): void {
    const t = Math.min(Math.max(level / 100, 0), 1);
    this.speedMultiplier = 0.2 / 0.2 + t * (1.5 / 0.2 - 1);
    this.speedMultiplier = 1 + t * 6.5;

    this.saturationLevel = 60 + t * 40;
    for (const ball of this.balls) {
      ball.setSaturation(this.saturationLevel);
    }
  }

  setTheme(themeName: ThemeName): void {
    const theme = COLOR_THEMES.find(t => t.name === themeName);
    if (!theme || theme.name === this.currentTheme.name) return;

    this.currentTheme = theme;
    for (const ball of this.balls) {
      const newColor = getRandomThemeColor(theme);
      ball.setTargetColor(newColor, 500);
      ball.baseColorHex = newColor;
    }
  }

  applyDragInertia(dragDeltaX: number, dragDeltaY: number): void {
    const forceScale = 0.02;
    const force = new THREE.Vector3(
      -dragDeltaX * forceScale,
      0,
      -dragDeltaY * forceScale
    );

    for (const ball of this.balls) {
      ball.applyInertialForce(force);
    }
  }

  update(deltaTime: number, now: number): void {
    for (const ball of this.balls) {
      ball.update(deltaTime, this.speedMultiplier, now);
    }

    if (now - this.lastCollisionCheck >= this.collisionCheckInterval) {
      this.checkCollisions(now);
      this.lastCollisionCheck = now;
    }
  }

  private checkCollisions(now: number): void {
    const len = this.balls.length;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        if (a.checkCollisionWith(b)) {
          a.resolveCollisionWith(b, now);
        }
      }
    }
  }
}
