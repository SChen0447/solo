import * as THREE from 'three';

interface SnowflakeParticle {
  mesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  baseScale: number;
  breathPhase: number;
  breathSpeed: number;
  breathMin: number;
  breathMax: number;
  layer: number;
  targetColor: THREE.Color;
  currentColor: THREE.Color;
  transitionState: 'idle' | 'appearing' | 'disappearing';
  transitionProgress: number;
  targetScale: number;
  targetOpacity: number;
}

export interface SnowflakeManagerOptions {
  initialComplexity?: number;
  initialColorT?: number;
}

const COOL_COLOR = new THREE.Color(0x4fc3f7);
const WARM_COLOR = new THREE.Color(0xff8a65);
const WHITE_COLOR = new THREE.Color(0xffffff);

export class SnowflakeManager {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private particles: SnowflakeParticle[] = [];
  private complexity: number;
  private colorT: number;
  private rotationSpeedFactor: number = 1;
  private ring: THREE.Line;
  private glowCanvas: HTMLCanvasElement;
  private glowTexture: THREE.Texture;
  private glowSprite: THREE.Sprite;
  private transitionDuration: number = 0.8;
  private time: number = 0;

  constructor(scene: THREE.Scene, options: SnowflakeManagerOptions = {}) {
    this.scene = scene;
    this.complexity = options.initialComplexity ?? 3;
    this.colorT = options.initialColorT ?? 0;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.glowCanvas = this.createGlowCanvas();
    this.glowTexture = new THREE.CanvasTexture(this.glowCanvas);
    this.glowSprite = this.createGlowSprite();
    this.group.add(this.glowSprite);

    this.ring = this.createRing();
    this.group.add(this.ring);

    this.generateParticles(this.complexity, true);
  }

  private createGlowCanvas(): HTMLCanvasElement {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(150, 180, 255, 0.8)');
    gradient.addColorStop(0.3, 'rgba(100, 150, 255, 0.4)');
    gradient.addColorStop(0.6, 'rgba(80, 120, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(50, 80, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  private createGlowSprite(): THREE.Sprite {
    const material = new THREE.SpriteMaterial({
      map: this.glowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(12, 12, 1);
    return sprite;
  }

  private createRing(): THREE.Line {
    const segments = 128;
    const radius = 3;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        -2.5,
        Math.sin(angle) * radius
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: this.getInterpolatedColor(),
      transparent: true,
      opacity: 0.4,
      linewidth: 1
    });
    const line = new THREE.Line(geometry, material);
    return line;
  }

  private getInterpolatedColor(): THREE.Color {
    const color = new THREE.Color();
    color.copy(COOL_COLOR).lerp(WARM_COLOR, this.colorT);
    const finalColor = new THREE.Color();
    finalColor.copy(WHITE_COLOR).lerp(color, 0.6);
    return finalColor;
  }

  private lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
    const result = new THREE.Color();
    result.copy(a).lerp(b, t);
    return result;
  }

  private generateHexFractalPoints(complexity: number): Array<{ pos: THREE.Vector3; layer: number }> {
    const points: Array<{ pos: THREE.Vector3; layer: number }> = [];
    const maxRadius = 3.5;
    const layers = complexity + 1;

    for (let layer = 0; layer < layers; layer++) {
      const layerRadius = maxRadius * (1 - layer * 0.18);
      const branches = 6 + layer * 6;
      const pointsPerBranch = Math.max(1, Math.floor(20 / (layer + 1)));
      const subBranches = layer > 0 ? 3 : 0;

      for (let branch = 0; branch < branches; branch++) {
        const branchAngle = (branch / branches) * Math.PI * 2;

        for (let p = 0; p < pointsPerBranch; p++) {
          const dist = (p / pointsPerBranch) * layerRadius;
          const wobble = Math.sin(p * 1.7 + layer + branch) * 0.05;

          const x = Math.cos(branchAngle) * (dist + wobble);
          const z = Math.sin(branchAngle) * (dist + wobble);
          const y = Math.sin(dist * 0.8) * 0.15 - layer * 0.02;

          points.push({
            pos: new THREE.Vector3(x, y, z),
            layer
          });

          if (subBranches > 0 && p > pointsPerBranch * 0.3) {
            for (let sb = 0; sb < subBranches; sb++) {
              const subAngle = branchAngle + (sb - (subBranches - 1) / 2) * 0.35;
              const subDist = dist * 0.35;
              const subX = Math.cos(subAngle) * subDist + x * 0.7;
              const subZ = Math.sin(subAngle) * subDist + z * 0.7;
              const subY = y + Math.sin(sb + p) * 0.05;

              points.push({
                pos: new THREE.Vector3(subX, subY, subZ),
                layer: Math.min(layer + 1, layers - 1)
              });
            }
          }
        }
      }
    }

    const centerPoints = Math.floor(80 / complexity);
    for (let i = 0; i < centerPoints; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.4;
      points.push({
        pos: new THREE.Vector3(
          Math.cos(angle) * r,
          (Math.random() - 0.5) * 0.15,
          Math.sin(angle) * r
        ),
        layer: 0
      });
    }

    return points;
  }

