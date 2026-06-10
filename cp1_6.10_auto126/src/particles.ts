import * as THREE from 'three';
import CaveSystem, { CaveChannel } from './cave';

interface WaterParticle {
  progress: number;
  pathIndex: number;
  speed: number;
  turbulencePhase: number;
  colorMix: number;
}

interface PathBranch {
  channel: CaveChannel;
  curve: THREE.CatmullRomCurve3;
  length: number;
  children: PathBranch[];
}

class WaterParticleSystem {
  public points: THREE.Points;
  public particleCount: number;
  private scene: THREE.Scene;
  private caveSystem: CaveSystem;
  private particles: WaterParticle[] = [];
  private paths: PathBranch[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private waterSpeed: number = 0.3;
  private fpsAccumulator: number = 0;
  private fpsFrameCount: number = 0;
  private fpsLastCheck: number = 0;
  private fpsReduced: boolean = false;
  private currentDrawCount: number = 500;
  private readonly baseCount = 500;
  private readonly reducedCount = 250;
  private readonly colorStart = new THREE.Color('#00b4d8');
  private readonly colorEnd = new THREE.Color('#0077b6');

  constructor(scene: THREE.Scene, caveSystem: CaveSystem) {
    this.scene = scene;
    this.caveSystem = caveSystem;
    this.particleCount = this.baseCount;
    this.buildPaths();
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.baseCount * 3);
    this.colors = new Float32Array(this.baseCount * 3);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
    this.initParticles();
    this.fpsLastCheck = performance.now();
  }

  private buildPaths(): void {
    this.paths = [];
    const mainChannels = this.caveSystem.channels.filter(c => c.isMain);
    for (const channel of mainChannels) {
      const branch = this.buildPathBranch(channel);
      if (branch) this.paths.push(branch);
    }
  }

  private buildPathBranch(channel: CaveChannel): PathBranch {
    const curve = new THREE.CatmullRomCurve3(channel.points);
    const branch: PathBranch = {
      channel,
      curve,
      length: curve.getLength(),
      children: []
    };
    for (const child of channel.children) {
      const childBranch = this.buildPathBranch(child);
      branch.children.push(childBranch);
    }
    const branches = this.caveSystem.channels.filter(c => {
      if (c.isMain) return false;
      const firstPoint = c.points[0];
      for (const pt of channel.points) {
        if (pt.distanceTo(firstPoint) < 1.5) return true;
      }
      return false;
    });
    for (const br of branches) {
      if (!branch.children.find(b => b.channel.id === br.id)) {
        branch.children.push(this.buildPathBranch(br));
      }
    }
    return branch;
  }

  private getRandomPath(level: number = 0): PathBranch {
    if (this.paths.length === 0) {
      this.buildPaths();
    }
    if (this.paths.length === 0) {
      const fallback = this.caveSystem.channels[0];
      return {
        channel: fallback,
        curve: new THREE.CatmullRomCurve3(fallback.points),
        length: new THREE.CatmullRomCurve3(fallback.points).getLength(),
        children: []
      };
    }
    let current = this.paths[Math.floor(Math.random() * this.paths.length)];
    const maxDepth = 2;
    for (let i = 0; i < level && i < maxDepth; i++) {
      if (current.children.length === 0) break;
      current = this.selectBranchByWidth(current.children);
    }
    return current;
  }

