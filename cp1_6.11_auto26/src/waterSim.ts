import * as THREE from 'three';

export interface ObstacleInfo {
  id: string;
  type: 'circle' | 'square';
  x: number;
  z: number;
  size: number;
}

export type RiverShape = 'straight' | 'curved' | 'forked';

export interface WaterSimOptions {
  width: number;
  length: number;
  segmentsWidth: number;
  segmentsLength: number;
}

export class WaterSim {
  public mesh: THREE.Mesh;
  public geometry: THREE.PlaneGeometry;
  private basePositions: Float32Array;
  private originalPositions: Float32Array;
  private targetPositions: Float32Array;
  private options: WaterSimOptions;
  private flowSpeed: number = 1.0;
  private time: number = 0;
  private obstacles: ObstacleInfo[] = [];
  private riverShape: RiverShape = 'straight';
  private shapeTransition: number = 1.0;
  private targetShape: RiverShape = 'straight';
  private transitionProgress: number = 1.0;
  private waterLevel: number = 0.65;

  constructor(options: Partial<WaterSimOptions> = {}) {
    this.options = {
      width: 30,
      length: 100,
      segmentsWidth: 60,
      segmentsLength: 200,
      ...options
    };

    this.geometry = new THREE.PlaneGeometry(
      this.options.width,
      this.options.length,
      this.options.segmentsWidth,
      this.options.segmentsLength
    );

    this.geometry.rotateX(-Math.PI / 2);

    const pos = this.geometry.attributes.position;
    this.basePositions = new Float32Array(pos.array);
    this.originalPositions = new Float32Array(pos.array);
    this.targetPositions = new Float32Array(pos.array);

    this.applyRiverShape('straight', this.originalPositions);

    const material = new THREE.MeshPhongMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.8,
      shininess: 100,
      specular: 0x88ccff,
      side: THREE.DoubleSide,
      flatShading: false
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;
  }

  public setFlowSpeed(speed: number): void {
    this.flowSpeed = speed;
  }

  public getFlowSpeed(): number {
    return this.flowSpeed;
  }

  public setObstacles(obstacles: ObstacleInfo[]): void {
    this.obstacles = obstacles;
  }

  public setRiverShape(shape: RiverShape): void {
    if (this.targetShape === shape) return;
    this.targetShape = shape;
    this.transitionProgress = 0;
    this.applyRiverShape(this.riverShape, this.originalPositions);
    this.applyRiverShape(shape, this.targetPositions);
  }

  public getRiverShape(): RiverShape {
    return this.riverShape;
  }

