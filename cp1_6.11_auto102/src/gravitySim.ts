import * as THREE from 'three';
import gsap from 'gsap';

export interface SatelliteState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  active: boolean;
  trail: THREE.Vector3[];
  capturedBy?: string;
  deflectionAngle: number;
  inGravityField: boolean;
  nearestPlanet?: string;
  initialDirection: THREE.Vector3;
}

export interface ExplosionParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

const G = 50;
const TIME_STEP = 0.01;
const INFLUENCE_RADIUS = 5;
const MAX_TRAIL_POINTS = 300;
const TRAIL_SPACING = 0.5;

export class GravitySimulation {
  public scene: THREE.Scene;
  public satellite!: THREE.Mesh;
  public satelliteTrail!: THREE.Points;
  public state: SatelliteState | null = null;
  public gravityStrength: number = 1.0;
  public arrowHelper!: THREE.ArrowHelper;
  public isAiming: boolean = false;
  public aimStart: THREE.Vector3 | null = null;
  public aimEnd: THREE.Vector3 | null = null;
  private explosions: ExplosionParticle[] = [];
  private camera: THREE.PerspectiveCamera;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.createSatellite();
    this.createArrowHelper();
  }

  private createSatellite(): void {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd0d0e0,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x404060,
      emissiveIntensity: 0.3
    });
    this.satellite = new THREE.Mesh(geometry, material);
    this.satellite.castShadow = true;
    this.satellite.visible = false;
    this.scene.add(this.satellite);

    const trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_TRAIL_POINTS * 3);
    const colors = new Float32Array(MAX_TRAIL_POINTS * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const trailMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.satelliteTrail = new THREE.Points(trailGeometry, trailMaterial);
    this.scene.add(this.satelliteTrail);
  }

  private createArrowHelper(): void {
    const dir = new THREE.Vector3(1, 0, 0);
    const origin = new THREE.Vector3(0, 0, 0);
    this.arrowHelper = new THREE.ArrowHelper(dir, origin, 5, 0x00ffcc, 0.8, 0.4);
    (this.arrowHelper.cone.material as THREE.MeshBasicMaterial).transparent = true;
    (this.arrowHelper.cone.material as THREE.MeshBasicMaterial).opacity = 0.8;
    (this.arrowHelper.line.material as THREE.LineBasicMaterial).transparent = true;
    (this.arrowHelper.line.material as THREE.LineBasicMaterial).opacity = 0.6;
    this.arrowHelper.visible = false;
    this.scene.add(this.arrowHelper);
  }

  public startAim(worldPos: THREE.Vector3): void {
    this.aimStart = worldPos.clone();
    this.aimEnd = worldPos.clone();
    this.isAiming = true;

    this.arrowHelper.position.copy(worldPos);
    this.arrowHelper.setDirection(new THREE.Vector3(1, 0, 0));
    this.arrowHelper.setLength(0.1);
    this.arrowHelper.visible = true;
  }

  public updateAim(currentWorldPos: THREE.Vector3): void {
    if (!this.isAiming || !this.aimStart) return;

    this.aimEnd = currentWorldPos.clone();
    const direction = new THREE.Vector3().subVectors(currentWorldPos, this.aimStart);
    const length = direction.length();

    if (length > 0.1) {
      direction.normalize();
      this.arrowHelper.setDirection(direction);
      this.arrowHelper.setLength(Math.min(length * 2, 15), 0.8, 0.4);
    }
  }

  public launchSatellite(): void {
    if (!this.isAiming || !this.aimStart || !this.aimEnd) {
      this.cancelAim();
      return;
    }

    const direction = new THREE.Vector3().subVectors(this.aimEnd, this.aimStart);
    const speed = Math.min(direction.length() * 0.8, 20);
    direction.normalize();

    this.state = {
      position: this.aimStart.clone(),
      velocity: direction.multiplyScalar(Math.max(speed, 2)),
      active: true,
      trail: [this.aimStart.clone()],
      deflectionAngle: 0,
      inGravityField: false,
      initialDirection: direction.clone()
    };

    this.satellite.position.copy(this.aimStart);
    this.satellite.visible = true;

    this.cancelAim();
  }

  public cancelAim(): void {
    this.isAiming = false;
    this.aimStart = null;
    this.aimEnd = null;
    this.arrowHelper.visible = false;
  }

  public resetSatellite(): void {
    if (this.state) {
      this.state.active = false;
    }
    this.state = null;
    this.satellite.visible = false;
    this.cancelAim();

    const positions = this.satelliteTrail.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.satelliteTrail.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
      positions.setXYZ(i, 0, 0, -10000);
      colors.setXYZ(i, 0, 0, 0);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;

    this.clearExplosions();
  }

  public setGravityStrength(strength: number): void {
    this.gravityStrength = strength;
  }

  public update(
    deltaTime: number,
    planetPositions: Map<string, { position: THREE.Vector3; radius: number; mass: number; name: string }>
  ): void {
    if (this.state && this.state.active) {
      const steps = Math.ceil(deltaTime / TIME_STEP);
      const dt = deltaTime / steps;

      for (let s = 0; s < steps; s++) {
        this.physicsStep(dt, planetPositions);
      }

      this.satellite.position.copy(this.state.position);
      this.updateTrail();
      this.checkBounds();
    }

    this.updateExplosions(deltaTime);
  }

  private physicsStep(
    dt: number,
    planetPositions: Map<string, { position: THREE.Vector3; radius: number; mass: number; name: string }>
  ): void {
    if (!this.state) return;

    const totalForce = new THREE.Vector3(0, 0, 0);
    let inField = false;
    let nearestPlanetName: string | undefined;
    let minDist = Infinity;

    planetPositions.forEach((planet) => {
      const toPlanet = new THREE.Vector3().subVectors(planet.position, this.state!.position);
      const distance = toPlanet.length();

      if (distance < minDist) {
        minDist = distance;
        nearestPlanetName = planet.name;
      }

      const influenceDist = INFLUENCE_RADIUS + planet.radius * 2;
      if (distance < influenceDist) {
        inField = true;
      }

      if (distance < planet.radius + 0.3) {
        this.createExplosion(this.state!.position, planet.name);
        this.state!.active = false;
        return;
      }

      const forceMag = (G * planet.mass * this.gravityStrength) / (distance * distance + 0.1);
      toPlanet.normalize().multiplyScalar(forceMag);
      totalForce.add(toPlanet);
    });

    if (!this.state.active) return;

    this.state.inGravityField = inField;
    this.state.nearestPlanet = nearestPlanetName;

    this.state.velocity.add(totalForce.multiplyScalar(dt));
    this.state.position.add(this.state.velocity.clone().multiplyScalar(dt));

    const currentDir = this.state.velocity.clone().normalize();
    const dot = THREE.MathUtils.clamp(currentDir.dot(this.state.initialDirection), -1, 1);
    this.state.deflectionAngle = (Math.acos(dot) * 180) / Math.PI;

    const lastTrail = this.state.trail[this.state.trail.length - 1];
    if (lastTrail && this.state.position.distanceTo(lastTrail) >= TRAIL_SPACING) {
      this.state.trail.push(this.state.position.clone());
      if (this.state.trail.length > MAX_TRAIL_POINTS) {
        this.state.trail.shift();
      }
    }

    if (inField && nearestPlanetName && !this.state.capturedBy) {
      const planet = planetPositions.get(nearestPlanetName);
      if (planet) {
        const escapeVel = Math.sqrt((2 * G * planet.mass * this.gravityStrength) / (minDist + 0.1));
        const currentSpeed = this.state.velocity.length();

        const toPlanet2 = new THREE.Vector3().subVectors(planet.position, this.state.position);
        const relativeVel = this.state.velocity.clone();
        const tangent = new THREE.Vector3(-toPlanet2.z, 0, toPlanet2.x).normalize();
        const radialVel = relativeVel.dot(toPlanet2.clone().normalize());

        if (currentSpeed < escapeVel * 0.8 && Math.abs(radialVel) < currentSpeed * 0.5) {
          this.state.capturedBy = nearestPlanetName;
        } else if (minDist < planet.radius + 1.5 && currentSpeed > escapeVel) {
          this.createExplosion(this.state.position, nearestPlanetName);
        }
      }
    }
  }

  private updateTrail(): void {
    if (!this.state) return;

    const positions = this.satelliteTrail.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.satelliteTrail.geometry.attributes.color as THREE.BufferAttribute;

    const trailLen = this.state.trail.length;
    for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
      if (i < trailLen) {
        const point = this.state.trail[i];
        positions.setXYZ(i, point.x, point.y, point.z);

        const t = i / Math.max(trailLen - 1, 1);
        const inField = this.state.inGravityField;

        if (inField) {
          const r = 0.8 + 0.2 * t;
          const g = 0.2 * (1 - t);
          const b = 0.2 * (1 - t);
          colors.setXYZ(i, r, g, b);
        } else {
          const r = 0.3 + 0.7 * t;
          const g = 0.6 + 0.4 * t;
          const b = 1.0;
          colors.setXYZ(i, r, g, b);
        }
      } else {
        positions.setXYZ(i, 0, 0, -10000);
        colors.setXYZ(i, 0, 0, 0);
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  private checkBounds(): void {
    if (!this.state) return;
    const dist = this.state.position.length();
    if (dist > 200) {
      this.state.active = false;
    }
  }

  private createExplosion(position: THREE.Vector3, planetName: string): void {
    const planetColors: Record<string, number> = {
      '水星': 0xb0a89a,
      '金星': 0xe8c87a,
      '地球': 0x4a90d9,
      '火星': 0xc46a4a,
      '木星': 0xd4a070,
      '土星': 0xe0c08a,
      '天王星': 0x80c0d0,
      '海王星': 0x3060a0,
      '太阳': 0xffaa00
    };
    const color = planetColors[planetName] || 0xffffff;

    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 5;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      this.scene.add(mesh);
      this.explosions.push({
        mesh,
        velocity,
        life: 0.3,
        maxLife: 0.3
      });

      gsap.to(material, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(mesh.scale, {
        x: 0.1,
        y: 0.1,
        z: 0.1,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  }

  private updateExplosions(deltaTime: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const p = this.explosions[i];
      p.life -= deltaTime;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.explosions.splice(i, 1);
      }
    }
  }

  private clearExplosions(): void {
    this.explosions.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.explosions = [];
  }

  public getSatelliteScreenPosition(): THREE.Vector2 | null {
    if (!this.state || !this.state.active) return null;
    const pos = this.state.position.clone().project(this.camera);
    if (pos.z > 1 || pos.z < -1) return null;
    return new THREE.Vector2(
      (pos.x + 1) / 2 * window.innerWidth,
      (-pos.y + 1) / 2 * window.innerHeight
    );
  }

  public getDeflectionAngle(): number {
    return this.state?.deflectionAngle || 0;
  }

  public isInGravityField(): boolean {
    return this.state?.inGravityField || false;
  }
}
