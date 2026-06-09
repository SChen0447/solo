import * as THREE from 'three';

export interface WindParticle {
  lat: number;
  lon: number;
  speed: number;
  altitude: number;
}

export interface WindParticlesConfig {
  particleCount: number;
  earthRadius: number;
  altitude: number;
}

export class WindParticles {
  public points: THREE.Points;
  public trails: THREE.LineSegments;
  private config: WindParticlesConfig;
  private particles: WindParticle[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private particleSize: number;
  private lineWidth: number;

  constructor(config: WindParticlesConfig) {
    this.config = config;
    const useHiQuality = config.particleCount <= 3000;
    this.particleSize = useHiQuality ? 0.02 : 0.01;
    this.lineWidth = useHiQuality ? 1.0 : 0.5;
    this.particles = this.generateParticles(config.particleCount);
    this.positions = new Float32Array(config.particleCount * 3);
    this.colors = new Float32Array(config.particleCount * 3);
    this.trailPositions = new Float32Array(config.particleCount * 6);
    this.trailColors = new Float32Array(config.particleCount * 6);
    this.points = this.createPoints();
    this.trails = this.createTrails();
    this.updateBuffers();
  }

  private generateParticles(count: number): WindParticle[] {
    const result: WindParticle[] = [];
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const lat = Math.acos(2 * v - 1) * (180 / Math.PI) - 90;
      const lon = (u * 360) - 180;
      result.push({
        lat,
        lon,
        speed: this.getWindSpeed(lat, lon),
        altitude: this.config.altitude
      });
    }
    return result;
  }

  private getWindSpeed(lat: number, lon: number): number {
    const latRad = lat * (Math.PI / 180);
    const jetStream = Math.exp(-Math.pow((lat - 45) / 15, 2)) * 18;
    const jetStreamS = Math.exp(-Math.pow((lat + 45) / 15, 2)) * 16;
    const tradeWindN = Math.exp(-Math.pow((lat - 15) / 20, 2)) * 7;
    const tradeWindS = Math.exp(-Math.pow((lat + 15) / 20, 2)) * 7;
    const polarN = Math.exp(-Math.pow((lat - 75) / 12, 2)) * 9;
    const polarS = Math.exp(-Math.pow((lat + 75) / 12, 2)) * 9;
    const seasonal = Math.sin(lon * (Math.PI / 180) * 2) * 2;
    const noise = (Math.sin(lat * 0.7 + lon * 0.3) + Math.cos(lat * 0.5 - lon * 0.4)) * 2;
    return Math.max(0.5, jetStream + jetStreamS + tradeWindN + tradeWindS + polarN + polarS + seasonal + noise);
  }

  private getWindDirection(lat: number, _lon: number): { dLat: number; dLon: number } {
    const latRad = lat * (Math.PI / 180);
    let dLat = 0;
    let dLon = 0;
    if (lat > 60) {
      dLat = -0.6;
      dLon = -1.0;
    } else if (lat > 30) {
      dLat = -0.3;
      dLon = 1.2;
    } else if (lat > 0) {
      dLat = 0.4;
      dLon = -1.0;
    } else if (lat > -30) {
      dLat = -0.4;
      dLon = -1.0;
    } else if (lat > -60) {
      dLat = 0.3;
      dLon = 1.2;
    } else {
      dLat = 0.6;
      dLon = -1.0;
    }
    const perturb = Math.sin(lat * 0.5) * 0.3;
    dLat += perturb;
    dLon += Math.cos(lat * 0.3) * 0.2;
    const mag = Math.sqrt(dLat * dLat + dLon * dLon);
    return { dLat: dLat / mag, dLon: dLon / mag };
  }

  private speedToColor(speed: number): THREE.Color {
    const color = new THREE.Color();
    if (speed <= 5) {
      const t = speed / 5;
      color.setRGB(
        0.529 + (0.678 - 0.529) * t,
        0.808 + (1.0 - 0.808) * t,
        0.922 + (0.184 - 0.922) * t
      );
    } else if (speed <= 15) {
      const t = (speed - 5) / 10;
      color.setRGB(
        0.678 + (1.0 - 0.678) * t,
        1.0 + (0.271 - 1.0) * t,
        0.184 + 0 * t
      );
    } else {
      const t = Math.min(1, (speed - 15) / 10);
      color.setRGB(1.0, 0.271 * (1 - t) + 0 * t, 0);
    }
    return color;
  }

  private latLonAltToXYZ(lat: number, lon: number, alt: number): THREE.Vector3 {
    const latRad = lat * (Math.PI / 180);
    const lonRad = lon * (Math.PI / 180);
    const r = this.config.earthRadius + alt;
    return new THREE.Vector3(
      r * Math.cos(latRad) * Math.sin(lonRad),
      r * Math.sin(latRad),
      r * Math.cos(latRad) * Math.cos(lonRad)
    );
  }

  private createPoints(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const material = new THREE.PointsMaterial({
      size: this.particleSize * this.config.earthRadius,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geometry, material);
  }

  private createTrails(): THREE.LineSegments {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      linewidth: this.lineWidth
    });
    return new THREE.LineSegments(geometry, material);
  }

  public update(delta: number, speedMultiplier: number): void {
    const dt = delta * speedMultiplier;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dir = this.getWindDirection(p.lat, p.lon);
      const moveFactor = p.speed * dt * 0.008;
      p.lat += dir.dLat * moveFactor;
      p.lon += dir.dLon * moveFactor / Math.max(0.1, Math.cos(p.lat * (Math.PI / 180)));
      if (p.lat > 85) p.lat = -85 + (p.lat - 85);
      if (p.lat < -85) p.lat = 85 + (p.lat + 85);
      if (p.lon > 180) p.lon -= 360;
      if (p.lon < -180) p.lon += 360;
      p.speed = p.speed * 0.98 + this.getWindSpeed(p.lat, p.lon) * 0.02;
    }
    this.updateBuffers();
  }

  private updateBuffers(): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const pos = this.latLonAltToXYZ(p.lat, p.lon, p.altitude);
      const color = this.speedToColor(p.speed);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      const dir = this.getWindDirection(p.lat, p.lon);
      const trailLen = p.speed * 0.0008;
      const backLat = p.lat - dir.dLat * trailLen * 50;
      const backLon = p.lon - dir.dLon * trailLen * 50 / Math.max(0.1, Math.cos(p.lat * (Math.PI / 180)));
      const backPos = this.latLonAltToXYZ(backLat, backLon, p.altitude);
      this.trailPositions[i * 6] = backPos.x;
      this.trailPositions[i * 6 + 1] = backPos.y;
      this.trailPositions[i * 6 + 2] = backPos.z;
      this.trailPositions[i * 6 + 3] = pos.x;
      this.trailPositions[i * 6 + 4] = pos.y;
      this.trailPositions[i * 6 + 5] = pos.z;
      const backColor = color.clone().multiplyScalar(0.3);
      this.trailColors[i * 6] = backColor.r;
      this.trailColors[i * 6 + 1] = backColor.g;
      this.trailColors[i * 6 + 2] = backColor.b;
      this.trailColors[i * 6 + 3] = color.r;
      this.trailColors[i * 6 + 4] = color.g;
      this.trailColors[i * 6 + 5] = color.b;
    }
    const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    const colAttr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    colAttr.needsUpdate = true;
    const tPosAttr = this.trails.geometry.getAttribute('position') as THREE.BufferAttribute;
    tPosAttr.needsUpdate = true;
    const tColAttr = this.trails.geometry.getAttribute('color') as THREE.BufferAttribute;
    tColAttr.needsUpdate = true;
  }
}
