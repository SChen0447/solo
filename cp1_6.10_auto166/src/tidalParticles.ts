import * as THREE from 'three';

export type RenderMode = 'sphere' | 'sprite';

export interface TidalParams {
  frequency: number;
  density: number;
  waveSpeed: number;
}

interface ParticleData {
  baseX: number;
  baseZ: number;
  baseY: number;
  phaseOffset: number;
  pulseSpeed: number;
  pulsePhase: number;
  targetY: number;
  rising: boolean;
}

export class TidalParticles {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private meshGroup: THREE.Group;
  private spriteGroup: THREE.Group;
  private particleData: ParticleData[] = [];
  private meshes: THREE.Mesh[] = [];
  private sprites: THREE.Sprite[] = [];
  private params: TidalParams;
  private renderMode: RenderMode = 'sphere';
  private sphereGeometry: THREE.SphereGeometry;
  private spriteTexture: THREE.Texture;
  private colorLow: THREE.Color;
  private colorHigh: THREE.Color;
  private colorStart: THREE.Color;
  private colorEnd: THREE.Color;

  private static readonly SEA_SIZE = 50;
  private static readonly AMPLITUDE = 1.2;
  private static readonly PARTICLE_RADIUS = 0.03;
  private static readonly MIN_SCALE = 0.8;
  private static readonly MAX_SCALE = 1.2;

  constructor(scene: THREE.Scene, params: TidalParams) {
    this.scene = scene;
    this.params = { ...params };

    this.group = new THREE.Group();
    this.meshGroup = new THREE.Group();
    this.spriteGroup = new THREE.Group();
    this.spriteGroup.visible = false;
    this.group.add(this.meshGroup);
    this.group.add(this.spriteGroup);
    this.scene.add(this.group);

    this.sphereGeometry = new THREE.SphereGeometry(TidalParticles.PARTICLE_RADIUS, 8, 8);
    this.spriteTexture = this.createSpriteTexture();

    this.colorLow = new THREE.Color(0x0a4b7a);
    this.colorHigh = new THREE.Color(0x7fdbff);
    this.colorStart = new THREE.Color(0x00d2ff);
    this.colorEnd = new THREE.Color(0x3a7bd5);

    this.createParticles(params.density);
  }

