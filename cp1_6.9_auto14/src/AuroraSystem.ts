import * as THREE from 'three';
import { Earth, AuroraDataPoint } from './Earth';

export type FilterLevel = 'all' | '1-2' | '3-4' | '5';

interface AuroraParticle {
  basePosition: THREE.Vector3;
  offset: THREE.Vector3;
  baseIntensity: number;
  level: number;
  baseColor: THREE.Color;
  phase: number;
}

export class AuroraSystem {
  public points: THREE.Points;
  public group: THREE.Group;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particles: AuroraParticle[] = [];
  private maxParticles: number = 3000;
  private time: number = 0;
  private hourOfDay: number = 0;
  private filterLevel: FilterLevel = 'all';
  private targetOpacity: number = 1;
  private currentOpacity: number = 1;
  private transitionDuration: number = 0.5;
  private transitionProgress: number = 1;
  private markers: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();
    
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.015,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);

    this.generateMockAuroraData();
  }

  private generateMockAuroraData(): void {
    const dataPoints: AuroraDataPoint[] = [];
    
    const generateBelt = (hemisphere: 'north' | 'south', count: number) => {
      const baseLat = hemisphere === 'north' ? 65 : -65;
      for (let i = 0; i < count; i++) {
        const lat = baseLat + (Math.random() - 0.5) * 15;
        const lon = (Math.random() * 360) - 180;
        const intensity = Math.random() * 4 + 1;
        dataPoints.push({ latitude: lat, longitude: lon, intensity });
      }
    };

    generateBelt('north', 8);
    generateBelt('south', 8);

    this.setAuroraData(dataPoints);
  }

  public setAuroraData(data: AuroraDataPoint[]): void {
    this.particles = [];
    this.markers.forEach(m => this.group.remove(m));
    this.markers = [];

    let particleCount = 0;

    for (const point of data) {
      const particlesForPoint = Math.floor((point.intensity / 5) * 180) + 40;
      const actualParticles = Math.min(particlesForPoint, this.maxParticles - particleCount);
      
      if (actualParticles <= 0) break;

      const level = this.getIntensityLevel(point.intensity);
      const baseColor = this.getColorForLevel(level);
      const basePos = Earth.latLongToVector3(point.latitude, point.longitude, 1.02);

      for (let i = 0; i < actualParticles; i++) {
        const latOffset = (Math.random() - 0.5) * 6;
        const lonOffset = (Math.random() - 0.5) * 10;
        const heightOffset = Math.random() * 0.04;
        
        const particleLat = point.latitude + latOffset;
        const particleLon = point.longitude + lonOffset;
        const radius = 1.02 + heightOffset;
        
        const position = Earth.latLongToVector3(particleLat, particleLon, radius);
        const dirToCenter = position.clone().normalize();
        const offset = dirToCenter.multiplyScalar(Math.random() * 0.01);

        this.particles.push({
          basePosition: position,
          offset: offset,
          baseIntensity: point.intensity,
          level: level,
          baseColor: baseColor.clone(),
          phase: Math.random() * Math.PI * 2
        });
      }

      particleCount += actualParticles;

      this.createMarker(point);
    }

    this.updateGeometry();
  }

  private createMarker(point: AuroraDataPoint): void {
    const markerGeometry = new THREE.SphereGeometry(0.008, 16, 16);
    const level = this.getIntensityLevel(point.intensity);
    const color = this.getColorForLevel(level);
    
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9
    });

    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    const pos = Earth.latLongToVector3(point.latitude, point.longitude, 1.04);
    marker.position.copy(pos);
    marker.userData = { 
      latitude: point.latitude, 
      longitude: point.longitude, 
      intensity: point.intensity,
      level: level,
      isMarker: true
    };

    this.markers.push(marker);
    this.group.add(marker);
  }

  private getIntensityLevel(intensity: number): number {
    if (intensity <= 2) return 1 + Math.floor(intensity);
    if (intensity <= 4) return 3 + Math.floor(intensity - 2);
    return 5;
  }

  private getColorForLevel(level: number): THREE.Color {
    if (level <= 2) {
      const t = (level - 1) / 1;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x22c55e),
        new THREE.Color(0x4ade80),
        t
      );
    } else if (level <= 4) {
      const t = (level - 3) / 1;
      return new THREE.Color().lerpColors(
        new THREE.Color(0x3b82f6),
        new THREE.Color(0x60a5fa),
        t
      );
    } else {
      return new THREE.Color(0xc084fc);
    }
  }

  private isParticleVisible(level: number): boolean {
    if (this.filterLevel === 'all') return true;
    if (this.filterLevel === '1-2') return level <= 2;
    if (this.filterLevel === '3-4') return level >= 3 && level <= 4;
    if (this.filterLevel === '5') return level === 5;
    return true;
  }

  public setFilterLevel(level: FilterLevel): void {
    if (this.filterLevel !== level) {
      this.filterLevel = level;
      this.startTransition();
      this.updateMarkersVisibility();
    }
  }

  private updateMarkersVisibility(): void {
    for (const marker of this.markers) {
      const level = marker.userData.level as number;
      marker.visible = this.isParticleVisible(level);
    }
  }

  private startTransition(): void {
    this.transitionProgress = 0;
  }

  public setHourOfDay(hour: number): void {
    if (Math.abs(this.hourOfDay - hour) > 0.1) {
      this.hourOfDay = hour;
      this.startTransition();
    } else {
      this.hourOfDay = hour;
    }
  }

  private getDayNightFactor(): number {
    const normalizedHour = this.hourOfDay / 24;
    const factor = Math.sin(normalizedHour * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    return 0.3 + (1 - factor) * 0.7;
  }

  private updateGeometry(): void {
    const positions = new Float32Array(this.particles.length * 3);
    const colors = new Float32Array(this.particles.length * 3);
    const sizes = new Float32Array(this.particles.length);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / this.transitionDuration);
    }

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const dayNightFactor = this.getDayNightFactor();
    const transitionEase = this.easeInOutCubic(this.transitionProgress);

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      const waveX = Math.sin(this.time * 1.5 + particle.phase) * 0.003;
      const waveY = Math.cos(this.time * 1.2 + particle.phase * 1.3) * 0.003;
      const waveZ = Math.sin(this.time * 1.8 + particle.phase * 0.7) * 0.002;

      positions[i * 3] = particle.basePosition.x + particle.offset.x + waveX;
      positions[i * 3 + 1] = particle.basePosition.y + particle.offset.y + waveY;
      positions[i * 3 + 2] = particle.basePosition.z + particle.offset.z + waveZ;

      const visible = this.isParticleVisible(particle.level);
      const intensityWave = Math.sin(this.time * 2 + particle.phase) * 0.15 + 0.85;
      const baseOpacity = visible ? 1 : 0;
      const finalOpacity = baseOpacity * intensityWave * dayNightFactor * transitionEase;

      const colorVariation = Math.sin(this.time + particle.phase) * 0.1;
      const r = particle.baseColor.r * (1 + colorVariation) * finalOpacity;
      const g = particle.baseColor.g * (1 + colorVariation * 0.5) * finalOpacity;
      const b = particle.baseColor.b * (1 - colorVariation * 0.3) * finalOpacity;

      colors[i * 3] = Math.max(0, Math.min(1, r));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, g));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, b));
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;

    for (const marker of this.markers) {
      const pulse = Math.sin(this.time * 3 + marker.position.x * 10) * 0.2 + 0.8;
      const material = marker.material as THREE.MeshBasicMaterial;
      material.opacity = (marker.visible ? 0.9 : 0) * pulse * dayNightFactor * transitionEase;
      const scale = 1 + Math.sin(this.time * 2) * 0.15;
      marker.scale.setScalar(scale);
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getMarkers(): THREE.Mesh[] {
    return this.markers;
  }

  public getAuroraInfoAtPosition(latitude: number, longitude: number): { level: number; prediction: string } | null {
    let closestMarker: THREE.Mesh | null = null;
    let closestDistance = Infinity;

    for (const marker of this.markers) {
      if (!marker.visible) continue;
      
      const markerLat = marker.userData.latitude as number;
      const markerLon = marker.userData.longitude as number;
      
      const distance = Math.sqrt(
        Math.pow(latitude - markerLat, 2) + 
        Math.pow(longitude - markerLon, 2)
      );

      if (distance < closestDistance && distance < 10) {
        closestDistance = distance;
        closestMarker = marker;
      }
    }

    if (closestMarker) {
      const level = closestMarker.userData.level as number;
      const hours = Math.floor(Math.random() * 4) + 1;
      return {
        level: level,
        prediction: `强度${level}级，未来${hours}小时活跃`
      };
    }

    return null;
  }
}
