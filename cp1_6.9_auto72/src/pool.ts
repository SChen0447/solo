import * as THREE from 'three';
import { Bubble, BubbleState, BubbleConfig } from './bubble';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

export interface CrystalData {
  mesh: THREE.Mesh;
  baseY: number;
  color: THREE.Color;
}

export class BubblePool {
  public scene: THREE.Scene;
  public bubbles: Bubble[];
  public poolGroup: THREE.Group;
  public particles: Particle[];
  public particleMesh: THREE.Points;
  public particleGeometry: THREE.BufferGeometry;
  public poolMesh: THREE.Mesh;
  public poolEdge: THREE.Line;
  public crystals: CrystalData[];
  public waveTexture: THREE.CanvasTexture;
  public waveMesh: THREE.Mesh;
  public maxBubbles: number;
  public maxParticles: number;
  public onPopCallback: (() => void) | null;
  
  private spatialGrid: Map<string, Bubble[]>;
  private cellSize: number;
  private particlePositions: Float32Array;
  private particleColors: Float32Array;
  private particleSizes: Float32Array;
  private waveCanvas: HTMLCanvasElement;
  private waveCtx: CanvasRenderingContext2D;
  private time: number;
  private readonly POOL_RADIUS = 5;
  private readonly POOL_HEIGHT = 4.5;
  private readonly WAVE_RADIUS = 2;
  private readonly GRID_CELL_SIZE = 1.5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.bubbles = [];
    this.particles = [];
    this.maxBubbles = 150;
    this.maxParticles = 10000;
    this.onPopCallback = null;
    this.cellSize = this.GRID_CELL_SIZE;
    this.spatialGrid = new Map();
    this.time = 0;

    this.poolGroup = new THREE.Group();
    this.scene.add(this.poolGroup);

