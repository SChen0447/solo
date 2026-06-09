import * as THREE from 'three';

export type OrbitType = 'low' | 'medium' | 'high';
export type OrbitFilter = 'all' | OrbitType;

export interface DebrisData {
  id: number;
  mesh: THREE.Mesh;
  orbitType: OrbitType;
  orbitRadius: number;
  inclination: number;
  speed: number;
  angle: number;
  eccentricity: number;
  size: number;
  baseColor: THREE.Color;
  altitudeKm: number;
  velocityKms: number;
  collisionRisk: number;
  isColliding: boolean;
  collisionFlashUntil: number;
  originalScale: THREE.Vector3;
}

export interface PulseRing {
  mesh: THREE.Mesh;
  startTime: number;
  position: THREE.Vector3;
}

const EARTH_RADIUS = 5;
const LOW_ORBIT_MIN = EARTH_RADIUS + 0.6;
const LOW_ORBIT_MAX = EARTH_RADIUS + 1.5;
const MED_ORBIT_MIN = LOW_ORBIT_MAX;
const MED_ORBIT_MAX = EARTH_RADIUS + 3.0;
const HIGH_ORBIT_MIN = MED_ORBIT_MAX;
const HIGH_ORBIT_MAX = EARTH_RADIUS + 5.0;

const KM_PER_UNIT = 1274.2;

export class SpaceScene {
  public scene: THREE.Scene;
  public earth: THREE.Mesh;
  public debris: DebrisData[] = [];
  public pulseRings: PulseRing[] = [];
  public stars: THREE.Points;
  public groundGrid: THREE.GridHelper;

  private debrisGroup: THREE.Group;
  private pulseGroup: THREE.Group;
  private debrisIdCounter = 0;
  private collisionThreshold = 0.5;

  public debrisCount: number = 200;
  public orbitFilter: OrbitFilter = 'all';
  public collisionAlertEnabled: boolean = true;
  public onStatsChange?: (low: number, medium: number, high: number) => void;

  constructor() {
    this.scene = new THREE.Scene();
    this.setupBackground();

    this.earth = this.createEarth();
    this.scene.add(this.earth);

    this.groundGrid = this.createGroundGrid();
    this.scene.add(this.groundGrid);

    this.stars = this.createStars();
    this.scene.add(this.stars);

    this.debrisGroup = new THREE.Group();
    this.scene.add(this.debrisGroup);

    this.pulseGroup = new THREE.Group();
    this.scene.add(this.pulseGroup);

    this.generateDebris(this.debrisCount);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1A1A2E');
    gradient.addColorStop(1, '#0D1117');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private createEarth(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const oceanColor = '#1A237E';
    const landColor = '#2E7D32';
    const atmosphereColor = '#4FC3F7';

    ctx.fillStyle = oceanColor;
    ctx.fillRect(0, 0, 1024, 512);

    ctx.fillStyle = landColor;
    const landShapes = [
      { x: 150, y: 120, w: 180, h: 100 },
      { x: 400, y: 80, w: 220, h: 140 },
      { x: 700, y: 150, w: 150, h: 90 },
      { x: 100, y: 300, w: 200, h: 120 },
      { x: 450, y: 320, w: 160, h: 100 },
      { x: 720, y: 300, w: 140, h: 130 },
      { x: 850, y: 80, w: 120, h: 70 },
    ];
    for (const shape of landShapes) {
      ctx.beginPath();
      ctx.ellipse(
        shape.x + shape.w / 2,
        shape.y + shape.h / 2,
        shape.w / 2,
        shape.h / 2,
        Math.random() * 0.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = landColor;
      ctx.globalAlpha = 0.7;
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 30 + 10;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const material = new THREE.MeshPhongMaterial({
      map: texture,
      specular: new THREE.Color(0x333333),
      shininess: 10,
    });

    const earthMesh = new THREE.Mesh(geometry, material);

    const atmosphereGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.05, 64, 64);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(atmosphereColor),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    earthMesh.add(atmosphere);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 8, 10);
    this.scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(0x4FC3F7, 0.3);
    rimLight.position.set(-10, -5, -10);
    this.scene.add(rimLight);

    return earthMesh;
  }

  private createGroundGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(10, 20, 0xffffff, 0xffffff);
    grid.position.y = -EARTH_RADIUS - 2;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.08;
    return grid;
  }

