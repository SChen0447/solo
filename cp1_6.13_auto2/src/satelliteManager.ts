import * as THREE from 'three';
import type { SatelliteTelemetry } from './ui';

export interface OrbitConfig {
  id: string;
  name: string;
  color: number;
  colorHex: string;
  altitude: number;
  inclination: number;
  speed: number;
  phase: number;
}

const ORBIT_CONFIGS: OrbitConfig[] = [
  {
    id: 'sat-blue',
    name: '轨道卫星 ALPHA',
    color: 0x00d4ff,
    colorHex: '#00d4ff',
    altitude: 1.6,
    inclination: 30,
    speed: 0.18,
    phase: 0
  },
  {
    id: 'sat-green',
    name: '轨道卫星 BETA',
    color: 0x39ff14,
    colorHex: '#39ff14',
    altitude: 1.85,
    inclination: 65,
    speed: 0.14,
    phase: Math.PI * 0.6
  },
  {
    id: 'sat-pink',
    name: '轨道卫星 GAMMA',
    color: 0xff3ec7,
    colorHex: '#ff3ec7',
    altitude: 2.1,
    inclination: 110,
    speed: 0.11,
    phase: Math.PI * 1.3
  }
];

const EARTH_RADIUS = 1.0;
const SEGMENTS = 256;
const TRAIL_LENGTH = 40;

