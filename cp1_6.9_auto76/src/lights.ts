import * as THREE from 'three';

export interface LightState {
  incidentAngle: number;
  beamCount: number;
}

interface LightBeam {
  mesh: THREE.Mesh;
  color: THREE.Color;
  direction: THREE.Vector3;
  origin: THREE.Vector3;
  length: number;
  isSecondary: boolean;
}

interface WallSpot {
  position: THREE.Vector3;
  baseColor: THREE.Color;
  color: THREE.Color;
  radius: number;
  mesh: THREE.Mesh;
  driftDir: THREE.Vector2;
  pulsePhase: number;
  pulsePeriod: number;
  brightness: number;
  flashIntensity: number;
}

interface ExpandingRing {
  mesh: THREE.Mesh;
  color: THREE.Color;
  center: THREE.Vector3;
  startTime: number;
  duration: number;
  originalRadius: number;
  maxRadius: number;
}

interface FusionBand {
  mesh: THREE.Mesh;
  colorA: THREE.Color;
  colorB: THREE.Color;
}

const SPECTRUM_COLORS = [
  new THREE.Color(0xff0000),
  new THREE.Color(0xff8800),
  new THREE.Color(0xffff00),
  new THREE.Color(0x00ff00),
  new THREE.Color(0x0044ff),
  new THREE.Color(0x8800ff),
];

const COMPLEMENTARY_COLORS: Record<string, THREE.Color> = {
  'ff0000': new THREE.Color(0x00ffff),
  'ff8800': new THREE.Color(0x0088ff),
  'ffff00': new THREE.Color(0x0000ff),
  '00ff00': new THREE.Color(0xff00ff),
  '0044ff': new THREE.Color(0xffaa00),
  '8800ff': new THREE.Color(0x88ff00),
};

export class LightSystem {
  public group: THREE.Group;
  public wallGroup: THREE.Group;
  public whiteBeam!: THREE.Mesh;
  public lightBeams: LightBeam[] = [];
  public wallSpots: WallSpot[] = [];
  public walls: THREE.Mesh[] = [];
  public rings: ExpandingRing[] = [];
  public fusionBands: FusionBand[] = [];

  private state: LightState = {
    incidentAngle: 0,
    beamCount: 6,
  };

  private audioContext: AudioContext | null = null;
  private raycaster = new THREE.Raycaster();

  constructor() {
    this.group = new THREE.Group();
    this.wallGroup = new THREE.Group();
    this.buildWalls();
    this.buildWhiteBeam();
    this.buildInitialBeams();
    this.group.add(this.wallGroup);
  }

  private buildWalls(): void {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x111122,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    const wallCount = 6;
    const radius = 10;
    const height = 20;

    for (let i = 0; i < wallCount; i++) {
      const angle = (i / wallCount) * Math.PI * 2;
      const nextAngle = ((i + 1) / wallCount) * Math.PI * 2;
      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;
      const x2 = Math.cos(nextAngle) * radius;
      const z2 = Math.sin(nextAngle) * radius;

      const width = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
      const geometry = new THREE.PlaneGeometry(width, height);
      const wall = new THREE.Mesh(geometry, wallMaterial.clone());
      const centerX = (x1 + x2) / 2;
      const centerZ = (z1 + z2) / 2;
      wall.position.set(centerX, 0, centerZ);
      wall.lookAt(0, 0, 0);
      wall.rotation.y += Math.PI;
      this.walls.push(wall);
      this.wallGroup.add(wall);
    }

    const topGeometry = new THREE.CircleGeometry(radius, 64);
    const topWall = new THREE.Mesh(topGeometry, wallMaterial.clone());
    topWall.position.y = height / 2;
    topWall.rotation.x = Math.PI / 2;
    this.walls.push(topWall);
    this.wallGroup.add(topWall);
  }

