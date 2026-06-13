import * as THREE from 'three';
import { gsap } from 'gsap';
import { CONFIG } from './config';
import { audioManager } from './audio';

interface LineData {
  line: THREE.Line;
  basePoints: THREE.Vector3[];
  currentPoints: THREE.Vector3[];
  baseY: number[];
  wavePhase: number;
  waveSpeed: number;
  waveAmplitude: number;
  zOffset: number;
  hoverOffset: number;
  targetHoverOffset: number;
  isHovered: boolean;
  baseColor: THREE.Color;
  targetColor: THREE.Color;
  currentColor: THREE.Color;
}

interface WaveRing {
  mesh: THREE.Mesh;
  radius: number;
  maxRadius: number;
  opacity: number;
  colorIndex: number;
  startTime: number;
}

export class Bridge {
  private group: THREE.Group;
  private lines: LineData[] = [];
  private centerLine: THREE.Line | null = null;
  private railings: THREE.Line[] = [];
  private waveRings: WaveRing[] = [];
  private width: number;
  private height: number;
  private isMobile: boolean;
  private hoverActive = false;
  private speedMultiplier = 1;
  private speedBoostTween: gsap.core.Tween | null = null;
  private basePoints: THREE.Vector3[] = [];

  constructor(width: number, height: number, isMobile: boolean) {
    this.width = width;
    this.height = height;
    this.isMobile = isMobile;
    this.group = new THREE.Group();

    this.createBaseArchPoints();
    this.createLines();
    this.createCenterLine();
    this.createRailings();
  }