export class SatelliteManager {
  private scene: THREE.Scene;
  private orbitLines: Map<string, THREE.Line> = new Map();
  private flowLines: Map<string, THREE.Line> = new Map();
  private satellites: Map<string, THREE.Group> = new Map();
  private halos: Map<string, THREE.Mesh> = new Map();
  private trails: Map<string, THREE.Points> = new Map();
  private trailPositions: Map<string, THREE.Vector3[]> = new Map();
  private configs: OrbitConfig[] = ORBIT_CONFIGS;
  private elapsedTime: number = 0;
  private angles: Map<string, number> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
  }

  private init(): void {
    this.configs.forEach((cfg) => {
      this.angles.set(cfg.id, cfg.phase);
      this.createOrbitLine(cfg);
      this.createFlowLine(cfg);
      this.createSatellite(cfg);
      this.createTrail(cfg);
    });
  }

  private createOrbitLine(cfg: OrbitConfig): void {
    const points: THREE.Vector3[] = [];
    const incRad = (cfg.inclination * Math.PI) / 180;
    const radius = EARTH_RADIUS + cfg.altitude;

    for (let i = 0; i <= SEGMENTS; i++) {
      const theta = (i / SEGMENTS) * Math.PI * 2;
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta) * Math.cos(incRad);
      const y = radius * Math.sin(theta) * Math.sin(incRad);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.35
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.orbitLines.set(cfg.id, line);
  }

  private createFlowLine(cfg: OrbitConfig): void {
    const points: THREE.Vector3[] = [];
    const incRad = (cfg.inclination * Math.PI) / 180;
    const radius = EARTH_RADIUS + cfg.altitude;
    const flowSegments = 60;
    const startPhase = 0;
    const arcLength = Math.PI * 0.6;

    for (let i = 0; i <= flowSegments; i++) {
      const t = i / flowSegments;
      const theta = startPhase + t * arcLength;
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta) * Math.cos(incRad);
      const y = radius * Math.sin(theta) * Math.sin(incRad);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const colors = new Float32Array((flowSegments + 1) * 3);
    const color = new THREE.Color(cfg.color);

    for (let i = 0; i <= flowSegments; i++) {
      const t = i / flowSegments;
      const alpha = Math.sin(t * Math.PI);
      colors[i * 3] = color.r * alpha;
      colors[i * 3 + 1] = color.g * alpha;
      colors[i * 3 + 2] = color.b * alpha;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const line = new THREE.Line(geometry, material);
    line.userData = { phase: 0, configId: cfg.id };
    this.scene.add(line);
    this.flowLines.set(cfg.id, line);
  }

  private createSatellite(cfg: OrbitConfig): void {
    const group = new THREE.Group();

    const bodyGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    const haloGeo = new THREE.SphereGeometry(0.07, 24, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    group.add(halo);
    this.halos.set(cfg.id, halo);

    const pos = this.calculatePosition(cfg, cfg.phase);
    group.position.copy(pos);

    this.scene.add(group);
    this.satellites.set(cfg.id, group);
  }

  private createTrail(cfg: OrbitConfig): void {
    const positions: THREE.Vector3[] = [];
    const initialPos = this.calculatePosition(cfg, cfg.phase);
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      positions.push(initialPos.clone());
    }
    this.trailPositions.set(cfg.id, positions);

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(TRAIL_LENGTH * 3);
    const colors = new Float32Array(TRAIL_LENGTH * 3);
    const sizes = new Float32Array(TRAIL_LENGTH);
    const color = new THREE.Color(cfg.color);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const t = i / (TRAIL_LENGTH - 1);
      colors[i * 3] = color.r * (1 - t);
      colors[i * 3 + 1] = color.g * (1 - t);
      colors[i * 3 + 2] = color.b * (1 - t);
      sizes[i] = 0.02 * (1 - t);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      size: 0.03,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    this.trails.set(cfg.id, points);
  }

  private calculatePosition(cfg: OrbitConfig, angle: number): THREE.Vector3 {
    const incRad = (cfg.inclination * Math.PI) / 180;
    const radius = EARTH_RADIUS + cfg.altitude;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle) * Math.cos(incRad);
    const y = radius * Math.sin(angle) * Math.sin(incRad);
    return new THREE.Vector3(x, y, z);
  }

  public getSatellitePosition(id: string): THREE.Vector3 | null {
    const sat = this.satellites.get(id);
    return sat ? sat.position.clone() : null;
  }

  public getSatelliteConfigs(): OrbitConfig[] {
    return this.configs;
  }

  public update(deltaTime: number, earthRotation: number): SatelliteTelemetry[] {
    this.elapsedTime += deltaTime;
    const telemetry: SatelliteTelemetry[] = [];

    this.configs.forEach((cfg) => {
      let angle = this.angles.get(cfg.id) || 0;
      angle += cfg.speed * deltaTime;
      if (angle > Math.PI * 2) {
        angle -= Math.PI * 2;
      }
      this.angles.set(cfg.id, angle);

      const pos = this.calculatePosition(cfg, angle);
      const satGroup = this.satellites.get(cfg.id);
      if (satGroup) {
        satGroup.position.copy(pos);
      }

      const halo = this.halos.get(cfg.id);
      if (halo) {
        const pulse = 0.35 + 0.15 * Math.sin(this.elapsedTime * 4 + cfg.phase);
        (halo.material as THREE.MeshBasicMaterial).opacity = pulse;
        halo.scale.setScalar(1 + 0.2 * Math.sin(this.elapsedTime * 3 + cfg.phase));
      }

      const trailPositions = this.trailPositions.get(cfg.id);
      const trail = this.trails.get(cfg.id);
      if (trailPositions && trail) {
        trailPositions.pop();
        trailPositions.unshift(pos.clone());
        const posAttr = trail.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < TRAIL_LENGTH; i++) {
          posAttr.setXYZ(i, trailPositions[i].x, trailPositions[i].y, trailPositions[i].z);
        }
        posAttr.needsUpdate = true;
      }

      const flowLine = this.flowLines.get(cfg.id);
      if (flowLine) {
        flowLine.userData.phase += cfg.speed * deltaTime;
        this.updateFlowLine(cfg, flowLine);
      }

      const latLng = this.toLatLng(pos, earthRotation);
      const speed = this.calculateOrbitalSpeed(cfg);

      telemetry.push({
        id: cfg.id,
        name: cfg.name,
        color: cfg.colorHex,
        latitude: latLng.latitude,
        longitude: latLng.longitude,
        altitude: cfg.altitude,
        speed: speed
      });
    });

    return telemetry;
  }

  private updateFlowLine(cfg: OrbitConfig, line: THREE.Line): void {
    const phase = line.userData.phase;
    const incRad = (cfg.inclination * Math.PI) / 180;
    const radius = EARTH_RADIUS + cfg.altitude;
    const flowSegments = 60;
    const arcLength = Math.PI * 0.6;
    const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i <= flowSegments; i++) {
      const t = i / flowSegments;
      const theta = phase + t * arcLength;
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta) * Math.cos(incRad);
      const y = radius * Math.sin(theta) * Math.sin(incRad);
      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  }

  private toLatLng(pos: THREE.Vector3, earthRotation: number): { latitude: number; longitude: number } {
    const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    const latitude = (Math.asin(pos.y / r) * 180) / Math.PI;
    let longitude = ((Math.atan2(pos.z, pos.x) * 180) / Math.PI) - earthRotation;
    while (longitude > 180) longitude -= 360;
    while (longitude < -180) longitude += 360;
    return { latitude, longitude };
  }

  private calculateOrbitalSpeed(cfg: OrbitConfig): number {
    const radius = EARTH_RADIUS + cfg.altitude;
    const angularSpeed = cfg.speed;
    const realEarthRadius = 6371;
    const scale = realEarthRadius / EARTH_RADIUS;
    return (radius * angularSpeed * scale) / 1000;
  }
}
