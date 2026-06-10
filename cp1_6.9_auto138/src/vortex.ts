import * as THREE from 'three';
import { Seed } from './seed';
import { LinkManager } from './link';

interface Vortex {
  seeds: Seed[];
  center: THREE.Vector3;
  particles: THREE.Points;
  particleCount: number;
  particleAngles: Float32Array;
  particleRadii: Float32Array;
  particleHeights: Float32Array;
  rotationSpeed: number;
  currentAngle: number;
  appearProgress: number;
  appearDuration: number;
  hasAppeared: boolean;
  pulseTimer: number;
  pulseInterval: number;
  pulses: Pulse[];
  avgColor: THREE.Color;
  group: THREE.Group;
}

interface Pulse {
  mesh: THREE.Mesh;
  radius: number;
  maxRadius: number;
  speed: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export class VortexManager {
  public vortexes: Vortex[] = [];
  public group: THREE.Group;
  private knownCycles: Set<string> = new Set();

  constructor() {
    this.group = new THREE.Group();
  }

  private getCycleKey(seeds: Seed[]): string {
    const ids = seeds.map(s => s.mesh.id).sort((a, b) => a - b);
    return ids.join('_');
  }

  public updateVortexes(seeds: Seed[], linkManager: LinkManager): void {
    const cycles = this.findCycles(seeds, linkManager);
    const activeKeys = new Set<string>();

    for (const cycle of cycles) {
      const key = this.getCycleKey(cycle);
      activeKeys.add(key);

      if (!this.knownCycles.has(key)) {
        this.knownCycles.add(key);
        this.createVortex(cycle);
      }
    }

    for (let i = this.vortexes.length - 1; i >= 0; i--) {
      const vortex = this.vortexes[i];
      const key = this.getCycleKey(vortex.seeds);
      if (!activeKeys.has(key)) {
        this.removeVortex(i);
        this.knownCycles.delete(key);
      }
    }
  }

  private findCycles(seeds: Seed[], linkManager: LinkManager): Seed[][] {
    const cycles: Seed[][] = [];
    const visitedCycles = new Set<string>();
    const n = seeds.length;

    for (let start = 0; start < n; start++) {
      this.dfsFindCycles(
        seeds[start],
        seeds[start],
        [seeds[start]],
        new Set<number>([seeds[start].mesh.id]),
        linkManager,
        cycles,
        visitedCycles,
        0,
        n
      );
    }

    return cycles;
  }

  private dfsFindCycles(
    start: Seed,
    current: Seed,
    path: Seed[],
    visited: Set<number>,
    linkManager: LinkManager,
    cycles: Seed[][],
    visitedCycles: Set<string>,
    depth: number,
    maxDepth: number
  ): void {
    if (depth > maxDepth) return;

    const linked = linkManager.getLinkedSeeds(current);

    for (const neighbor of linked) {
      if (neighbor === start && path.length >= 3) {
        const cycleKey = this.getCycleKey(path);
        if (!visitedCycles.has(cycleKey)) {
          visitedCycles.add(cycleKey);
          cycles.push([...path]);
        }
        continue;
      }

      if (!visited.has(neighbor.mesh.id)) {
        visited.add(neighbor.mesh.id);
        path.push(neighbor);
        this.dfsFindCycles(start, neighbor, path, visited, linkManager, cycles, visitedCycles, depth + 1, maxDepth);
        path.pop();
        visited.delete(neighbor.mesh.id);
      }
    }
  }

  private createVortex(seeds: Seed[]): void {
    const center = new THREE.Vector3();
    const avgColor = new THREE.Color(0, 0, 0);

    for (const seed of seeds) {
      center.add(seed.position);
      avgColor.add(seed.color);
    }
    center.divideScalar(seeds.length);
    avgColor.multiplyScalar(1 / seeds.length);

    const particleCount = 50;
    const particleAngles = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);
    const particleHeights = new Float32Array(particleCount);
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particleAngles[i] = Math.random() * Math.PI * 2;
      particleRadii[i] = 0.5 + Math.random() * 1.0;
      particleHeights[i] = (Math.random() - 0.5) * 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);

    const vortexGroup = new THREE.Group();
    vortexGroup.add(particles);
    this.group.add(vortexGroup);

    const vortex: Vortex = {
      seeds: [...seeds],
      center,
      particles,
      particleCount,
      particleAngles,
      particleRadii,
      particleHeights,
      rotationSpeed: 0.02,
      currentAngle: 0,
      appearProgress: 0,
      appearDuration: 3.0,
      hasAppeared: false,
      pulseTimer: 0,
      pulseInterval: 5.0,
      pulses: [],
      avgColor,
      group: vortexGroup
    };

