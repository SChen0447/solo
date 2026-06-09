import * as THREE from 'three';
import { getOceanVectors, getInterpolatedTemperature, tempToColor, OceanVector } from './oceanData';

const PARTICLE_COUNT = 800;
const TRAIL_LENGTH = 5;
const SPHERE_RADIUS = 2.0;
const ELEVATION = 0.01;

interface ParticleData {
  lat: number;
  lon: number;
  baseSpeed: number;
  phase: number;
  helixRadius: number;
  helixSpeed: number;
  driftSpeed: number;
  trail: { lat: number; lon: number }[];
}

export class OceanParticles {
  private group: THREE.Group;
  private particles: THREE.Points;
  private trails: THREE.LineSegments;
  private particleData: ParticleData[] = [];
  private currentMonth: number = 1;
  private targetMonth: number = 1;
  private monthTransition: number = 1;

  constructor() {
    this.group = new THREE.Group();

    this.particles = this.createParticles();
    this.trails = this.createTrails();

    this.group.add(this.particles);
    this.group.add(this.trails);
  }

  private createParticles(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    this.initializeParticleData();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particleData[i];
      const pos = latLonToVector3(p.lat, p.lon, SPHERE_RADIUS + ELEVATION);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const temp = getInterpolatedTemperature(1, p.lat, p.lon);
      const col = tempToColor(temp);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = 0.03 + Math.random() * 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.createCircleTexture() }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 300.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
          if (gl_FragColor.a < 0.1) discard;
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  private createCircleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createTrails(): THREE.LineSegments {
    const geometry = new THREE.BufferGeometry();
    const trailCount = PARTICLE_COUNT * (TRAIL_LENGTH - 1);
    const positions = new Float32Array(trailCount * 2 * 3);
    const colors = new Float32Array(trailCount * 2 * 3);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return new THREE.LineSegments(geometry, material);
  }

  private initializeParticleData(): void {
    const vectors = getOceanVectors(1);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const v: OceanVector = vectors[i % vectors.length];

      const lat = v.lat + (Math.random() - 0.5) * 20;
      const lon = v.lon + (Math.random() - 0.5) * 20;

      const trail: { lat: number; lon: number }[] = [];
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        trail.push({ lat, lon });
      }

