import * as THREE from 'three';

const COLOR_LOW = new THREE.Color(0x00ff88);
const COLOR_HIGH = new THREE.Color(0xff4444);
const COLOR_QUAKE = new THREE.Color(0x4488ff);
const COLORS = [COLOR_LOW, COLOR_HIGH, COLOR_QUAKE];

const DEFAULT_COUNT = 50;
const REDUCED_COUNT = 30;
const POSITION_REFRESH_INTERVAL = 5;
const DATA_REFRESH_INTERVAL = 2;
const FADE_DURATION = 0.5;
const PULSE_PERIOD = 1;
const BEAM_RADIUS = 0.03;
const HALO_RADIUS = 0.05;
const PULSE_RADIUS = 0.04;

interface DataPoint {
  group: THREE.Group;
  beam: THREE.Mesh;
  beamMaterial: THREE.MeshBasicMaterial;
  halo: THREE.Mesh;
  haloMaterial: THREE.MeshBasicMaterial;
  pulse: THREE.Mesh;
  pulseMaterial: THREE.MeshBasicMaterial;
  height: number;
  dataValue: number;
  colorIndex: number;
  fadeProgress: number;
  fadeDirection: number;
  pulseTime: number;
  active: boolean;
}

export class DataPoints {
  public group: THREE.Group;
  private points: DataPoint[] = [];
  private earthRadius: number;
  private positionTimer: number = 0;
  private dataTimer: number = 0;
  private isReduced: boolean = false;

  constructor(earthRadius: number) {
    this.earthRadius = earthRadius;
    this.group = new THREE.Group();
    this.createPoints(DEFAULT_COUNT);
  }

  private createPoints(count: number): void {
    while (this.points.length < count) {
      const point = this.createSinglePoint();
      this.points.push(point);
      this.group.add(point.group);
    }

    for (let i = 0; i < this.points.length; i++) {
      const visible = i < count;
      this.points[i].group.visible = visible;
      this.points[i].active = visible;
      if (visible) {
        this.randomizePosition(this.points[i]);
        this.randomizeData(this.points[i]);
        this.points[i].fadeProgress = 1;
        this.points[i].fadeDirection = 0;
      }
    }
  }

  private createSinglePoint(): DataPoint {
    const group = new THREE.Group();

    const height = 1 + Math.random() * 2;
    const beamGeometry = new THREE.CylinderGeometry(BEAM_RADIUS, BEAM_RADIUS * 0.3, height, 8, 1, true);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.y = height / 2;

    const haloGeometry = new THREE.SphereGeometry(HALO_RADIUS, 16, 16);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.y = height;

    const pulseGeometry = new THREE.SphereGeometry(PULSE_RADIUS, 12, 12);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulse.position.y = 0;

    group.add(beam);
    group.add(halo);
    group.add(pulse);

    return {
      group,
      beam,
      beamMaterial,
      halo,
      haloMaterial,
      pulse,
      pulseMaterial,
      height,
      dataValue: Math.random(),
      colorIndex: 0,
      fadeProgress: 0,
      fadeDirection: 1,
      pulseTime: Math.random() * PULSE_PERIOD,
      active: false
    };
  }

  private randomizePosition(point: DataPoint): void {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = this.earthRadius * Math.sin(phi) * Math.cos(theta);
    const y = this.earthRadius * Math.sin(phi) * Math.sin(theta);
    const z = this.earthRadius * Math.cos(phi);

    point.group.position.set(x, y, z);
    point.group.lookAt(x * 2, y * 2, z * 2);
    point.group.rotateX(Math.PI / 2);

    point.height = 1 + Math.random() * 2;
    point.beam.geometry.dispose();
    point.beam.geometry = new THREE.CylinderGeometry(
      BEAM_RADIUS, BEAM_RADIUS * 0.3, point.height, 8, 1, true
    );
    point.beam.position.y = point.height / 2;
    point.halo.position.y = point.height;
  }

  private randomizeData(point: DataPoint): void {
    point.dataValue = Math.random();
    point.colorIndex = Math.floor(Math.random() * 3);
    const color = COLORS[point.colorIndex];
    point.beamMaterial.color.copy(color);
    point.haloMaterial.color.copy(color);
    point.pulseMaterial.color.copy(color);
  }

  private updateFade(point: DataPoint, delta: number): void {
    if (point.fadeDirection !== 0) {
      point.fadeProgress += (point.fadeDirection * delta) / FADE_DURATION;

      if (point.fadeProgress >= 1) {
        point.fadeProgress = 1;
        point.fadeDirection = 0;
      } else if (point.fadeProgress <= 0) {
        point.fadeProgress = 0;
        if (point.fadeDirection < 0) {
          this.randomizePosition(point);
          this.randomizeData(point);
          point.fadeDirection = 1;
        } else {
          point.fadeDirection = 0;
        }
      }

      const alpha = point.fadeProgress * 0.6;
      point.beamMaterial.opacity = alpha;
      point.haloMaterial.opacity = point.fadeProgress * 0.9;
      point.pulseMaterial.opacity = point.fadeProgress;
    }
  }

  private updatePulse(point: DataPoint, delta: number): void {
    if (!point.active || point.fadeProgress < 0.5) return;

    point.pulseTime += delta;
    if (point.pulseTime >= PULSE_PERIOD) {
      point.pulseTime -= PULSE_PERIOD;
    }

    const pulseRatio = point.pulseTime / PULSE_PERIOD;
    const brightness = 0.2 + Math.abs(Math.sin(pulseRatio * Math.PI)) * 0.8;
    const pulseScale = 0.8 + brightness * 0.6;
    point.pulse.scale.setScalar(pulseScale);
    point.pulseMaterial.opacity = point.fadeProgress * brightness;
  }

  public update(delta: number): void {
    this.positionTimer += delta;
    this.dataTimer += delta;

    if (this.dataTimer >= DATA_REFRESH_INTERVAL) {
      this.dataTimer = 0;
      for (const point of this.points) {
        if (point.active && point.fadeDirection === 0) {
          this.randomizeData(point);
        }
      }
    }

    if (this.positionTimer >= POSITION_REFRESH_INTERVAL) {
      this.positionTimer = 0;
      for (const point of this.points) {
        if (point.active && point.fadeDirection === 0) {
          point.fadeDirection = -1;
        }
      }
    }

    for (const point of this.points) {
      if (!point.active) continue;
      this.updateFade(point, delta);
      this.updatePulse(point, delta);
    }
  }

  public reduceQuality(): void {
    if (this.isReduced) return;
    this.isReduced = true;
    for (let i = 0; i < this.points.length; i++) {
      if (i >= REDUCED_COUNT && this.points[i].active) {
        this.points[i].active = false;
        this.points[i].group.visible = false;
      }
    }
  }

  public restoreQuality(): void {
    if (!this.isReduced) return;
    this.isReduced = false;
    for (let i = 0; i < this.points.length; i++) {
      if (i < DEFAULT_COUNT && !this.points[i].active) {
        this.points[i].active = true;
        this.points[i].group.visible = true;
        this.randomizePosition(this.points[i]);
        this.randomizeData(this.points[i]);
        this.points[i].fadeProgress = 0;
        this.points[i].fadeDirection = 1;
      }
    }
  }

  public getActiveCount(): number {
    let count = 0;
    for (const p of this.points) {
      if (p.active) count++;
    }
    return count;
  }

  public isQualityReduced(): boolean {
    return this.isReduced;
  }
}