  private buildWhiteBeam(): void {
    const geometry = new THREE.CylinderGeometry(0.15, 0.15, 4, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffeeee,
      transparent: true,
      opacity: 0.85,
    });
    this.whiteBeam = new THREE.Mesh(geometry, material);
    this.whiteBeam.position.y = 3;
    this.group.add(this.whiteBeam);
  }

  private buildInitialBeams(): void {
    this.clearBeams();
    this.clearSpots();
    this.buildBeamsForAngle(0);
  }

  private clearBeams(): void {
    this.lightBeams.forEach((b) => {
      this.group.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    });
    this.lightBeams = [];
  }

  private clearSpots(): void {
    this.wallSpots.forEach((s) => {
      this.wallGroup.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    });
    this.wallSpots = [];
  }

  public buildBeamsForAngle(angleDeg: number): void {
    this.state.incidentAngle = angleDeg;
    const angleRad = (angleDeg * Math.PI) / 180;
    this.whiteBeam.rotation.z = angleRad;
    this.whiteBeam.position.set(Math.sin(angleRad) * 1.5, 3, 0);

    this.clearBeams();
    this.clearSpots();

    const extraSplits = Math.floor(Math.abs(angleDeg) / 5);
    this.state.beamCount = 6 + extraSplits;

    const baseDir = new THREE.Vector3(Math.sin(angleRad), -1, 0).normalize();
    const prismCenter = new THREE.Vector3(0, 0.5, 0);

    for (let i = 0; i < 6; i++) {
      const spread = ((i - 2.5) / 2.5) * 0.6;
      const dir = baseDir.clone();
      dir.x += spread;
      dir.z += (Math.random() - 0.5) * 0.2;
      dir.normalize();

      const color = SPECTRUM_COLORS[i];
      this.addBeam(prismCenter, dir, color, false);

      if (i < extraSplits) {
        const comp = COMPLEMENTARY_COLORS[color.getHexString()] || new THREE.Color(0xffffff);
        const secondaryDir = dir.clone();
        secondaryDir.x += (Math.random() - 0.5) * 0.4;
        secondaryDir.z += (Math.random() - 0.5) * 0.4;
        secondaryDir.normalize();
        this.addBeam(prismCenter, secondaryDir, comp, true);
      }
    }

    this.rebuildSpotsFromBeams();
  }

  private addBeam(origin: THREE.Vector3, direction: THREE.Vector3, color: THREE.Color, isSecondary: boolean): void {
    const length = isSecondary ? 1.5 + Math.random() : 3 + Math.random() * 2;
    const radius = isSecondary ? 0.04 : 0.06;
    const geometry = new THREE.ConeGeometry(radius, length, 8);
    geometry.translate(0, -length / 2, 0);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: isSecondary ? 0.3 : 0.5,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(origin);
    mesh.lookAt(origin.clone().add(direction).multiplyScalar(length));
    mesh.rotateX(Math.PI / 2);
    this.group.add(mesh);
    this.lightBeams.push({ mesh, color: color.clone(), direction: direction.clone(), origin: origin.clone(), length, isSecondary });
  }

  private rebuildSpotsFromBeams(): void {
    this.lightBeams.forEach((beam, idx) => {
      const hitPoint = this.raycastToWall(beam);
      if (hitPoint) {
        this.addWallSpot(hitPoint, beam.color, idx);
      }
    });
  }

  private raycastToWall(beam: LightBeam): THREE.Vector3 | null {
    this.raycaster.set(beam.origin, beam.direction);
    const intersects = this.raycaster.intersectObjects(this.walls, false);
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    return null;
  }

  private createSpotTexture(color: THREE.Color): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    const hex = '#' + color.getHexString();
    gradient.addColorStop(0, hex);
    gradient.addColorStop(0.4, hex);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private addWallSpot(position: THREE.Vector3, color: THREE.Color, _seed: number): void {
    const radius = 0.3 + Math.random() * 0.5;
    const texture = this.createSpotTexture(color);
    const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.lookAt(0, position.y, 0);
    this.wallGroup.add(mesh);
    this.wallSpots.push({
      position: position.clone(),
      baseColor: color.clone(),
      color: color.clone(),
      radius,
      mesh,
      driftDir: new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize(),
      pulsePhase: Math.random() * Math.PI * 2,
      pulsePeriod: 2 + Math.random() * 2,
      brightness: 0.7,
      flashIntensity: 0,
    });
  }

  public setIncidentAngle(angleDeg: number): void {
    this.buildBeamsForAngle(angleDeg);
  }

  public getState(): LightState {
    return { ...this.state };
  }

  public update(deltaTime: number, _elapsedTime: number): void {
    const dt = Math.min(deltaTime, 0.05);

    this.wallSpots.forEach((spot) => {
      spot.position.x += spot.driftDir.x * 0.1 * dt;
      spot.position.z += spot.driftDir.y * 0.1 * dt;

      const distFromCenter = Math.sqrt(spot.position.x ** 2 + spot.position.z ** 2);
      if (distFromCenter > 9) {
        spot.driftDir.multiplyScalar(-1);
      }

      spot.pulsePhase += (dt / spot.pulsePeriod) * Math.PI * 2;
      const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(spot.pulsePhase));

      if (spot.flashIntensity > 0) {
        spot.flashIntensity = Math.max(0, spot.flashIntensity - dt / 0.3);
      }

      spot.brightness = pulse + spot.flashIntensity;
      const opacity = THREE.MathUtils.clamp(0.4 + spot.brightness * 0.6, 0, 1);
      (spot.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      spot.mesh.position.copy(spot.position);
      spot.mesh.lookAt(0, spot.position.y, 0);
    });

    this.updateBeamsFromSpots();
    this.updateFusionBands();
    this.updateRings(dt);
  }

  private updateBeamsFromSpots(): void {
    this.lightBeams.forEach((beam, idx) => {
      if (this.wallSpots[idx]) {
        const spot = this.wallSpots[idx];
        const dir = spot.position.clone().sub(beam.origin).normalize();
        beam.direction.copy(dir);
        const len = spot.position.distanceTo(beam.origin);
        beam.length = len;

        beam.mesh.scale.y = len / (beam.isSecondary ? 2 : 4);
        beam.mesh.lookAt(beam.origin.clone().add(dir));
        beam.mesh.rotateX(Math.PI / 2);
      }
    });
  }

  private updateFusionBands(): void {
    this.fusionBands.forEach((band) => {
      this.wallGroup.remove(band.mesh);
      band.mesh.geometry.dispose();
      (band.mesh.material as THREE.Material).dispose();
    });
    this.fusionBands = [];

    const maxChecks = 20;
    let checks = 0;
    for (let i = 0; i < this.wallSpots.length && checks < maxChecks; i++) {
      for (let j = i + 1; j < this.wallSpots.length && checks < maxChecks; j++) {
        checks++;
        const a = this.wallSpots[i];
        const b = this.wallSpots[j];
        const dist = a.position.distanceTo(b.position);
        if (dist < 1.0) {
          this.createFusionBand(a, b);
        }
      }
    }
  }

  private createFusionBand(a: WallSpot, b: WallSpot): void {
    const mid = a.position.clone().add(b.position).multiplyScalar(0.5);
    const dir = b.position.clone().sub(a.position);
    const length = dir.length();
    const width = 0.2;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, '#' + a.color.getHexString());
    gradient.addColorStop(1, '#' + b.color.getHexString());
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 32);
    const texture = new THREE.CanvasTexture(canvas);

    const geometry = new THREE.PlaneGeometry(length, width);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(mid);
    mesh.lookAt(0, mid.y, 0);
    const angle = Math.atan2(dir.z, dir.x);
    mesh.rotateZ(-angle);
    this.wallGroup.add(mesh);
    this.fusionBands.push({ mesh, colorA: a.color.clone(), colorB: b.color.clone() });
  }

  private updateRings(_dt: number): void {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      const elapsed = performance.now() / 1000 - ring.startTime;
      if (elapsed >= ring.duration) {
        this.wallGroup.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
      } else {
        const t = elapsed / ring.duration;
        const currentRadius = THREE.MathUtils.lerp(ring.originalRadius, ring.maxRadius, t);
        const scale = currentRadius / ring.originalRadius;
        ring.mesh.scale.set(scale, scale, 1);
        (ring.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;
      }
    }
  }

  public handleClickOnSpot(spot: WallSpot): void {
    this.playSound();
    this.spawnExpandingRing(spot);
    this.flashNearbySpots(spot);
  }

  private playSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 440 + Math.random() * 440;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (_) {
    }
  }

  private spawnExpandingRing(spot: WallSpot): void {
    const originalRadius = 0.5;
    const maxRadius = 2.0;
    const texture = this.createRingTexture(spot.color);
    const geometry = new THREE.PlaneGeometry(originalRadius * 2, originalRadius * 2);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(spot.position);
    mesh.lookAt(0, spot.position.y, 0);
    this.wallGroup.add(mesh);
    this.rings.push({
      mesh,
      color: spot.color.clone(),
      center: spot.position.clone(),
      startTime: performance.now() / 1000,
      duration: 0.5,
      originalRadius,
      maxRadius,
    });
  }

  private createRingTexture(color: THREE.Color): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const hex = '#' + color.getHexString();

    const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.5);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, hex);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private flashNearbySpots(clickedSpot: WallSpot): void {
    this.wallSpots.forEach((spot) => {
      if (spot !== clickedSpot) {
        const dist = spot.position.distanceTo(clickedSpot.position);
        if (dist < 3) {
          spot.flashIntensity = 1.0;
        }
      }
    });
  }

  public findSpotAtScreenPosition(screenPos: THREE.Vector2, camera: THREE.PerspectiveCamera): WallSpot | null {
    this.raycaster.setFromCamera(screenPos, camera);
    let closest: WallSpot | null = null;
    let closestDist = Infinity;
    this.wallSpots.forEach((spot) => {
      const dist = this.raycaster.ray.distanceToPoint(spot.position);
      if (dist < spot.radius && dist < closestDist) {
        closestDist = dist;
        closest = spot;
      }
    });
    return closest;
  }
}