      this.particleData.push({
        lat: Math.max(-85, Math.min(85, lat)),
        lon: ((lon + 180) % 360) - 180,
        baseSpeed: v.speed,
        phase: Math.random() * Math.PI * 2,
        helixRadius: 2 + Math.random() * 4,
        helixSpeed: 0.3 + Math.random() * 0.4,
        driftSpeed: 0.1 + Math.random() * 0.2,
        trail
      });
    }
  }

  public setMonth(month: number): void {
    this.targetMonth = month;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    if (Math.abs(this.monthTransition - this.targetMonth) > 0.01) {
      this.monthTransition += (this.targetMonth - this.monthTransition) * Math.min(1, deltaTime * 3);
    } else {
      this.monthTransition = this.targetMonth;
    }
    this.currentMonth = this.monthTransition;

    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const colors = this.particles.geometry.attributes.color.array as Float32Array;
    const trailPositions = this.trails.geometry.attributes.position.array as Float32Array;
    const trailColors = this.trails.geometry.attributes.color.array as Float32Array;

    const winterFactor = this.getSeasonDensityFactor();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particleData[i];

      for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
        p.trail[t].lat = p.trail[t - 1].lat;
        p.trail[t].lon = p.trail[t - 1].lon;
      }
      p.trail[0].lat = p.lat;
      p.trail[0].lon = p.lon;

      const speed = p.baseSpeed * (0.8 + winterFactor * 0.4 * this.getPolarDensityBoost(p.lat));
      const helixAngle = elapsedTime * p.helixSpeed + p.phase;

      const vectors = getOceanVectors(Math.round(this.currentMonth));
      const v = vectors[i % vectors.length];

      let dLon = v.dx + Math.sin(helixAngle) * 0.3 * p.helixRadius * 0.1;
      let dLat = v.dy + Math.cos(helixAngle) * 0.2 * p.helixRadius * 0.1;

      const hemisphere = p.lat >= 0 ? 1 : -1;
      dLat -= hemisphere * p.driftSpeed * 0.3;

      const mag = Math.sqrt(dLat * dLat + dLon * dLon) || 1;
      dLat = (dLat / mag) * speed * deltaTime * 8;
      dLon = (dLon / mag) * speed * deltaTime * 8;

      p.lat += dLat;
      p.lon += dLon;

      if (p.lat > 85) { p.lat = 85; dLat = -Math.abs(dLat); }
      if (p.lat < -85) { p.lat = -85; dLat = Math.abs(dLat); }
      if (p.lon > 180) p.lon -= 360;
      if (p.lon < -180) p.lon += 360;

      const pos = latLonToVector3(p.lat, p.lon, SPHERE_RADIUS + ELEVATION);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const temp = getInterpolatedTemperature(this.currentMonth, p.lat, p.lon);
      const col = tempToColor(temp);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
        const segIdx = (i * (TRAIL_LENGTH - 1) + t) * 2;
        const alpha1 = 1 - t / TRAIL_LENGTH;
        const alpha2 = 1 - (t + 1) / TRAIL_LENGTH;

        const t1 = getInterpolatedTemperature(this.currentMonth, p.trail[t].lat, p.trail[t].lon);
        const t2 = getInterpolatedTemperature(this.currentMonth, p.trail[t + 1].lat, p.trail[t + 1].lon);
        const col1 = tempToColor(t1);
        const col2 = tempToColor(t2);

        const pos1 = latLonToVector3(p.trail[t].lat, p.trail[t].lon, SPHERE_RADIUS + ELEVATION);
        const pos2 = latLonToVector3(p.trail[t + 1].lat, p.trail[t + 1].lon, SPHERE_RADIUS + ELEVATION);

        trailPositions[segIdx * 3] = pos1.x;
        trailPositions[segIdx * 3 + 1] = pos1.y;
        trailPositions[segIdx * 3 + 2] = pos1.z;
        trailColors[segIdx * 3] = col1.r * alpha1;
        trailColors[segIdx * 3 + 1] = col1.g * alpha1;
        trailColors[segIdx * 3 + 2] = col1.b * alpha1;

        trailPositions[(segIdx + 1) * 3] = pos2.x;
        trailPositions[(segIdx + 1) * 3 + 1] = pos2.y;
        trailPositions[(segIdx + 1) * 3 + 2] = pos2.z;
        trailColors[(segIdx + 1) * 3] = col2.r * alpha2;
        trailColors[(segIdx + 1) * 3 + 1] = col2.g * alpha2;
        trailColors[(segIdx + 1) * 3 + 2] = col2.b * alpha2;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    this.trails.geometry.attributes.position.needsUpdate = true;
    this.trails.geometry.attributes.color.needsUpdate = true;
  }

  private getSeasonDensityFactor(): number {
    const m = Math.round(this.currentMonth);
    const northernWinter = (m >= 11 || m <= 2) ? 1.0 : 0.3;
    const southernWinter = (m >= 5 && m <= 8) ? 1.0 : 0.3;
    return Math.max(northernWinter, southernWinter);
  }

  private getPolarDensityBoost(lat: number): number {
    const absLat = Math.abs(lat);
    if (absLat > 60) {
      const m = Math.round(this.currentMonth);
      const isPolarActive = (lat > 0 && (m >= 11 || m <= 2)) || (lat < 0 && (m >= 5 && m <= 8));
      return isPolarActive ? 1.5 : 0.8;
    }
    if (absLat < 20) {
      const m = Math.round(this.currentMonth);
      const isEquatorActive = (lat > 0 && (m >= 5 && m <= 8)) || (lat < 0 && (m >= 11 || m <= 2));
      return isEquatorActive ? 1.3 : 1.0;
    }
    return 1.0;
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getCount(): number {
    return PARTICLE_COUNT;
  }
}

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export { latLonToVector3, SPHERE_RADIUS };