  private selectBranchByWidth(branches: PathBranch[]): PathBranch {
    if (branches.length === 0) {
      return {
        channel: this.caveSystem.channels[0],
        curve: new THREE.CatmullRomCurve3(this.caveSystem.channels[0].points),
        length: 0,
        children: []
      };
    }
    const totalWidth = branches.reduce((s, b) => s + b.channel.branchWidth, 0);
    let r = Math.random() * totalWidth;
    for (const b of branches) {
      r -= b.channel.branchWidth;
      if (r <= 0) return b;
    }
    return branches[branches.length - 1];
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.baseCount; i++) {
      const path = this.getRandomPath(Math.floor(Math.random() * 2));
      this.particles.push({
        progress: Math.random(),
        pathIndex: i,
        speed: 0.8 + Math.random() * 0.4,
        turbulencePhase: Math.random() * Math.PI * 2,
        colorMix: Math.random()
      });
      (this.particles[this.particles.length - 1] as WaterParticle & { path: PathBranch }).path = path;
    }
    for (let i = 0; i < this.baseCount; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = 0;
      this.positions[i * 3 + 2] = 0;
      this.colors[i * 3] = this.colorStart.r;
      this.colors[i * 3 + 1] = this.colorStart.g;
      this.colors[i * 3 + 2] = this.colorStart.b;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public setWaterSpeed(speed: number): void {
    this.waterSpeed = speed;
  }

  public rebuildPaths(): void {
    this.buildPaths();
  }

  public update(time: number, deltaTime: number): void {
    this.checkFPS(deltaTime);
    const activeCount = this.fpsReduced ? this.reducedCount : this.baseCount;
    if (this.currentDrawCount !== activeCount) {
      this.geometry.setDrawRange(0, activeCount);
      this.currentDrawCount = activeCount;
    }
    const pathWidth = 0.3;
    const turbFreq = 0.5;
    const turbAmp = 0.1;
    const speedPerSec = this.waterSpeed * 60;
    for (let i = 0; i < activeCount; i++) {
      const p = this.particles[i] as WaterParticle & { path?: PathBranch };
      if (!p.path) {
        p.path = this.getRandomPath(Math.floor(Math.random() * 2));
      }
      const path = p.path;
      if (!path || path.length === 0) {
        p.progress = 0;
        p.path = this.getRandomPath(0);
        continue;
      }
      const deltaProgress = (deltaTime * speedPerSec * p.speed) / path.length;
      p.progress += deltaProgress;
      if (p.progress >= 1) {
        p.progress -= 1;
        if (path.children.length > 0 && Math.random() < 0.4) {
          p.path = this.selectBranchByWidth(path.children);
        } else if (Math.random() < 0.3) {
          p.path = this.getRandomPath(Math.floor(Math.random() * 2));
          p.progress = 0;
        }
      }
      const t = Math.max(0, Math.min(1, p.progress));
      const pos = path.curve.getPointAt(t);
      const tangent = path.curve.getTangentAt(t).normalize();
      let normal = new THREE.Vector3(
        tangent.y,
        -tangent.x,
        0
      );
      if (normal.lengthSq() < 0.01) {
        normal = new THREE.Vector3(1, 0, 0);
      } else {
        normal.normalize();
      }
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      const turbX = Math.sin(time * Math.PI * 2 * turbFreq + p.turbulencePhase) * turbAmp;
      const turbY = Math.cos(time * Math.PI * 2 * turbFreq * 1.3 + p.turbulencePhase * 1.7) * turbAmp;
      const widthOffset = (Math.random() - 0.5) * pathWidth;
      const offset = new THREE.Vector3()
        .addScaledVector(normal, turbX + widthOffset * 0.5)
        .addScaledVector(binormal, turbY + widthOffset * 0.5);
      const finalPos = pos.clone().add(offset);
      this.positions[i * 3] = finalPos.x;
      this.positions[i * 3 + 1] = finalPos.y;
      this.positions[i * 3 + 2] = finalPos.z;
      const depthMix = Math.min(1, t * 0.8 + p.colorMix * 0.2);
      const c = this.colorStart.clone().lerp(this.colorEnd, depthMix);
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private checkFPS(deltaTime: number): void {
    this.fpsAccumulator += deltaTime;
    this.fpsFrameCount++;
    const now = performance.now();
    if (now - this.fpsLastCheck > 2000) {
      const avgDelta = this.fpsAccumulator / this.fpsFrameCount;
      const fps = 1 / avgDelta;
      if (!this.fpsReduced && fps < 30) {
        this.fpsReduced = true;
      }
      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;
      this.fpsLastCheck = now;
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }
}

export default WaterParticleSystem;