  private createStars(): THREE.Points {
    const starCount = 150;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const alphas = new Float32Array(starCount);
    const twinkleSpeeds = new Float32Array(starCount);
    const twinkleOffsets = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 60 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = Math.random() * 1.0 + 0.5;
      alphas[i] = Math.random() * 0.5 + 0.3;
      twinkleSpeeds[i] = Math.random() * 1.5 + 0.5;
      twinkleOffsets[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1));
    geometry.setAttribute('twinkleOffset', new THREE.BufferAttribute(twinkleOffsets, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.0,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(geometry, material);
    (stars as any).twinkleSpeeds = twinkleSpeeds;
    (stars as any).twinkleOffsets = twinkleOffsets;
    (stars as any).baseAlphas = alphas;
    return stars;
  }

  private getOrbitColor(orbitType: OrbitType): THREE.Color {
    switch (orbitType) {
      case 'low': return new THREE.Color('#FF5252');
      case 'medium': return new THREE.Color('#FFD740');
      case 'high': return new THREE.Color('#69F0AE');
    }
  }

  private getOrbitRadiusRange(orbitType: OrbitType): [number, number] {
    switch (orbitType) {
      case 'low': return [LOW_ORBIT_MIN, LOW_ORBIT_MAX];
      case 'medium': return [MED_ORBIT_MIN, MED_ORBIT_MAX];
      case 'high': return [HIGH_ORBIT_MIN, HIGH_ORBIT_MAX];
    }
  }

  private generateDebris(count: number): void {
    this.clearDebris();

    const orbitTypes: OrbitType[] = ['low', 'low', 'medium', 'high', 'medium'];
    for (let i = 0; i < count; i++) {
      const orbitType = orbitTypes[Math.floor(Math.random() * orbitTypes.length)];
      this.createDebris(orbitType);
    }
    this.updateStats();
  }

  private createDebris(orbitType: OrbitType): DebrisData {
    const [minR, maxR] = this.getOrbitRadiusRange(orbitType);
    const orbitRadius = minR + Math.random() * (maxR - minR);
    const inclination = Math.random() * (Math.PI / 4);
    const speed = (Math.random() * 0.15 + 0.05) * (Math.random() > 0.5 ? 1 : -1);
    const angle = Math.random() * Math.PI * 2;
    const eccentricity = Math.random() * 0.2;
    const size = Math.random() * 0.2 + 0.1;

    const geometry = new THREE.BoxGeometry(size, size, size);
    const color = this.getOrbitColor(orbitType);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      metalness: 0.6,
      roughness: 0.4,
    });

    const mesh = new THREE.Mesh(geometry, material);

    const data: DebrisData = {
      id: this.debrisIdCounter++,
      mesh,
      orbitType,
      orbitRadius,
      inclination,
      speed,
      angle,
      eccentricity,
      size,
      baseColor: color.clone(),
      altitudeKm: (orbitRadius - EARTH_RADIUS) * KM_PER_UNIT,
      velocityKms: (speed * 100 + 6) + Math.random() * 2,
      collisionRisk: Math.random() * 0.8 + 0.05,
      isColliding: false,
      collisionFlashUntil: 0,
      originalScale: new THREE.Vector3(1, 1, 1),
    };