  private createBaseArchPoints(): void {
    const segments = 50;
    this.basePoints = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = (t - 0.5) * this.width;
      const y = Math.sin(t * Math.PI) * this.height;
      this.basePoints.push(new THREE.Vector3(x, y, 0));
    }
  }

  private getRainbowColor(index: number, total: number): THREE.Color {
    const colors = CONFIG.colors.rainbow;
    const position = (index / total) * colors.length;
    const colorIndex = Math.floor(position);
    const colorFraction = position - colorIndex;

    const c1 = new THREE.Color(colors[colorIndex % colors.length]);
    const c2 = new THREE.Color(colors[(colorIndex + 1) % colors.length]);

    return c1.clone().lerp(c2, colorFraction);
  }

  private createLines(): void {
    const lineCount = this.isMobile
      ? CONFIG.bridge.lineCountMobile
      : CONFIG.bridge.lineCountDesktop;

    const zSpread = 40;

    for (let i = 0; i < lineCount; i++) {
      const zOffset = ((i / lineCount) - 0.5) * zSpread;
      const points = this.basePoints.map((p) =>
        p.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          zOffset
        ))
      );

      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const baseColor = this.getRainbowColor(i, lineCount);
      const material = new THREE.LineBasicMaterial({
        color: baseColor.clone(),
        transparent: true,
        opacity: CONFIG.bridge.lineOpacityMin + Math.random() * (CONFIG.bridge.lineOpacityMax - CONFIG.bridge.lineOpacityMin)
      });

      const line = new THREE.Line(geometry, material);

      this.lines.push({
        line,
        basePoints: this.basePoints.map((p) => p.clone()),
        currentPoints: points,
        baseY: points.map((p) => p.y),
        wavePhase: Math.random() * Math.PI * 2,
        waveSpeed: (CONFIG.bridge.wavePeriodMin + Math.random() * (CONFIG.bridge.wavePeriodMax - CONFIG.bridge.wavePeriodMin)) * 0.5,
        waveAmplitude: CONFIG.bridge.waveAmplitudeMin + Math.random() * (CONFIG.bridge.waveAmplitudeMax - CONFIG.bridge.waveAmplitudeMin),
        zOffset,
        hoverOffset: 0,
        targetHoverOffset: 0,
        isHovered: false,
        baseColor: baseColor.clone(),
        targetColor: baseColor.clone(),
        currentColor: baseColor.clone()
      });

      this.group.add(line);
    }
  }

  private createCenterLine(): void {
    const points = this.basePoints.map((p) => p.clone());
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: CONFIG.bridge.centerLineOpacity,
      linewidth: CONFIG.bridge.centerLineWidth
    });

    this.centerLine = new THREE.Line(geometry, material);
    this.group.add(this.centerLine);
  }

  private createRailings(): void {
    const postCount = Math.floor(this.width / CONFIG.railing.postSpacing);

    for (let side of [-1, 1]) {
      for (let i = 0; i <= postCount; i++) {
        const t = i / postCount;
        const archX = (t - 0.5) * this.width;
        const archY = Math.sin(t * Math.PI) * this.height;
        const zOffset = side * 22;

        const tangentX = Math.cos(t * Math.PI) * this.height * Math.PI / this.width;
        const tangentY = -Math.sin(t * Math.PI) * this.height * Math.PI * 0.5 / this.width;
        const len = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
        const perpX = -tangentY / len;
        const perpY = tangentX / len;

        const startPoint = new THREE.Vector3(
          archX + perpX * 2,
          archY + perpY * 2,
          zOffset
        );
        const endPoint = new THREE.Vector3(
          archX + perpX * (2 + CONFIG.railing.postHeight),
          archY + perpY * (2 + CONFIG.railing.postHeight),
          zOffset
        );

        const points = [startPoint, endPoint];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const color = this.getRainbowColor(i, postCount);
        const material = new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: CONFIG.railing.opacity
        });

        const railing = new THREE.Line(geometry, material);
        this.railings.push(railing);
        this.group.add(railing);
      }
    }
  }

  private getWarmColor(distance: number, maxDistance: number): THREE.Color {
    const intensity = 1 - Math.min(distance / maxDistance, 1);
    const c1 = new THREE.Color(CONFIG.colors.warmHover[0]);
    const c2 = new THREE.Color(CONFIG.colors.warmHover[1]);
    return c1.clone().lerp(c2, 1 - intensity * 0.5);
  }

  onMouseMove(worldPoint: THREE.Vector3 | null): void {
    if (!worldPoint) {
      this.clearHover();
      return;
    }

    const onBridge = this.isPointOnBridge(worldPoint);
    if (!onBridge) {
      this.clearHover();
      return;
    }

    this.hoverActive = true;
    this.updateHoverLines(worldPoint);
  }

  private isPointOnBridge(point: THREE.Vector3): boolean {
    const t = (point.x + this.width / 2) / this.width;
    if (t < 0 || t > 1) return false;

    const archY = Math.sin(t * Math.PI) * this.height;
    const yDiff = Math.abs(point.y - archY);
    const zDiff = Math.abs(point.z);

    return yDiff < 50 && zDiff < 30;
  }

  private updateHoverLines(hoverPoint: THREE.Vector3): void {
    const hoverLines = CONFIG.bridge.hoverLineCount;
    const sortedLines = [...this.lines].sort((a, b) => {
      const distA = a.line.position.distanceTo(hoverPoint);
      const distB = b.line.position.distanceTo(hoverPoint);
      return distA - distB;
    });

    this.lines.forEach((lineData) => {
      lineData.isHovered = false;
      lineData.targetHoverOffset = 0;
      lineData.targetColor = lineData.baseColor.clone();
    });

    for (let i = 0; i < Math.min(hoverLines, sortedLines.length); i++) {
      const lineData = sortedLines[i];
      const distance = lineData.line.position.distanceTo(hoverPoint);
      const maxDistance = 80;
      const intensity = 1 - Math.min(distance / maxDistance, 1);

      lineData.isHovered = true;
      lineData.targetHoverOffset = intensity * CONFIG.bridge.hoverArchHeight;
      lineData.targetColor = this.getWarmColor(distance, maxDistance);
    }
  }

  private clearHover(): void {
    if (!this.hoverActive) return;
    this.hoverActive = false;

    this.lines.forEach((lineData) => {
      lineData.isHovered = false;
      lineData.targetHoverOffset = 0;
      lineData.targetColor = lineData.baseColor.clone();
    });
  }

  onClick(worldPoint: THREE.Vector3): void {
    if (!this.isPointOnBridge(worldPoint)) return;

    audioManager.playClickNote(worldPoint.y / this.height);

    this.createWaveRings(worldPoint);

    if (this.speedBoostTween) {
      this.speedBoostTween.kill();
    }

    this.speedMultiplier = CONFIG.bridge.speedBoostMultiplier;
    this.speedBoostTween = gsap.to(this, {
      speedMultiplier: 1,
      duration: CONFIG.bridge.speedBoostDuration,
      ease: 'power2.out'
    });
  }

  private createWaveRings(origin: THREE.Vector3): void {
    const ringCount = Math.floor(CONFIG.bridge.clickWaveMaxRadius / CONFIG.bridge.clickWaveRingSpacing);
    const colors = CONFIG.colors.waveRings;

    for (let i = 0; i < ringCount; i++) {
      const delay = i * 0.05;
      const radius = 0;
      const maxRadius = CONFIG.bridge.clickWaveMaxRadius - i * CONFIG.bridge.clickWaveRingSpacing;

      const geometry = new THREE.RingGeometry(radius, radius + 4, 64);
      geometry.rotateX(-Math.PI / 2);

      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colors[i % colors.length]),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(origin);
      mesh.position.z = 0;

      this.group.add(mesh);

      const waveRing: WaveRing = {
        mesh,
        radius: 0,
        maxRadius,
        opacity: 0.8,
        colorIndex: i % colors.length,
        startTime: performance.now() + delay * 1000
      };

      gsap.to(material, {
        opacity: 0.8,
        duration: 0.1,
        delay,
        ease: 'power2.out'
      });

      gsap.to(waveRing, {
        radius: maxRadius,
        duration: CONFIG.bridge.clickWaveDuration,
        delay,
        ease: 'power2.out',
        onUpdate: () => {
          const newGeometry = new THREE.RingGeometry(
            Math.max(0, waveRing.radius - 4),
            waveRing.radius,
            64
          );
          newGeometry.rotateX(-Math.PI / 2);
          mesh.geometry.dispose();
          mesh.geometry = newGeometry;
        }
      });

      gsap.to(material, {
        opacity: 0,
        duration: CONFIG.bridge.clickWaveDuration * 0.3,
        delay: delay + CONFIG.bridge.clickWaveDuration * 0.7,
        ease: 'power2.in',
        onComplete: () => {
          this.group.remove(mesh);
          mesh.geometry.dispose();
          material.dispose();
          const index = this.waveRings.indexOf(waveRing);
          if (index > -1) {
            this.waveRings.splice(index, 1);
          }
        }
      });

      this.waveRings.push(waveRing);
    }
  }

  update(time: number, deltaTime: number): void {
    this.lines.forEach((lineData) => {
      const positions = lineData.line.geometry.attributes.position;
      const count = positions.count;

      const currentDuration = lineData.isHovered
        ? CONFIG.bridge.hoverDuration
        : CONFIG.bridge.hoverRestoreDuration;

      lineData.hoverOffset += (lineData.targetHoverOffset - lineData.hoverOffset) *
        (deltaTime / currentDuration) * 10;

      lineData.currentColor.lerp(lineData.targetColor, deltaTime * 5);

      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const archX = (t - 0.5) * this.width;
        const archY = Math.sin(t * Math.PI) * this.height;

        const waveOffset = Math.sin(time * lineData.waveSpeed * this.speedMultiplier + lineData.wavePhase + t * Math.PI * 2) *
          lineData.waveAmplitude;

        const hoverArchOffset = Math.sin(t * Math.PI) * lineData.hoverOffset;

        const y = archY + waveOffset + hoverArchOffset;
        const x = archX + (Math.random() - 0.5) * 0.5;
        const z = lineData.zOffset + Math.sin(time * 0.5 + i * 0.1) * 0.3;

        positions.setXYZ(i, x, y, z);
      }

      positions.needsUpdate = true;
      (lineData.line.material as THREE.LineBasicMaterial).color.copy(lineData.currentColor);
    });

    if (this.centerLine) {
      const positions = this.centerLine.geometry.attributes.position;
      const count = positions.count;

      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const archX = (t - 0.5) * this.width;
        const archY = Math.sin(t * Math.PI) * this.height;
        const waveOffset = Math.sin(time * 2 * this.speedMultiplier + t * Math.PI * 2) * 3;

        positions.setXYZ(i, archX, archY + waveOffset, 0);
      }
      positions.needsUpdate = true;
    }
  }

  resize(width: number, height: number, isMobile: boolean): void {
    this.width = width;
    this.height = height;
    this.isMobile = isMobile;

    this.createBaseArchPoints();

    this.lines.forEach((lineData) => {
      lineData.basePoints = this.basePoints.map((p) => p.clone());
    });

    if (this.centerLine) {
      const positions = this.centerLine.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const t = i / (positions.count - 1);
        const archX = (t - 0.5) * this.width;
        const archY = Math.sin(t * Math.PI) * this.height;
        positions.setXYZ(i, archX, archY, 0);
      }
      positions.needsUpdate = true;
    }
  }

  getMesh(): THREE.Group {
    return this.group;
  }

  getBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    return {
      minX: -this.width / 2,
      maxX: this.width / 2,
      minY: 0,
      maxY: this.height
    };
  }

  dispose(): void {
    if (this.speedBoostTween) {
      this.speedBoostTween.kill();
    }

    this.lines.forEach((lineData) => {
      lineData.line.geometry.dispose();
      (lineData.line.material as THREE.Material).dispose();
    });

    if (this.centerLine) {
      this.centerLine.geometry.dispose();
      (this.centerLine.material as THREE.Material).dispose();
    }

    this.railings.forEach((railing) => {
      railing.geometry.dispose();
      (railing.material as THREE.Material).dispose();
    });

    this.waveRings.forEach((ring) => {
      ring.mesh.geometry.dispose();
      (ring.mesh.material as THREE.Material).dispose();
    });

    this.group.clear();
  }
}
