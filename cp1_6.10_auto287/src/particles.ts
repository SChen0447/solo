import * as THREE from 'three';
import { Terrain } from './terrain';

type ParticleState = 'active' | 'fading' | 'appearing' | 'inactive';

type ParticleData = {
  baseX: number;
  baseZ: number;
  baseY: number;
  phase: number;
  amplitude: number;
  speed: number;
  state: ParticleState;
  fadeTime: number;
  fadeDuration: number;
  color: THREE.Color;
};

export class Particles {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private terrain: Terrain;
  private maxParticles: number = 1600;
  private activeCount: number = 0;
  private targetCount: number = 800;
  private particles: ParticleData[];
  private time: number = 0;

  constructor(scene: THREE.Scene, terrain: Terrain) {
    this.terrain = terrain;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);
    const opacities = new Float32Array(this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 0.15;
      colors[i * 3 + 1] = 0.68;
      colors[i * 3 + 2] = 0.38;
      sizes[i] = 0.15;
      opacities[i] = 0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        baseX: 0,
        baseZ: 0,
        baseY: 0,
        phase: Math.random() * Math.PI * 2,
        amplitude: 0.3 + Math.random() * 0.5,
        speed: 0.3 + Math.random() * 0.4,
        state: 'inactive',
        fadeTime: 0,
        fadeDuration: 0.8,
        color: new THREE.Color()
      });
    }

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      map: texture,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, material);
    scene.add(this.points);

    this.setDensity(100);
  }

  public setDensity(value: number): void {
    this.targetCount = Math.floor((value / 200) * this.maxParticles);
    this.adjustParticles();
  }

  private adjustParticles(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    if (this.targetCount > this.activeCount) {
      let toAdd = this.targetCount - this.activeCount;
      for (let i = 0; i < this.maxParticles && toAdd > 0; i++) {
        if (this.particles[i].state === 'inactive') {
          this.activateParticle(i, positions, colors, true);
          toAdd--;
        }
      }
    } else if (this.targetCount < this.activeCount) {
      let toRemove = this.activeCount - this.targetCount;
      for (let i = 0; i < this.maxParticles && toRemove > 0; i++) {
        if (this.particles[i].state === 'active') {
          this.deactivateParticle(i);
          toRemove--;
        }
      }
    }
  }

  private activateParticle(index: number, positions: Float32Array, colors: Float32Array, appearing: boolean): void {
    const p = this.particles[index];
    const terrainSize = this.terrain.getSize();
    const half = terrainSize / 2;

    p.baseX = (Math.random() - 0.5) * terrainSize * 0.9;
    p.baseZ = (Math.random() - 0.5) * terrainSize * 0.9;
    p.baseY = this.terrain.getHeightAt(p.baseX, p.baseZ) + 0.5 + Math.random() * 2;
    p.phase = Math.random() * Math.PI * 2;
    p.amplitude = 0.3 + Math.random() * 0.5;
    p.speed = 0.3 + Math.random() * 0.4;

    const heightFactor = Math.min(Math.max((p.baseY + 5) / 10, 0), 1);
    const lowColor = new THREE.Color(0x27ae60);
    const highColor = new THREE.Color(0xd5dbdb);
    p.color.copy(lowColor).lerp(highColor, heightFactor * 0.8);

    if (appearing) {
      p.state = 'appearing';
      p.fadeTime = 0;
      p.fadeDuration = 1.2;
      positions[index * 3] = p.baseX;
      positions[index * 3 + 1] = p.baseY + 8 + Math.random() * 4;
      positions[index * 3 + 2] = p.baseZ;
    } else {
      p.state = 'active';
      positions[index * 3] = p.baseX;
      positions[index * 3 + 1] = p.baseY;
      positions[index * 3 + 2] = p.baseZ;
    }

    colors[index * 3] = p.color.r;
    colors[index * 3 + 1] = p.color.g;
    colors[index * 3 + 2] = p.color.b;

    this.activeCount++;
  }

  private deactivateParticle(index: number): void {
    const p = this.particles[index];
    p.state = 'fading';
    p.fadeTime = 0;
    p.fadeDuration = 0.8;
    this.activeCount--;
  }

  public regenerate(): Promise<void> {
    return new Promise((resolve) => {
      const positions = this.geometry.attributes.position.array as Float32Array;
      const colors = this.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < this.maxParticles; i++) {
        if (this.particles[i].state === 'active') {
          this.deactivateParticle(i);
        }
      }

      const checkFade = () => {
        let allFaded = true;
        for (let i = 0; i < this.maxParticles; i++) {
          if (this.particles[i].state === 'fading') {
            allFaded = false;
            break;
          }
        }
        if (allFaded) {
          let toAdd = this.targetCount;
          for (let i = 0; i < this.maxParticles && toAdd > 0; i++) {
            if (this.particles[i].state === 'inactive') {
              this.activateParticle(i, positions, colors, true);
              toAdd--;
            }
          }
          this.geometry.attributes.position.needsUpdate = true;
          this.geometry.attributes.color.needsUpdate = true;
          resolve();
        } else {
          setTimeout(checkFade, 100);
        }
      };

      setTimeout(checkFade, 400);
    });
  }

  public update(dt: number): void {
    this.time += dt;
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    let needsUpdate = false;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];

      if (p.state === 'active') {
        const y = p.baseY + Math.sin(this.time * p.speed + p.phase) * p.amplitude;
        positions[i * 3 + 1] = y;
        needsUpdate = true;
      } else if (p.state === 'appearing') {
        p.fadeTime += dt;
        const t = Math.min(p.fadeTime / p.fadeDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3);

        const startY = p.baseY + 8;
        const targetY = p.baseY + Math.sin(this.time * p.speed + p.phase) * p.amplitude;
        positions[i * 3 + 1] = startY + (targetY - startY) * eased;

        const alpha = eased;
        colors[i * 3] = p.color.r * alpha;
        colors[i * 3 + 1] = p.color.g * alpha;
        colors[i * 3 + 2] = p.color.b * alpha;

        if (t >= 1) {
          p.state = 'active';
        }
        needsUpdate = true;
      } else if (p.state === 'fading') {
        p.fadeTime += dt;
        const t = Math.min(p.fadeTime / p.fadeDuration, 1);
        const eased = t * t;

        const cx = 0;
        const cz = 0;
        const dx = p.baseX - cx;
        const dz = p.baseZ - cz;
        const expandFactor = 1 + eased * 1.5;
        positions[i * 3] = cx + dx * expandFactor;
        positions[i * 3 + 2] = cz + dz * expandFactor;
        positions[i * 3 + 1] = p.baseY + Math.sin(this.time * p.speed + p.phase) * p.amplitude + eased * 3;

        const alpha = 1 - eased;
        colors[i * 3] = p.color.r * alpha;
        colors[i * 3 + 1] = p.color.g * alpha;
        colors[i * 3 + 2] = p.color.b * alpha;

        if (t >= 1) {
          p.state = 'inactive';
          positions[i * 3] = 0;
          positions[i * 3 + 1] = -100;
          positions[i * 3 + 2] = 0;
        }
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
    }
  }
}
