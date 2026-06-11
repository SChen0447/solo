import * as THREE from 'three';
import { TerrainData, getHeightAt } from './terrain.js';

export interface FireParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

export interface BurnCell {
  burning: boolean;
  burnTime: number;
  maxBurnTime: number;
  intensity: number;
}

export class FireSystem {
  private terrainData: TerrainData;
  private gridSize: number;
  private cellSize: number;
  private gridCols: number;
  private gridRows: number;
  private burnGrid: (BurnCell | null)[][];
  private fireFront: Set<string>;
  private particles: FireParticle[];
  private maxParticles: number = 3000;
  private particlePool: FireParticle[];
  
  public windAngle: number = 0;
  public windSpeed: number = 1.0;
  public spreadRate: number = 0.8;
  
  public burnOverlayMesh!: THREE.Mesh;
  public burnOverlayCanvas!: HTMLCanvasElement;
  public burnOverlayCtx!: CanvasRenderingContext2D;
  public burnOverlayTexture!: THREE.CanvasTexture;

  private fireParticleGeometry!: THREE.BufferGeometry;
  private fireParticleMaterial!: THREE.ShaderMaterial;
  public fireParticlePoints!: THREE.Points;

  private particlePositions: Float32Array;
  private particleColors: Float32Array;
  private particleSizes: Float32Array;
  private particleAlphas: Float32Array;

  private lastUpdateTime: number = 0;
  private lastSpreadTime: number = 0;

  constructor(terrainData: TerrainData, cellSize: number = 4) {
    this.terrainData = terrainData;
    this.gridSize = terrainData.size;
    this.cellSize = cellSize;
    this.gridCols = Math.ceil(this.gridSize / this.cellSize);
    this.gridRows = Math.ceil(this.gridSize / this.cellSize);
    
    this.burnGrid = [];
    for (let i = 0; i < this.gridRows; i++) {
      this.burnGrid[i] = [];
      for (let j = 0; j < this.gridCols; j++) {
        this.burnGrid[i][j] = null;
      }
    }
    
    this.fireFront = new Set();
    this.particles = [];
    this.particlePool = [];

    const maxP = this.maxParticles;
    this.particlePositions = new Float32Array(maxP * 3);
    this.particleColors = new Float32Array(maxP * 3);
    this.particleSizes = new Float32Array(maxP);
    this.particleAlphas = new Float32Array(maxP);

    this.initBurnOverlay();
    this.initFireParticles();
  }