  private createParticle(position: THREE.Vector3, layer: number, appearing: boolean): SnowflakeParticle {
    const size = 0.02 + Math.random() * 0.04;
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const color = this.getInterpolatedColor();

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: appearing ? 0 : 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    if (appearing) {
      mesh.scale.setScalar(0);
    } else {
      mesh.scale.setScalar(1);
    }

    return {
      mesh,
      basePosition: position.clone(),
      baseScale: size,
      breathPhase: Math.random() * Math.PI * 2,
      breathSpeed: 0.5 + Math.random() * 0.5,
      breathMin: 0.8,
      breathMax: 1.3,
      layer,
      targetColor: color.clone(),
      currentColor: color.clone(),
      transitionState: appearing ? 'appearing' : 'idle',
      transitionProgress: appearing ? 0 : 1,
      targetScale: appearing ? 0 : 1,
      targetOpacity: appearing ? 0 : 1
    };
  }

  public generateParticles(complexity: number, initial: boolean = false): void {
    const targetPoints = this.generateHexFractalPoints(complexity);

    if (initial) {
      this.particles.forEach(p => {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      });
      this.particles = [];

      targetPoints.forEach(point => {
        const particle = this.createParticle(point.pos, point.layer, false);
        this.group.add(particle.mesh);
        this.particles.push(particle);
      });
    } else {
      this.particles.forEach(p => {
        if (p.transitionState !== 'disappearing') {
          p.transitionState = 'disappearing';
          p.transitionProgress = 1;
          p.targetScale = 0;
          p.targetOpacity = 0;
        }
      });

      targetPoints.forEach(point => {
        const particle = this.createParticle(point.pos, point.layer, true);
        this.group.add(particle.mesh);
        this.particles.push(particle);
      });
    }
  }

  public setComplexity(complexity: number): void {
    if (this.complexity === complexity) return;
    this.complexity = complexity;
    this.generateParticles(complexity, false);
  }

  public setColorT(t: number): void {
    this.colorT = THREE.MathUtils.clamp(t, 0, 1);
    const newTargetColor = this.getInterpolatedColor();

    this.particles.forEach(p => {
      p.targetColor.copy(newTargetColor);
    });

    (this.ring.material as THREE.LineBasicMaterial).color.copy(newTargetColor);

    this.updateGlowColor();
  }

  private updateGlowColor(): void {
    const color = this.getInterpolatedColor();
    const ctx = this.glowCanvas.getContext('2d')!;
    const size = this.glowCanvas.width;
    ctx.clearRect(0, 0, size, size);

    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
    gradient.addColorStop(0.3, `rgba(${Math.floor(r * 0.8)}, ${Math.floor(g * 0.85)}, ${Math.floor(b * 1)}, 0.4)`);
    gradient.addColorStop(0.6, `rgba(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.9)}, 0.1)`);
    gradient.addColorStop(1, `rgba(${Math.floor(r * 0.4)}, ${Math.floor(g * 0.5)}, ${Math.floor(b * 0.8)}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    this.glowTexture.needsUpdate = true;
  }

  public setRotationSpeed(factor: number): void {
    this.rotationSpeedFactor = factor;
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public update(dt: number): void {
    this.time += dt;

    this.group.rotation.y += (dt / 30) * Math.PI * 2 * this.rotationSpeedFactor;
    this.group.rotation.x += (dt / 60) * Math.PI * 2 * this.rotationSpeedFactor;

    this.ring.rotation.y -= (dt / 20) * Math.PI * 2;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      const breathT = this.time * p.breathSpeed * Math.PI * 2 + p.breathPhase;
      const breathFactor = p.breathMin + (Math.sin(breathT) * 0.5 + 0.5) * (p.breathMax - p.breathMin);

      let transitionScale = 1;
      let transitionOpacity = 1;

      if (p.transitionState === 'appearing') {
        p.transitionProgress = Math.min(1, p.transitionProgress + dt / this.transitionDuration);
        const eased = this.easeOut(p.transitionProgress);
        transitionScale = eased;
        transitionOpacity = eased;
        if (p.transitionProgress >= 1) {
          p.transitionState = 'idle';
        }
      } else if (p.transitionState === 'disappearing') {
        p.transitionProgress = Math.max(0, p.transitionProgress - dt / this.transitionDuration);
        const eased = this.easeOut(p.transitionProgress);
        transitionScale = eased;
        transitionOpacity = eased;
        if (p.transitionProgress <= 0) {
          this.group.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          this.particles.splice(i, 1);
          continue;
        }
      }

      p.mesh.scale.setScalar(breathFactor * transitionScale);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * transitionOpacity + 0.15;

      p.currentColor.lerp(p.targetColor, Math.min(1, dt * 2));
      (p.mesh.material as THREE.MeshBasicMaterial).color.copy(p.currentColor);

      const distanceFromCenter = p.basePosition.length();
      const brightness = 0.7 + 0.3 * Math.sin(this.time * 2 + distanceFromCenter * 2);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity *= brightness;
    }
  }

  public dispose(): void {
    this.particles.forEach(p => {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
    this.ring.geometry.dispose();
    (this.ring.material as THREE.Material).dispose();
    this.glowTexture.dispose();
    this.scene.remove(this.group);
  }
}