    this.createPoolGeometry();
    this.createWaveTexture();
    this.createCrystals();
    this.createParticleSystem();
  }

  private createPoolGeometry(): void {
    const poolGeo = new THREE.SphereGeometry(this.POOL_RADIUS, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const poolMat = new THREE.ShaderMaterial({
      uniforms: {
        uColorInner: { value: new THREE.Color('#1a0a2a') },
        uColorOuter: { value: new THREE.Color('#2a1a3a') },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorInner;
        uniform vec3 uColorOuter;
        uniform float uTime;
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          float dist = length(vPosition.xy);
          float mixFactor = dist / 5.0;
          vec3 color = mix(uColorInner, uColorOuter, mixFactor);
          float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
          color += fresnel * vec3(0.3, 0.2, 0.5) * 0.5;
          gl_FragColor = vec4(color, 0.35 + fresnel * 0.2);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.poolMesh = new THREE.Mesh(poolGeo, poolMat);
    this.poolMesh.rotation.x = Math.PI;
    this.poolGroup.add(this.poolMesh);

    const edgePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      edgePoints.push(new THREE.Vector3(
        Math.cos(angle) * this.POOL_RADIUS,
        0,
        Math.sin(angle) * this.POOL_RADIUS
      ));
    }
    const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xaa88ff,
      transparent: true,
      opacity: 0.8
    });
    this.poolEdge = new THREE.Line(edgeGeo, edgeMat);
    this.poolGroup.add(this.poolEdge);
  }

  private createWaveTexture(): void {
    this.waveCanvas = document.createElement('canvas');
    this.waveCanvas.width = 512;
    this.waveCanvas.height = 512;
    this.waveCtx = this.waveCanvas.getContext('2d')!;
    
    this.waveTexture = new THREE.CanvasTexture(this.waveCanvas);
    this.waveTexture.needsUpdate = true;

    const waveGeo = new THREE.CircleGeometry(this.WAVE_RADIUS, 64);
    const waveMat = new THREE.MeshBasicMaterial({
      map: this.waveTexture,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.waveMesh = new THREE.Mesh(waveGeo, waveMat);
    this.waveMesh.rotation.x = -Math.PI / 2;
    this.waveMesh.position.y = -this.POOL_HEIGHT + 0.05;
    this.poolGroup.add(this.waveMesh);
  }

  private updateWaveTexture(time: number): void {
    const ctx = this.waveCtx;
    const w = this.waveCanvas.width;
    const h = this.waveCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const cycle = (time % 4) / 4;
    const expandPhase = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
    const baseRadius = (w * 0.15) + expandPhase * (w * 0.35);

    for (let ring = 0; ring < 5; ring++) {
      const ringPhase = (cycle + ring * 0.2) % 1;
      const ringRadius = baseRadius * (0.3 + ringPhase * 0.7);
      const opacity = Math.sin(ringPhase * Math.PI) * 0.6;
      
      if (opacity > 0) {
        const gradient = ctx.createRadialGradient(cx, cy, ringRadius * 0.9, cx, cy, ringRadius);
        gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
        gradient.addColorStop(0.5, `rgba(200, 170, 255, ${opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(170, 136, 255, 0)`);
        
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    const centerGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.2);
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    centerGradient.addColorStop(1, 'rgba(170, 136, 255, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = centerGradient;
    ctx.fill();

    this.waveTexture.needsUpdate = true;
  }

  private createCrystals(): void {
    this.crystals = [];
    const crystalColors = [0xff3366, 0xffcc33, 0x33ff66, 0x3366ff];
    
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(angle) * (this.POOL_RADIUS - 0.3);
      const z = Math.sin(angle) * (this.POOL_RADIUS - 0.3);
      const y = 0.2;

      const crystalGeo = new THREE.OctahedronGeometry(0.2, 0);
      const crystalColor = new THREE.Color(crystalColors[i]);
      const crystalMat = new THREE.MeshBasicMaterial({
        color: crystalColor,
        transparent: true,
        opacity: 0.9
      });
      const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
      crystalMesh.position.set(x, y, z);
      crystalMesh.userData.crystalIndex = i;
      crystalMesh.userData.isCrystal = true;

      const edgeGeo = new THREE.EdgesGeometry(crystalGeo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: crystalColor,
        transparent: true,
        opacity: 1
      });
      const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
      crystalMesh.add(edgeLines);

      this.poolGroup.add(crystalMesh);
      this.crystals.push({
        mesh: crystalMesh,
        baseY: y,
        color: crystalColor
      });
    }
  }

  private createParticleSystem(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.maxParticles * 3);
    this.particleColors = new Float32Array(this.maxParticles * 3);
    this.particleSizes = new Float32Array(this.maxParticles);

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particleMesh = new THREE.Points(this.particleGeometry, particleMat);
    this.poolGroup.add(this.particleMesh);
  }

  public getBubbleCount(): number {
    return this.bubbles.length;
  }

  public createBubble(config: BubbleConfig): Bubble | null {
    if (this.bubbles.length >= this.maxBubbles) return null;
    
    const bubble = new Bubble(config);
    this.bubbles.push(bubble);
    this.poolGroup.add(bubble.mesh);
    return bubble;
  }

  public createInitialBubbles(count: number = 20): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (this.POOL_RADIUS - 1);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = -this.POOL_HEIGHT + 0.5 + Math.random() * 1;

      const radius = 0.3 + Math.random() * 0.5;
      const hue = Math.random();
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);

      const bubble = this.createBubble({
        position: new THREE.Vector3(x, y, z),
        targetRadius: radius,
        color,
        growDuration: 0.8
      });
      
      if (bubble) {
        bubble.state = BubbleState.FLOATING;
        bubble.currentRadius = radius;
      }
    }
  }

  public clearAllBubbles(): void {
    for (const bubble of this.bubbles) {
      this.poolGroup.remove(bubble.mesh);
      bubble.dispose();
    }
    this.bubbles = [];
    this.particles = [];
  }

  public setAllBubblesColor(color: THREE.Color, boostSpeed: boolean = true): void {
    for (const bubble of this.bubbles) {
      bubble.setTargetColor(color, true);
      if (boostSpeed) {
        bubble.speedMultiplier = 1.5;
        setTimeout(() => {
          bubble.speedMultiplier = 1;
        }, 3000);
      }
    }
  }

  private buildSpatialGrid(): void {
    this.spatialGrid.clear();
    
    for (const bubble of this.bubbles) {
      if (bubble.state !== BubbleState.FLOATING) continue;
      
      const minX = Math.floor((bubble.position.x - bubble.currentRadius) / this.cellSize);
      const maxX = Math.floor((bubble.position.x + bubble.currentRadius) / this.cellSize);
      const minY = Math.floor((bubble.position.y - bubble.currentRadius) / this.cellSize);
      const maxY = Math.floor((bubble.position.y + bubble.currentRadius) / this.cellSize);
      const minZ = Math.floor((bubble.position.z - bubble.currentRadius) / this.cellSize);
      const maxZ = Math.floor((bubble.position.z + bubble.currentRadius) / this.cellSize);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          for (let z = minZ; z <= maxZ; z++) {
            const key = `${x},${y},${z}`;
            if (!this.spatialGrid.has(key)) {
              this.spatialGrid.set(key, []);
            }
            this.spatialGrid.get(key)!.push(bubble);
          }
        }
      }
    }
  }

  private getNearbyBubbles(bubble: Bubble): Bubble[] {
    const nearby: Set<Bubble> = new Set();
    
    const minX = Math.floor((bubble.position.x - bubble.currentRadius) / this.cellSize);
    const maxX = Math.floor((bubble.position.x + bubble.currentRadius) / this.cellSize);
    const minY = Math.floor((bubble.position.y - bubble.currentRadius) / this.cellSize);
    const maxY = Math.floor((bubble.position.y + bubble.currentRadius) / this.cellSize);
    const minZ = Math.floor((bubble.position.z - bubble.currentRadius) / this.cellSize);
    const maxZ = Math.floor((bubble.position.z + bubble.currentRadius) / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const key = `${x},${y},${z}`;
          const cell = this.spatialGrid.get(key);
          if (cell) {
            for (const b of cell) {
              if (b !== bubble) {
                nearby.add(b);
              }
            }
          }
        }
      }
    }
    
    return Array.from(nearby);
  }

  private checkCollisions(): void {
    this.buildSpatialGrid();
    const mergedPairs: Set<Bubble> = new Set();

    for (const bubble of this.bubbles) {
      if (bubble.state !== BubbleState.FLOATING) continue;
      if (mergedPairs.has(bubble)) continue;

      const nearby = this.getNearbyBubbles(bubble);
      
      for (const other of nearby) {
        if (other.state !== BubbleState.FLOATING) continue;
        if (mergedPairs.has(other)) continue;

        const dx = other.position.x - bubble.position.x;
        const dy = other.position.y - bubble.position.y;
        const dz = other.position.z - bubble.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = bubble.currentRadius + other.currentRadius;

        if (dist < minDist * 0.95) {
          this.mergeBubbles(bubble, other);
          mergedPairs.add(bubble);
          mergedPairs.add(other);
          break;
        }
      }
    }
  }

  private mergeBubbles(bubbleA: Bubble, bubbleB: Bubble): void {
    const larger = bubbleA.currentRadius >= bubbleB.currentRadius ? bubbleA : bubbleB;
    const smaller = larger === bubbleA ? bubbleB : bubbleA;

    const newRadius = Math.min(1.6, (bubbleA.currentRadius + bubbleB.currentRadius) * 0.8);
    const midPos = new THREE.Vector3().addVectors(
      bubbleA.position.clone().multiplyScalar(bubbleA.currentRadius),
      bubbleB.position.clone().multiplyScalar(bubbleB.currentRadius)
    ).divideScalar(bubbleA.currentRadius + bubbleB.currentRadius);

    const newColor = new THREE.Color().lerpColors(
      bubbleA.color,
      bubbleB.color,
      0.5
    );

    this.spawnMergeParticles(midPos, newColor);

    smaller.startMerge(larger);

    larger.position.copy(midPos);
    larger.targetRadius = newRadius;
    larger.currentRadius = newRadius;
    larger.color.copy(newColor);
    larger.targetColor.copy(newColor);
    larger.colorTransitionProgress = 1;
    larger.material.uniforms.uColorOffset.value = Math.random();
    
    const hsl = { h: 0, s: 0, l: 0 };
    newColor.getHSL(hsl);
    const startHSL = { h: (hsl.h + 0.05) % 1, s: Math.min(hsl.s + 0.1, 1), l: Math.min(hsl.l + 0.1, 1) };
    const endHSL = { h: (hsl.h + 0.55) % 1, s: Math.min(hsl.s + 0.15, 1), l: Math.max(hsl.l - 0.1, 0.3) };
    larger.material.uniforms.uColorStart.value.setHSL(startHSL.h, startHSL.s, startHSL.l);
    larger.material.uniforms.uColorEnd.value.setHSL(endHSL.h, endHSL.s, endHSL.l);
  }

  private spawnMergeParticles(position: THREE.Vector3, color: THREE.Color): void {
    const count = 200;
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1 + Math.random() * 2;
      
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.5,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      const particleColor = new THREE.Color().setHSL(
        (hsl.h + (Math.random() - 0.5) * 0.3) % 1,
        0.9,
        0.6 + Math.random() * 0.2
      );

      this.particles.push({
        position: position.clone(),
        velocity,
        color: particleColor,
        life: 0.4,
        maxLife: 0.4,
        size: 0.03 + Math.random() * 0.03
      });
    }
  }

  private spawnPopParticles(bubble: Bubble): void {
    const count = 150;
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 3;
      
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.7,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      const hsl = { h: 0, s: 0, l: 0 };
      bubble.color.getHSL(hsl);
      const particleColor = new THREE.Color().setHSL(
        (hsl.h + (Math.random() - 0.5) * 0.2) % 1,
        0.85,
        0.55 + Math.random() * 0.25
      );

      this.particles.push({
        position: bubble.position.clone(),
        velocity,
        color: particleColor,
        life: 1.5,
        maxLife: 1.5,
        size: 0.02 + Math.random() * 0.06
      });
    }
  }

  private updateParticles(delta: number): void {
    const gravity = -4;
    let idx = 0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y += gravity * delta;
      p.velocity.multiplyScalar(0.99);
      p.position.add(p.velocity.clone().multiplyScalar(delta));
    }

    const material = this.particleMesh.material as THREE.PointsMaterial;
    material.opacity = 1;

    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        const alpha = Math.max(0, p.life / p.maxLife);
        
        this.particlePositions[i * 3] = p.position.x;
        this.particlePositions[i * 3 + 1] = p.position.y;
        this.particlePositions[i * 3 + 2] = p.position.z;
        
        this.particleColors[i * 3] = p.color.r * alpha;
        this.particleColors[i * 3 + 1] = p.color.g * alpha;
        this.particleColors[i * 3 + 2] = p.color.b * alpha;
        
        this.particleSizes[i] = p.size;
      } else {
        this.particlePositions[i * 3] = 0;
        this.particlePositions[i * 3 + 1] = -1000;
        this.particlePositions[i * 3 + 2] = 0;
        this.particleColors[i * 3] = 0;
        this.particleColors[i * 3 + 1] = 0;
        this.particleColors[i * 3 + 2] = 0;
        this.particleSizes[i] = 0;
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
  }

  public getWaveRefraction(bubblePos: THREE.Vector3): number {
    const dist = Math.sqrt(bubblePos.x ** 2 + bubblePos.z ** 2);
    if (dist > this.WAVE_RADIUS) return 0;
    
    const waveFactor = 1 - (dist / this.WAVE_RADIUS);
    const wavePhase = Math.sin(this.time * 1.5 + dist * 3) * 0.5 + 0.5;
    return waveFactor * wavePhase * 0.05;
  }

  public update(delta: number, time: number): void {
    this.time = time;

    this.updateWaveTexture(time);

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      const refraction = this.getWaveRefraction(bubble.position);
      bubble.update(delta, time, refraction);

      if (bubble.state === BubbleState.POPPING && bubble.stateTimer < 0.02 && delta > 0) {
        this.spawnPopParticles(bubble);
        if (this.onPopCallback) {
          this.onPopCallback();
        }
      }

      if (bubble.isDead()) {
        this.poolGroup.remove(bubble.mesh);
        bubble.dispose();
        this.bubbles.splice(i, 1);
      }
    }

    this.checkCollisions();
    this.updateParticles(delta);
    this.updateCrystals(time);

    (this.poolMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
  }

  private updateCrystals(time: number): void {
    for (let i = 0; i < this.crystals.length; i++) {
      const crystal = this.crystals[i];
      const float = Math.sin(time * 2 + i * 1.5) * 0.05;
      crystal.mesh.position.y = crystal.baseY + float;
      crystal.mesh.rotation.y = time * 0.5 + i;
      crystal.mesh.rotation.x = time * 0.3 + i * 0.7;
    }
  }

  public getCrystalAtPosition(position: THREE.Vector3): CrystalData | null {
    for (const crystal of this.crystals) {
      const dist = crystal.mesh.position.distanceTo(position);
      if (dist < 0.5) {
        return crystal;
      }
    }
    return null;
  }

  public isPointInPool(x: number, z: number): boolean {
    return Math.sqrt(x * x + z * z) < this.POOL_RADIUS - 0.2;
  }
}