  public getWaterLevel(): number {
    return this.waterLevel;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime * this.flowSpeed;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / 1.5);
      const t = this.easeInOutCubic(this.transitionProgress);
      this.lerpPositions(this.originalPositions, this.targetPositions, t, this.basePositions);
      if (this.transitionProgress >= 1) {
        this.riverShape = this.targetShape;
      }
    }

    this.updateWaterSurface();
    this.updateWaterLevel();
  }

  private updateWaterSurface(): void {
    const pos = this.geometry.attributes.position;
    const positions = pos.array as Float32Array;
    const segW = this.options.segmentsWidth;
    const segL = this.options.segmentsLength;

    for (let i = 0; i <= segL; i++) {
      for (let j = 0; j <= segW; j++) {
        const idx = (i * (segW + 1) + j) * 3;

        const baseX = this.basePositions[idx];
        const baseY = this.basePositions[idx + 1];
        const baseZ = this.basePositions[idx + 2];

        const normalizedZ = (baseZ + this.options.length / 2) / this.options.length;

        const wave1 = Math.sin(baseX * 0.8 + this.time * 2.0) * 0.08;
        const wave2 = Math.sin(baseZ * 1.2 - this.time * 3.0 + baseX * 0.5) * 0.05;
        const wave3 = Math.sin((baseX + baseZ) * 0.6 + this.time * 1.5) * 0.03;

        let ripple = wave1 + wave2 + wave3;

        const foamAmount = Math.sin(normalizedZ * 10 + this.time * 0.5) * 0.02;
        ripple += foamAmount * (0.5 + 0.5 * Math.sin(baseX * 3));

        let obstacleDisplacement = 0;
        let obstacleBump = 0;

        for (const obs of this.obstacles) {
          const dx = baseX - obs.x;
          const dz = baseZ - obs.z;
          let dist: number;

          if (obs.type === 'circle') {
            dist = Math.sqrt(dx * dx + dz * dz);
          } else {
            const halfSize = obs.size / 2;
            const dxAbs = Math.abs(dx) - halfSize;
            const dzAbs = Math.abs(dz) - halfSize;
            dist = Math.max(dxAbs, dzAbs);
            if (dxAbs > 0 && dzAbs > 0) {
              dist = Math.sqrt(dxAbs * dxAbs + dzAbs * dzAbs);
            }
          }

          const radius = obs.size * 0.6;
          const influenceRadius = obs.size * 2.5;

          if (dist < influenceRadius) {
            const influence = 1 - Math.min(1, dist / influenceRadius);
            const smoothInfluence = influence * influence * (3 - 2 * influence);

            obstacleBump += Math.exp(-dist * dist / (radius * radius)) * 0.4 * smoothInfluence;

            const flowDeflection = Math.sin(dist * 1.5 - this.time * 4) * 0.1;
            obstacleDisplacement += flowDeflection * smoothInfluence;

            if (dist < radius * 1.5 && dz < 0) {
              const wakeFactor = 1 - Math.abs(dz) / (radius * 2);
              const vortex = Math.sin(this.time * 3 + dist * 2) * 0.15;
              obstacleDisplacement += vortex * wakeFactor * wakeFactor;
            }
          }
        }

        positions[idx + 1] = baseY + ripple + obstacleBump + obstacleDisplacement * 0.3;
      }
    }

    pos.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private updateWaterLevel(): void {
    const baseWidth = this.getRiverAvgWidth();
    const targetLevel = Math.min(1, Math.max(0.2, (this.flowSpeed / 2) * (15 / baseWidth)));
    this.waterLevel += (targetLevel - this.waterLevel) * 0.02;
  }

  private getRiverAvgWidth(): number {
    return this.options.width * 0.6;
  }

  private applyRiverShape(shape: RiverShape, positions: Float32Array): void {
    const segW = this.options.segmentsWidth;
    const segL = this.options.segmentsLength;
    const halfWidth = this.options.width / 2;
    const halfLength = this.options.length / 2;

    for (let i = 0; i <= segL; i++) {
      for (let j = 0; j <= segW; j++) {
        const idx = (i * (segW + 1) + j) * 3;

        const t = i / segL;
        const u = j / segW;

        const z = -halfLength + t * this.options.length;

        let centerX = 0;
        let riverHalfWidth = halfWidth * 0.6;

        switch (shape) {
          case 'straight':
            centerX = 0;
            riverHalfWidth = halfWidth * 0.5;
            break;

          case 'curved':
            centerX = Math.sin(t * Math.PI * 1.2) * 8;
            riverHalfWidth = halfWidth * 0.45 + Math.sin(t * Math.PI * 2) * 1.5;
            break;

          case 'forked':
            if (t < 0.4) {
              centerX = 0;
              riverHalfWidth = halfWidth * 0.5;
            } else if (t < 0.55) {
              const forkT = (t - 0.4) / 0.15;
              const smoothT = forkT * forkT * (3 - 2 * forkT);
              centerX = 0;
              riverHalfWidth = halfWidth * 0.5 + smoothT * 3;
            } else {
              const forkT = (t - 0.55) / 0.45;
              if (u < 0.5) {
                centerX = -3 - forkT * 5;
                riverHalfWidth = halfWidth * 0.35;
              } else {
                centerX = 3 + forkT * 5;
                riverHalfWidth = halfWidth * 0.35;
              }
            }
            break;
        }

        const x = centerX + (u - 0.5) * 2 * riverHalfWidth;

        positions[idx] = x;
        positions[idx + 1] = 0;
        positions[idx + 2] = z;
      }
    }
  }

  private lerpPositions(
    from: Float32Array,
    to: Float32Array,
    t: number,
    out: Float32Array
  ): void {
    for (let i = 0; i < from.length; i++) {
      out[i] = from[i] + (to[i] - from[i]) * t;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