  private createSpriteTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createParticleMaterial(): THREE.MeshPhongMaterial {
    const color = this.colorStart.clone().lerp(this.colorEnd, Math.random());
    return new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9,
      shininess: 100
    });
  }

  private createSpriteMaterial(color: THREE.Color): THREE.SpriteMaterial {
    return new THREE.SpriteMaterial({
      map: this.spriteTexture,
      color: color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private createParticles(count: number): void {
    const halfSize = TidalParticles.SEA_SIZE / 2;

    for (let i = 0; i < count; i++) {
      const baseX = (Math.random() - 0.5) * TidalParticles.SEA_SIZE;
      const baseZ = (Math.random() - 0.5) * TidalParticles.SEA_SIZE;
      const baseY = -TidalParticles.AMPLITUDE - Math.random() * 2;

      const data: ParticleData = {
        baseX,
        baseZ,
        baseY,
        phaseOffset: Math.random() * Math.PI * 2,
        pulseSpeed: 2 * Math.PI / (0.5 + Math.random() * 1.0),
        pulsePhase: Math.random() * Math.PI * 2,
        targetY: 0,
        rising: true
      };
      this.particleData.push(data);

      const color = this.colorStart.clone().lerp(this.colorEnd, Math.random());
      const mesh = new THREE.Mesh(this.sphereGeometry, this.createParticleMaterial());
      mesh.position.set(baseX, baseY, baseZ);
      mesh.userData.baseColor = color.clone();
      this.meshes.push(mesh);
      this.meshGroup.add(mesh);

      const sprite = new THREE.Sprite(this.createSpriteMaterial(color));
      sprite.position.set(baseX, baseY, baseZ);
      sprite.scale.setScalar(TidalParticles.PARTICLE_RADIUS * 4);
      sprite.userData.baseColor = color.clone();
      this.sprites.push(sprite);
      this.spriteGroup.add(sprite);
    }
  }

  private removeParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      const mesh = this.meshes.pop();
      const sprite = this.sprites.pop();
      this.particleData.pop();

      if (mesh) {
        (mesh.material as THREE.Material).dispose();
        this.meshGroup.remove(mesh);
      }
      if (sprite) {
        (sprite.material as THREE.Material).dispose();
        this.spriteGroup.remove(sprite);
      }
    }
  }

  public setDensity(newDensity: number): void {
    const currentCount = this.particleData.length;
    const diff = newDensity - currentCount;

    if (diff > 0) {
      this.createParticles(diff);
    } else if (diff < 0) {
      this.removeParticles(-diff);
    }

    this.params.density = newDensity;
  }

  public setParams(params: Partial<TidalParams>): void {
    if (params.frequency !== undefined) this.params.frequency = params.frequency;
    if (params.waveSpeed !== undefined) this.params.waveSpeed = params.waveSpeed;
    if (params.density !== undefined) this.setDensity(params.density);
  }

  public setRenderMode(mode: RenderMode): void {
    if (mode === this.renderMode) return;
    this.renderMode = mode;
    this.meshGroup.visible = mode === 'sphere';
    this.spriteGroup.visible = mode === 'sprite';
  }

  public getRenderMode(): RenderMode {
    return this.renderMode;
  }

  public update(elapsedTime: number, deltaTime: number): void {
    const freq = this.params.frequency;
    const speed = this.params.waveSpeed;
    const omega = (2 * Math.PI) / freq;
    const k = speed * 0.3;

    for (let i = 0; i < this.particleData.length; i++) {
      const data = this.particleData[i];
      const mesh = this.meshes[i];
      const sprite = this.sprites[i];

      if (data.rising) {
        const tideY = TidalParticles.AMPLITUDE * Math.sin(
          omega * elapsedTime + k * data.baseX + k * data.baseZ + data.phaseOffset
        );
        if (data.baseY < tideY) {
          data.baseY += deltaTime * 0.8;
          if (data.baseY >= tideY) {
            data.baseY = tideY;
            data.rising = false;
          }
        } else {
          data.rising = false;
        }
      } else {
        data.baseY = TidalParticles.AMPLITUDE * Math.sin(
          omega * elapsedTime + k * data.baseX + k * data.baseZ + data.phaseOffset
        );
      }

      const normalizedY = (data.baseY + TidalParticles.AMPLITUDE) / (2 * TidalParticles.AMPLITUDE);
      const waveColor = this.colorLow.clone().lerp(this.colorHigh, normalizedY);

      data.pulsePhase += data.pulseSpeed * deltaTime;
      const pulse = (TidalParticles.MIN_SCALE + TidalParticles.MAX_SCALE) / 2 +
        (TidalParticles.MAX_SCALE - TidalParticles.MIN_SCALE) / 2 * Math.sin(data.pulsePhase);

      if (mesh) {
        mesh.position.set(data.baseX, data.baseY, data.baseZ);
        mesh.scale.setScalar(pulse);
        const mat = mesh.material as THREE.MeshPhongMaterial;
        mat.color.copy(waveColor);
        mat.emissive.copy(waveColor);
      }

      if (sprite) {
        sprite.position.set(data.baseX, data.baseY, data.baseZ);
        sprite.scale.setScalar(TidalParticles.PARTICLE_RADIUS * 4 * pulse);
        const mat = sprite.material as THREE.SpriteMaterial;
        mat.color.copy(waveColor);
      }
    }
  }

  public getCount(): number {
    return this.particleData.length;
  }

  public dispose(): void {
    for (const mesh of this.meshes) {
      (mesh.material as THREE.Material).dispose();
    }
    for (const sprite of this.sprites) {
      (sprite.material as THREE.Material).dispose();
    }
    this.sphereGeometry.dispose();
    this.spriteTexture.dispose();
    this.scene.remove(this.group);
  }
}

export class OceanSurface {
  private scene: THREE.Scene;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshPhongMaterial;
  private mesh: THREE.Mesh;
  private gridSize: number;
  private basePositions: Float32Array;
  private colorLow: THREE.Color;
  private colorHigh: THREE.Color;

  constructor(scene: THREE.Scene, gridSize: number = 100) {
    this.scene = scene;
    this.gridSize = gridSize;
    this.colorLow = new THREE.Color(0x001f3f);
    this.colorHigh = new THREE.Color(0x0a3d62);
    this.geometry = this.createGeometry();
    this.material = this.createMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0;
    this.basePositions = new Float32Array(this.geometry.attributes.position.array);
    this.scene.add(this.mesh);
  }

  private createGeometry(): THREE.PlaneGeometry {
    const size = 50;
    const geo = new THREE.PlaneGeometry(size, size, this.gridSize, this.gridSize);
    const colors = new Float32Array(geo.attributes.position.count * 3);

    for (let i = 0; i < geo.attributes.position.count; i++) {
      const y = (geo.attributes.position.getY(i) + size / 2) / size;
      const color = this.colorLow.clone().lerp(this.colorHigh, y);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }

  private createMaterial(): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      shininess: 30,
      specular: new THREE.Color(0x0a3d62),
      depthWrite: false
    });
  }

  public setGridSize(newSize: number): void {
    if (newSize === this.gridSize) return;
    this.gridSize = newSize;
    const oldGeo = this.geometry;
    this.geometry = this.createGeometry();
    this.mesh.geometry = this.geometry;
    this.basePositions = new Float32Array(this.geometry.attributes.position.array);
    oldGeo.dispose();
  }

  public update(elapsedTime: number, waveSpeed: number, frequency: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const omega = (2 * Math.PI) / frequency;
    const k = waveSpeed * 0.3;

    for (let i = 0; i < this.basePositions.length / 3; i++) {
      const idx = i * 3;
      const x = this.basePositions[idx];
      const z = this.basePositions[idx + 1];
      const wave = 0.3 * Math.sin(omega * elapsedTime + k * x + k * z);
      positions[idx + 2] = wave;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}