  private initBurnOverlay() {
    const texSize = 256;
    this.burnOverlayCanvas = document.createElement('canvas');
    this.burnOverlayCanvas.width = texSize;
    this.burnOverlayCanvas.height = texSize;
    this.burnOverlayCtx = this.burnOverlayCanvas.getContext('2d')!;
    this.burnOverlayCtx.clearRect(0, 0, texSize, texSize);
    
    this.burnOverlayTexture = new THREE.CanvasTexture(this.burnOverlayCanvas);
    this.burnOverlayTexture.needsUpdate = true;

    const geo = new THREE.PlaneGeometry(this.gridSize, this.gridSize, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      map: this.burnOverlayTexture,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      depthTest: true
    });
    this.burnOverlayMesh = new THREE.Mesh(geo, mat);
    this.burnOverlayMesh.position.y = 0.3;
    this.burnOverlayMesh.renderOrder = 10;
    this.burnOverlayMesh.frustumCulled = false;
    this.burnOverlayMesh.castShadow = false;
    this.burnOverlayMesh.receiveShadow = false;
  }

  private initFireParticles() {
    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;
      this.particlePositions[i3] = 0;
      this.particlePositions[i3 + 1] = -10000;
      this.particlePositions[i3 + 2] = 0;
      this.particleColors[i3] = 0;
      this.particleColors[i3 + 1] = 0;
      this.particleColors[i3 + 2] = 0;
      this.particleSizes[i] = 0;
      this.particleAlphas[i] = 0;
    }
    this.fireParticleGeometry = new THREE.BufferGeometry();
    this.fireParticleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.fireParticleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    this.fireParticleGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.particleSizes, 1));
    this.fireParticleGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.particleAlphas, 1));
    this.fireParticleGeometry.setDrawRange(0, 1);
    this.fireParticleGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1000);

    this.fireParticleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: window.devicePixelRatio || 1 }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, glow * vAlpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.fireParticlePoints = new THREE.Points(this.fireParticleGeometry, this.fireParticleMaterial);
    this.fireParticlePoints.renderOrder = 11;
    this.fireParticlePoints.frustumCulled = false;
    this.fireParticlePoints.castShadow = false;
    this.fireParticlePoints.receiveShadow = false;
  }

  public worldToGrid(x: number, z: number): { col: number; row: number } {
    const half = this.gridSize / 2;
    const col = Math.floor((x + half) / this.cellSize);
    const row = Math.floor((z + half) / this.cellSize);
    return {
      col: Math.max(0, Math.min(this.gridCols - 1, col)),
      row: Math.max(0, Math.min(this.gridRows - 1, row))
    };
  }

  public gridToWorld(col: number, row: number): { x: number; z: number } {
    const half = this.gridSize / 2;
    return {
      x: -half + col * this.cellSize + this.cellSize / 2,
      z: -half + row * this.cellSize + this.cellSize / 2
    };
  }

  public ignite(worldX: number, worldZ: number, radius: number = 2) {
    const { col, row } = this.worldToGrid(worldX, worldZ);
    const cellRadius = Math.ceil(radius / this.cellSize);
    for (let di = -cellRadius; di <= cellRadius; di++) {
      for (let dj = -cellRadius; dj <= cellRadius; dj++) {
        const dist = Math.sqrt(di * di + dj * dj);
        if (dist <= cellRadius) {
          const r = row + di;
          const c = col + dj;
          if (r >= 0 && r < this.gridRows && c >= 0 && c < this.gridCols) {
            this.startBurning(r, c);
          }
        }
      }
    }
  }

  private startBurning(row: number, col: number) {
    if (this.burnGrid[row][col]?.burning) return;
    this.burnGrid[row][col] = {
      burning: true,
      burnTime: 0,
      maxBurnTime: 8 + Math.random() * 6,
      intensity: 0.6 + Math.random() * 0.4
    };
    this.fireFront.add(`${row},${col}`);
  }

  public update(delta: number, elapsed: number) {
    this.updateBurning(delta);
    
    if (elapsed - this.lastSpreadTime >= 0.5) {
      this.lastSpreadTime = elapsed;
      this.spreadFire();
    }

    this.updateParticles(delta);
    this.updateBurnOverlay();
    this.updateParticleGeometry();
  }

  private updateBurning(delta: number) {
    const toRemove: string[] = [];
    for (const key of this.fireFront) {
      const [rowStr, colStr] = key.split(',');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      const cell = this.burnGrid[row][col];
      if (!cell || !cell.burning) {
        toRemove.push(key);
        continue;
      }
      cell.burnTime += delta;
      if (cell.burnTime >= cell.maxBurnTime) {
        cell.burning = false;
        cell.intensity = 0;
        toRemove.push(key);
      } else {
        const lifeRatio = cell.burnTime / cell.maxBurnTime;
        cell.intensity = Math.sin(lifeRatio * Math.PI) * (0.5 + Math.random() * 0.5);
      }
    }
    for (const key of toRemove) {
      this.fireFront.delete(key);
    }
  }

  private spreadFire() {
    const windDirX = Math.cos(this.windAngle);
    const windDirZ = Math.sin(this.windAngle);
    const toIgnite: { row: number; col: number }[] = [];
    
    for (const key of this.fireFront) {
      const [rowStr, colStr] = key.split(',');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      const cell = this.burnGrid[row][col];
      if (!cell || !cell.burning) continue;
      
      const neighbors = [
        { dr: -1, dc: 0, weight: 1.0 },
        { dr: 1, dc: 0, weight: 1.0 },
        { dr: 0, dc: -1, weight: 1.0 },
        { dr: 0, dc: 1, weight: 1.0 },
        { dr: -1, dc: -1, weight: 0.707 },
        { dr: -1, dc: 1, weight: 0.707 },
        { dr: 1, dc: -1, weight: 0.707 },
        { dr: 1, dc: 1, weight: 0.707 }
      ];
      
      for (const n of neighbors) {
        const nr = row + n.dr;
        const nc = col + n.dc;
        if (nr < 0 || nr >= this.gridRows || nc < 0 || nc >= this.gridCols) continue;
        if (this.burnGrid[nr][nc]?.burning || this.burnGrid[nr][nc]?.burnTime > 0) continue;
        
        const ndx = n.dc;
        const ndz = n.dr;
        const windDot = (windDirX * ndx + windDirZ * ndz);
        const windFactor = 1 + windDot * this.windSpeed * 1.5;
        const baseProb = this.spreadRate * cell.intensity * 0.12;
        const prob = baseProb * windFactor / n.weight;
        
        if (Math.random() < prob) {
          toIgnite.push({ row: nr, col: nc });
        }
      }
    }
    
    for (const pos of toIgnite) {
      this.startBurning(pos.row, pos.col);
    }
  }

  private spawnParticles(delta: number) {
    const spawnRate = 200;
    const toSpawn = Math.floor(spawnRate * delta);
    let spawned = 0;
    
    for (const key of this.fireFront) {
      if (spawned >= toSpawn) break;
      const [rowStr, colStr] = key.split(',');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      const cell = this.burnGrid[row][col];
      if (!cell || !cell.burning) continue;
      
      const count = Math.max(1, Math.floor(cell.intensity * 3));
      for (let i = 0; i < count && spawned < toSpawn; i++) {
        const { x, z } = this.gridToWorld(col, row);
        const y = getHeightAt(x, z, this.terrainData);
        let p = this.particlePool.pop();
        if (!p) {
          if (this.particles.length >= this.maxParticles) break;
          p = {
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            life: 0,
            maxLife: 0,
            size: 0
          };
          this.particles.push(p);
        }
        p.position.set(
          x + (Math.random() - 0.5) * this.cellSize,
          y + Math.random() * 1.5,
          z + (Math.random() - 0.5) * this.cellSize
        );
        const windX = Math.cos(this.windAngle) * this.windSpeed * 2;
        const windZ = Math.sin(this.windAngle) * this.windSpeed * 2;
        p.velocity.set(
          windX + (Math.random() - 0.5) * 1.5,
          4 + Math.random() * 3,
          windZ + (Math.random() - 0.5) * 1.5
        );
        p.maxLife = 1.2 + Math.random() * 1.0;
        p.life = p.maxLife;
        p.size = 2 + Math.random() * 6;
        spawned++;
      }
    }
  }

  private updateParticles(delta: number) {
    this.spawnParticles(delta);
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particlePool.push(p);
        this.particles.splice(i, 1);
        continue;
      }
      p.position.x += p.velocity.x * delta;
      p.position.y += p.velocity.y * delta;
      p.position.z += p.velocity.z * delta;
      p.velocity.y += 2.0 * delta;
      p.velocity.x *= 0.98;
      p.velocity.z *= 0.98;
    }
  }

  private updateParticleGeometry() {
    const count = Math.min(this.particles.length, this.maxParticles);
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const i3 = i * 3;
      this.particlePositions[i3] = p.position.x;
      this.particlePositions[i3 + 1] = p.position.y;
      this.particlePositions[i3 + 2] = p.position.z;
      
      const lifeRatio = p.life / p.maxLife;
      const t = 1 - lifeRatio;
      if (t < 0.5) {
        const lt = t / 0.5;
        this.particleColors[i3] = 1.0;
        this.particleColors[i3 + 1] = 1.0 - lt * 0.3;
        this.particleColors[i3 + 2] = (1 - lt) * 0.5;
      } else {
        const lt = (t - 0.5) / 0.5;
        this.particleColors[i3] = 1.0 - lt * 0.3;
        this.particleColors[i3 + 1] = 0.4 - lt * 0.35;
        this.particleColors[i3 + 2] = 0.05;
      }
      
      this.particleSizes[i] = p.size * (0.5 + lifeRatio * 0.8);
      this.particleAlphas[i] = Math.min(1, lifeRatio * 1.5);
    }
    for (let i = count; i < Math.max(count + 1, 2); i++) {
      const i3 = i * 3;
      this.particlePositions[i3] = 0;
      this.particlePositions[i3 + 1] = -10000;
      this.particlePositions[i3 + 2] = 0;
      this.particleSizes[i] = 0;
      this.particleAlphas[i] = 0;
    }
    
    this.fireParticleGeometry.attributes.position.needsUpdate = true;
    this.fireParticleGeometry.attributes.color.needsUpdate = true;
    (this.fireParticleGeometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.fireParticleGeometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    this.fireParticleGeometry.setDrawRange(0, Math.max(1, count));
  }

  private updateBurnOverlay() {
    const ctx = this.burnOverlayCtx;
    const texSize = this.burnOverlayCanvas.width;
    ctx.clearRect(0, 0, texSize, texSize);
    
    const cellPx = texSize / this.gridCols;
    
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const cell = this.burnGrid[r][c];
        if (!cell) continue;
        
        const x = c * cellPx;
        const y = r * cellPx;
        
        if (cell.burning) {
          const intensity = cell.intensity;
          const lifeRatio = cell.burnTime / cell.maxBurnTime;
          const alpha = Math.max(0.4, intensity * 0.9);
          const rVal = Math.floor(200 + 55 * intensity);
          const gVal = Math.floor(30 + 80 * (1 - lifeRatio));
          ctx.fillStyle = `rgba(${rVal},${gVal},20,${alpha})`;
          ctx.fillRect(x, y, cellPx + 1, cellPx + 1);
        } else if (cell.burnTime > 0) {
          ctx.fillStyle = `rgba(60,40,30,0.6)`;
          ctx.fillRect(x, y, cellPx + 1, cellPx + 1);
        }
      }
    }
    
    ctx.strokeStyle = 'rgba(255, 80, 0, 0.9)';
    ctx.lineWidth = 2;
    for (const key of this.fireFront) {
      const [rowStr, colStr] = key.split(',');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      const cell = this.burnGrid[row][col];
      if (!cell || !cell.burning) continue;
      const x = col * cellPx;
      const y = row * cellPx;
      ctx.strokeRect(x + 1, y + 1, cellPx - 2, cellPx - 2);
    }
    
    this.burnOverlayTexture.needsUpdate = true;
  }

  public getBurnCell(row: number, col: number): BurnCell | null {
    if (row < 0 || row >= this.gridRows || col < 0 || col >= this.gridCols) return null;
    return this.burnGrid[row][col];
  }

  public getAllBurningPositions(): { x: number; z: number }[] {
    const result: { x: number; z: number }[] = [];
    for (const key of this.fireFront) {
      const [rowStr, colStr] = key.split(',');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      const { x, z } = this.gridToWorld(col, row);
      result.push({ x, z });
    }
    return result;
  }

  public getGridInfo() {
    return {
      cols: this.gridCols,
      rows: this.gridRows,
      cellSize: this.cellSize,
      size: this.gridSize
    };
  }

  public isBurning(col: number, row: number): boolean {
    return !!this.burnGrid[row]?.[col]?.burning;
  }

  public reset() {
    for (let i = 0; i < this.gridRows; i++) {
      for (let j = 0; j < this.gridCols; j++) {
        this.burnGrid[i][j] = null;
      }
    }
    this.fireFront.clear();
    this.particles.length = 0;
    this.particlePool.length = 0;
    this.lastSpreadTime = 0;
    this.burnOverlayCtx.clearRect(0, 0, this.burnOverlayCanvas.width, this.burnOverlayCanvas.height);
    this.burnOverlayTexture.needsUpdate = true;
    this.updateParticleGeometry();
  }
}