    this.vortexes.push(vortex);
  }

  private removeVortex(index: number): void {
    const vortex = this.vortexes[index];

    for (const pulse of vortex.pulses) {
      this.group.remove(pulse.mesh);
      pulse.mesh.geometry.dispose();
      (pulse.mesh.material as THREE.Material).dispose();
    }

    this.group.remove(vortex.group);
    vortex.particles.geometry.dispose();
    (vortex.particles.material as THREE.Material).dispose();

    this.vortexes.splice(index, 1);
  }

  private emitPulse(vortex: Vortex): void {
    const color = vortex.avgColor.clone();

    const geometry = new THREE.RingGeometry(0.1, 0.15, 64);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(vortex.center);
    mesh.rotation.x = Math.PI / 2;
    this.group.add(mesh);

    const pulse: Pulse = {
      mesh,
      radius: 0.1,
      maxRadius: 3.5,
      speed: 0.3,
      life: 0,
      maxLife: 2.0,
      color
    };

    vortex.pulses.push(pulse);
  }

  public update(deltaTime: number): void {
    const tmpColor = new THREE.Color();

    for (let vi = this.vortexes.length - 1; vi >= 0; vi--) {
      const vortex = this.vortexes[vi];

      const newCenter = new THREE.Vector3();
      const newAvgColor = new THREE.Color(0, 0, 0);
      for (const seed of vortex.seeds) {
        newCenter.add(seed.position);
        newAvgColor.add(seed.color);
      }
      newCenter.divideScalar(vortex.seeds.length);
      newAvgColor.multiplyScalar(1 / vortex.seeds.length);
      vortex.center.lerp(newCenter, deltaTime * 2);
      vortex.avgColor.lerp(newAvgColor, deltaTime * 2);

      if (!vortex.hasAppeared) {
        vortex.appearProgress += deltaTime;
        const t = Math.min(vortex.appearProgress / vortex.appearDuration, 1);
        const easeT = 1 - Math.pow(1 - t, 3);
        (vortex.particles.material as THREE.PointsMaterial).opacity = easeT * 0.4;
        if (t >= 1) vortex.hasAppeared = true;
      }

      vortex.currentAngle += vortex.rotationSpeed;

      const positions = vortex.particles.geometry.attributes.position.array as Float32Array;
      const colors = vortex.particles.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < vortex.particleCount; i++) {
        const angle = vortex.particleAngles[i] + vortex.currentAngle;
        const r = vortex.particleRadii[i] * (vortex.hasAppeared ? 1.5 : 1.5 * (vortex.appearProgress / vortex.appearDuration));
        const h = vortex.particleHeights[i];

        positions[i * 3] = vortex.center.x + Math.cos(angle) * r;
        positions[i * 3 + 1] = vortex.center.y + h;
        positions[i * 3 + 2] = vortex.center.z + Math.sin(angle) * r;

        const colorT = (i / vortex.particleCount + vortex.currentAngle / (Math.PI * 2)) % 1;
        tmpColor.setHSL(
          (vortex.avgColor.getHSL({ h: 0, s: 0, l: 0 }).h + colorT * 0.1) % 1,
          0.7,
          0.6
        );
        colors[i * 3] = tmpColor.r;
        colors[i * 3 + 1] = tmpColor.g;
        colors[i * 3 + 2] = tmpColor.b;
      }

      vortex.particles.geometry.attributes.position.needsUpdate = true;
      vortex.particles.geometry.attributes.color.needsUpdate = true;

      vortex.pulseTimer += deltaTime;
      if (vortex.hasAppeared && vortex.pulseTimer >= vortex.pulseInterval) {
        vortex.pulseTimer = 0;
        this.emitPulse(vortex);
      }

      for (let pi = vortex.pulses.length - 1; pi >= 0; pi--) {
        const pulse = vortex.pulses[pi];
        pulse.life += deltaTime;

        if (pulse.life >= pulse.maxLife) {
          this.group.remove(pulse.mesh);
          pulse.mesh.geometry.dispose();
          (pulse.mesh.material as THREE.Material).dispose();
          vortex.pulses.splice(pi, 1);
          continue;
        }

        pulse.radius += pulse.speed * deltaTime * 60;
        const lifeRatio = pulse.life / pulse.maxLife;
        const scale = pulse.radius / 0.1;

        pulse.mesh.scale.setScalar(scale);
        (pulse.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - lifeRatio);
      }
    }
  }

  public dispose(): void {
    for (let i = this.vortexes.length - 1; i >= 0; i--) {
      this.removeVortex(i);
    }
  }
}