    this.updateDebrisPosition(data, 0);
    mesh.userData.debrisData = data;
    this.debris.push(data);
    this.debrisGroup.add(mesh);
    return data;
  }

  public setDebrisCount(count: number): void {
    if (count === this.debris.length) return;

    if (count < this.debris.length) {
      const toRemove = this.debris.length - count;
      for (let i = 0; i < toRemove; i++) {
        const d = this.debris.pop()!;
        this.debrisGroup.remove(d.mesh);
        d.mesh.geometry.dispose();
        (d.mesh.material as THREE.Material).dispose();
      }
    } else {
      const toAdd = count - this.debris.length;
      const orbitTypes: OrbitType[] = ['low', 'low', 'medium', 'high', 'medium'];
      for (let i = 0; i < toAdd; i++) {
        const orbitType = orbitTypes[Math.floor(Math.random() * orbitTypes.length)];
        this.createDebris(orbitType);
      }
    }
    this.debrisCount = count;
    this.applyOrbitFilter();
    this.updateStats();
  }

  public setOrbitFilter(filter: OrbitFilter): void {
    this.orbitFilter = filter;
    this.applyOrbitFilter();
  }

  private applyOrbitFilter(): void {
    for (const d of this.debris) {
      if (this.orbitFilter === 'all' || d.orbitType === this.orbitFilter) {
        d.mesh.visible = true;
      } else {
        d.mesh.visible = false;
      }
    }
    this.updateStats();
  }

  public setCollisionAlertEnabled(enabled: boolean): void {
    this.collisionAlertEnabled = enabled;
    if (!enabled) {
      for (const d of this.debris) {
        d.isColliding = false;
        d.collisionFlashUntil = 0;
        this.resetDebrisColor(d);
      }
    }
  }

  private resetDebrisColor(d: DebrisData): void {
    const mat = d.mesh.material as THREE.MeshStandardMaterial;
    mat.color.copy(d.baseColor);
    mat.emissive.copy(d.baseColor);
    mat.emissiveIntensity = 0.3;
  }

  private updateDebrisPosition(d: DebrisData, time: number): void {
    const r = d.orbitRadius * (1 + d.eccentricity * Math.cos(d.angle));
    const x = r * Math.cos(d.angle);
    const z = r * Math.sin(d.angle) * Math.cos(d.inclination);
    const y = r * Math.sin(d.angle) * Math.sin(d.inclination);
    d.mesh.position.set(x, y, z);

    d.altitudeKm = (r - EARTH_RADIUS) * KM_PER_UNIT;
    d.mesh.rotation.x = time * d.speed * 2;
    d.mesh.rotation.y = time * d.speed * 3;
  }

  public update(delta: number, time: number): void {
    this.earth.rotation.y += delta * 0.05;

    for (const d of this.debris) {
      if (!d.mesh.visible) continue;
      d.angle += d.speed * delta;
      this.updateDebrisPosition(d, time);

      if (this.collisionAlertEnabled && d.collisionFlashUntil > 0) {
        if (time > d.collisionFlashUntil) {
          d.isColliding = false;
          this.resetDebrisColor(d);
        } else {
          const mat = d.mesh.material as THREE.MeshStandardMaterial;
          const flash = Math.sin(time * 30) * 0.5 + 0.5;
          mat.color.setRGB(1, flash * 0.3, flash * 0.3);
          mat.emissive.setRGB(1, 0, 0);
          mat.emissiveIntensity = 0.8;
        }
      }
    }

    if (this.collisionAlertEnabled) {
      this.checkCollisions(time);
    }

    this.updatePulseRings(time);
    this.updateStars(time);
  }

  private checkCollisions(time: number): void {
    const visible = this.debris.filter(d => d.mesh.visible);
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i];
        const b = visible[j];
        const dist = a.mesh.position.distanceTo(b.mesh.position);
        if (dist < this.collisionThreshold) {
          if (!a.isColliding) {
            a.isColliding = true;
            a.collisionFlashUntil = time + 0.3;
            this.createPulseRing(a.mesh.position.clone(), time);
          }
          if (!b.isColliding) {
            b.isColliding = true;
            b.collisionFlashUntil = time + 0.3;
            this.createPulseRing(b.mesh.position.clone(), time);
          }
          a.collisionRisk = Math.min(1, a.collisionRisk + 0.01);
          b.collisionRisk = Math.min(1, b.collisionRisk + 0.01);
        }
      }
    }
  }

  private createPulseRing(pos: THREE.Vector3, time: number): void {
    const geometry = new THREE.RingGeometry(0.1, 0.15, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFF5252,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    mesh.lookAt(this.earth.position);

    const pulse: PulseRing = { mesh, startTime: time, position: pos };
    this.pulseRings.push(pulse);
    this.pulseGroup.add(mesh);
  }

  private updatePulseRings(time: number): void {
    const duration = 0.8;
    for (let i = this.pulseRings.length - 1; i >= 0; i--) {
      const p = this.pulseRings[i];
      const elapsed = time - p.startTime;
      if (elapsed > duration) {
        this.pulseGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.pulseRings.splice(i, 1);
      } else {
        const t = elapsed / duration;
        const scale = 1 + t * 6;
        p.mesh.scale.set(scale, scale, scale);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
      }
    }
  }

  private updateStars(time: number): void {
    const twinkleSpeeds = (this.stars as any).twinkleSpeeds as Float32Array;
    const twinkleOffsets = (this.stars as any).twinkleOffsets as Float32Array;
    const baseAlphas = (this.stars as any).baseAlphas as Float32Array;
    const alphaAttr = this.stars.geometry.getAttribute('alpha') as THREE.BufferAttribute;

    for (let i = 0; i < twinkleSpeeds.length; i++) {
      const twinkle = Math.sin(time * twinkleSpeeds[i] * 2 * Math.PI + twinkleOffsets[i]);
      (alphaAttr.array as Float32Array)[i] = baseAlphas[i] * (0.6 + 0.4 * twinkle);
    }
    alphaAttr.needsUpdate = true;
  }

  private clearDebris(): void {
    for (const d of this.debris) {
      this.debrisGroup.remove(d.mesh);
      d.mesh.geometry.dispose();
      (d.mesh.material as THREE.Material).dispose();
    }
    this.debris = [];
    this.debrisIdCounter = 0;
  }

  public getDebrisMeshes(): THREE.Mesh[] {
    return this.debris.filter(d => d.mesh.visible).map(d => d.mesh);
  }

  private updateStats(): void {
    if (!this.onStatsChange) return;
    let low = 0, medium = 0, high = 0;
    for (const d of this.debris) {
      if (!d.mesh.visible && this.orbitFilter !== 'all') continue;
      if (d.orbitType === 'low') low++;
      else if (d.orbitType === 'medium') medium++;
      else high++;
    }
    this.onStatsChange(low, medium, high);
  }

  public getOrbitPath(d: DebrisData, futureSeconds: number, segments: number = 60): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const dt = futureSeconds / segments;
    for (let i = 0; i <= segments; i++) {
      const angle = d.angle + d.speed * dt * i;
      const r = d.orbitRadius * (1 + d.eccentricity * Math.cos(angle));
      const x = r * Math.cos(angle);
      const z = r * Math.sin(angle) * Math.cos(d.inclination);
      const y = r * Math.sin(angle) * Math.sin(d.inclination);
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }
}
