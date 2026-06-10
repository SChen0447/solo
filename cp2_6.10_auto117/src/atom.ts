import * as THREE from 'three';
import * as _ from 'lodash';

export interface AtomParams {
  n: number;
  l: number;
  opacity?: number;
}

export interface TransitionState {
  active: boolean;
  startTime: number;
  duration: number;
  startPositions: Float32Array;
  endPositions: Float32Array;
  startColors: Float32Array;
  endColors: Float32Array;
}

const PARTICLE_COUNTS: Record<string, number> = {
  '1-0': 3000,
  '2-0': 4000,
  '2-1': 5000,
  '3-0': 6000,
  '3-1': 7000,
  '3-2': 8000,
};

const ORBITAL_NAMES: Record<string, string> = {
  '1-0': '1s',
  '2-0': '2s',
  '2-1': '2p',
  '3-0': '3s',
  '3-1': '3p',
  '3-2': '3d',
};

const BOHR_RADIUS = 1.0;
const SCALE_FACTOR = 2.5;

export class Atom {
  private scene: THREE.Scene;
  private points!: THREE.Points;
  private orbitRing!: THREE.Line;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private currentN: number = 1;
  private currentL: number = 0;
  private opacity: number = 0.8;
  private transition: TransitionState | null = null;
  private ringTransition: {
    active: boolean;
    startTime: number;
    duration: number;
    startRadius: number;
    endRadius: number;
    fadingOut: boolean;
  } | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
  }

  private init(): void {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: this.opacity,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.createOrbitRing();
    this.update({ n: 1, l: 0, opacity: this.opacity }, false);
  }

  private createOrbitRing(): void {
    const ringGeometry = new THREE.BufferGeometry();
    const ringMaterial = new THREE.LineBasicMaterial({
      color: 0x9b59b6,
      transparent: true,
      opacity: 0.2,
      linewidth: 1,
    });

    this.orbitRing = new THREE.Line(ringGeometry, ringMaterial);
    this.scene.add(this.orbitRing);
    this.updateOrbitRing(this.getOrbitRadius(1));
  }

  private getOrbitRadius(n: number): number {
    return n * n * BOHR_RADIUS * SCALE_FACTOR * 0.6;
  }

  private updateOrbitRing(radius: number): void {
    const segments = 128;
    const positions = new Float32Array(segments * 3);

    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
    }

    this.orbitRing.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.orbitRing.geometry.attributes.position.needsUpdate = true;
  }

  public getOrbitalName(n: number, l: number): string {
    return ORBITAL_NAMES[`${n}-${l}`] || `${n}?`;
  }

  public getParticleCount(n: number, l: number): number {
    return PARTICLE_COUNTS[`${n}-${l}`] || 3000;
  }

  private radialProbabilityDensity(n: number, l: number, r: number): number {
    const rho = 2 * r / (n * BOHR_RADIUS);

    switch (n) {
      case 1:
        if (l === 0) {
          return 4 * r * r * Math.exp(-2 * r / BOHR_RADIUS) / (BOHR_RADIUS * BOHR_RADIUS * BOHR_RADIUS);
        }
        break;
      case 2:
        if (l === 0) {
          return r * r * Math.pow(2 - rho, 2) * Math.exp(-rho) / (8 * BOHR_RADIUS * BOHR_RADIUS * BOHR_RADIUS);
        } else if (l === 1) {
          return r * r * rho * rho * Math.exp(-rho) / (24 * BOHR_RADIUS * BOHR_RADIUS * BOHR_RADIUS);
        }
        break;
      case 3:
        if (l === 0) {
          const poly = 27 - 18 * rho + 2 * rho * rho;
          return r * r * poly * poly * Math.exp(-rho) / (19683 * BOHR_RADIUS * BOHR_RADIUS * BOHR_RADIUS);
        } else if (l === 1) {
          const poly = 6 - rho;
          return r * r * rho * rho * poly * poly * Math.exp(-rho) / (1296 * BOHR_RADIUS * BOHR_RADIUS * BOHR_RADIUS);
        } else if (l === 2) {
          return r * r * Math.pow(rho, 4) * Math.exp(-rho) / (9720 * BOHR_RADIUS * BOHR_RADIUS * BOHR_RADIUS);
        }
        break;
    }
    return 0;
  }

  private sampleRadialPosition(n: number, l: number): number {
    const maxR = n * n * BOHR_RADIUS * 6;
    let maxP = 0;

    for (let i = 0; i <= 100; i++) {
      const r = (i / 100) * maxR;
      const p = this.radialProbabilityDensity(n, l, r);
      if (p > maxP) maxP = p;
    }
    maxP *= 1.1;

    let attempts = 0;
    while (attempts < 1000) {
      const r = Math.random() * maxR;
      const p = this.radialProbabilityDensity(n, l, r);
      if (Math.random() * maxP < p) {
        return r * SCALE_FACTOR;
      }
      attempts++;
    }
    return maxR * 0.5 * SCALE_FACTOR;
  }

  private sampleAngularPosition(l: number): { theta: number; phi: number } {
    const phi = Math.random() * Math.PI * 2;
    let theta: number;

    if (l === 0) {
      theta = Math.acos(2 * Math.random() - 1);
    } else if (l === 1) {
      const u = Math.random();
      if (u < 0.5) {
        theta = Math.acos(1 - 2 * Math.pow(2 * u, 1 / 3));
      } else {
        theta = Math.acos(1 - 2 * Math.pow(2 * (1 - u), 1 / 3) * -1 + 0);
      }
      theta = Math.acos(2 * Math.random() - 1);
    } else if (l === 2) {
      theta = Math.acos(2 * Math.random() - 1);
    } else {
      theta = Math.acos(2 * Math.random() - 1);
    }

    return { theta, phi };
  }

  private generateParticlePositions(n: number, l: number, count: number): Float32Array {
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = this.sampleRadialPosition(n, l);
      const { theta, phi } = this.sampleAngularPosition(l);

      positions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = r * Math.cos(theta);
    }

    return positions;
  }

  private generateParticleColors(positions: Float32Array, baseOpacity: number): Float32Array {
    const colors = new Float32Array(positions.length);
    const count = positions.length / 3;

    const maxDistance = this.getOrbitRadius(3) * 1.5;

    for (let i = 0; i < count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const distance = Math.sqrt(x * x + y * y + z * z);
      const t = Math.min(distance / maxDistance, 1.0);

      const centerColor = { r: 1.0, g: 1.0, b: 1.0 };
      const edgeColor = { r: 0.1176, g: 0.5647, b: 1.0 };

      colors[i * 3] = centerColor.r + (edgeColor.r - centerColor.r) * t;
      colors[i * 3 + 1] = centerColor.g + (edgeColor.g - centerColor.g) * t;
      colors[i * 3 + 2] = centerColor.b + (edgeColor.b - centerColor.b) * t;
    }

    return colors;
  }

  public update(params: AtomParams, animate: boolean = true): void {
    const { n, l, opacity } = params;

    if (opacity !== undefined) {
      this.opacity = opacity;
      this.material.opacity = opacity;
    }

    if (n === this.currentN && l === this.currentL && animate) {
      return;
    }

    const targetCount = this.getParticleCount(n, l);
    const currentPositions = this.geometry.attributes.position?.array as Float32Array;
    const currentColors = this.geometry.attributes.color?.array as Float32Array;

    const newPositions = this.generateParticlePositions(n, l, targetCount);
    const newColors = this.generateParticleColors(newPositions, this.opacity);

    if (animate && currentPositions && currentColors && currentPositions.length > 0) {
      const startCount = currentPositions.length / 3;
      const endCount = targetCount;
      const animCount = Math.max(startCount, endCount);

      const startPos = new Float32Array(animCount * 3);
      const endPos = new Float32Array(animCount * 3);
      const startCol = new Float32Array(animCount * 3);
      const endCol = new Float32Array(animCount * 3);

      for (let i = 0; i < animCount; i++) {
        const si = Math.min(i, startCount - 1);
        const ei = Math.min(i, endCount - 1);

        startPos[i * 3] = currentPositions[si * 3];
        startPos[i * 3 + 1] = currentPositions[si * 3 + 1];
        startPos[i * 3 + 2] = currentPositions[si * 3 + 2];

        startCol[i * 3] = currentColors[si * 3];
        startCol[i * 3 + 1] = currentColors[si * 3 + 1];
        startCol[i * 3 + 2] = currentColors[si * 3 + 2];

        endPos[i * 3] = newPositions[ei * 3];
        endPos[i * 3 + 1] = newPositions[ei * 3 + 1];
        endPos[i * 3 + 2] = newPositions[ei * 3 + 2];

        endCol[i * 3] = newColors[ei * 3];
        endCol[i * 3 + 1] = newColors[ei * 3 + 1];
        endCol[i * 3 + 2] = newColors[ei * 3 + 2];
      }

      this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(startPos), 3));
      this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(startCol), 3));

      this.transition = {
        active: true,
        startTime: performance.now(),
        duration: 800,
        startPositions: startPos,
        endPositions: endPos,
        startColors: startCol,
        endColors: endCol,
      };
    } else {
      this.geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
      this.geometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3));
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
    }

    const oldRadius = this.getOrbitRadius(this.currentN);
    const newRadius = this.getOrbitRadius(n);
    if (oldRadius !== newRadius) {
      this.ringTransition = {
        active: true,
        startTime: performance.now(),
        duration: 500,
        startRadius: oldRadius,
        endRadius: newRadius,
        fadingOut: true,
      };
    }

    this.currentN = n;
    this.currentL = l;
  }

  public updateOpacity(opacity: number): void {
    this.opacity = opacity;
    this.material.opacity = opacity;
  }

  public animate(currentTime: number): void {
    if (this.transition && this.transition.active) {
      const elapsed = currentTime - this.transition.startTime;
      const progress = Math.min(elapsed / this.transition.duration, 1.0);
      const eased = 1 - Math.pow(1 - progress, 3);

      const positions = this.geometry.attributes.position.array as Float32Array;
      const colors = this.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < positions.length; i++) {
        positions[i] = this.transition.startPositions[i] + (this.transition.endPositions[i] - this.transition.startPositions[i]) * eased;
        colors[i] = this.transition.startColors[i] + (this.transition.endColors[i] - this.transition.startColors[i]) * eased;
      }

      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;

      if (progress >= 1.0) {
        this.transition.active = false;
        const finalCount = this.transition.endPositions.length / 3;
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.transition.endPositions.slice(0, finalCount * 3), 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.transition.endColors.slice(0, finalCount * 3), 3));
        this.transition = null;
      }
    }

    if (this.ringTransition && this.ringTransition.active) {
      const elapsed = currentTime - this.ringTransition.startTime;
      const totalDuration = this.ringTransition.duration * 2;
      const progress = Math.min(elapsed / totalDuration, 1.0);

      const ringMaterial = this.orbitRing.material as THREE.LineBasicMaterial;

      if (this.ringTransition.fadingOut) {
        const fadeProgress = Math.min(elapsed / this.ringTransition.duration, 1.0);
        ringMaterial.opacity = 0.2 * (1 - fadeProgress);

        if (fadeProgress >= 1.0) {
          this.ringTransition.fadingOut = false;
          this.updateOrbitRing(this.ringTransition.endRadius);
        }
      } else {
        const fadeInProgress = Math.min((elapsed - this.ringTransition.duration) / this.ringTransition.duration, 1.0);
        ringMaterial.opacity = 0.2 * fadeInProgress;

        if (progress >= 1.0) {
          this.ringTransition.active = false;
          ringMaterial.opacity = 0.2;
          this.ringTransition = null;
        }
      }
    }
  }

  public getCurrentState(): { n: number; l: number; name: string } {
    return {
      n: this.currentN,
      l: this.currentL,
      name: this.getOrbitalName(this.currentN, this.currentL),
    };
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.orbitRing.geometry.dispose();
    (this.orbitRing.material as THREE.Material).dispose();
    this.scene.remove(this.points);
    this.scene.remove(this.orbitRing);
  }
}
