import * as THREE from 'three';

export interface EnvironmentParams {
  temperature: number;
  humidity: number;
  moonPhase: number;
}

interface FireflyData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  basePosition: THREE.Vector3;
  glowPhase: number;
  glowFrequency: number;
  baseGlowFrequency: number;
  speed: number;
  spiralRadius: number;
  spiralPhase: number;
  driftOffset: THREE.Vector3;
  driftSpeed: THREE.Vector3;
  trail: THREE.Vector3[];
  targetOffset: THREE.Vector3;
}

export class FireflySystem {
  public group: THREE.Group;
  private fireflies: FireflyData[] = [];
  private count: number;
  private areaSize: number;
  private points!: THREE.Points;
  private glowSprites: THREE.Sprite[] = [];
  private trailLines: THREE.Line[] = [];

  constructor(count: number = 400, areaSize: number = 40) {
    this.count = count;
    this.areaSize = areaSize;
    this.group = new THREE.Group();
    this.initFireflies();
  }

  private createGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 230, 100, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initFireflies(): void {
    const glowTexture = this.createGlowTexture();

    for (let i = 0; i < this.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * (this.areaSize - 10);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 1 + Math.random() * 8;

      const basePosition = new THREE.Vector3(x, y, z);
      const position = basePosition.clone();

      const firefly: FireflyData = {
        position,
        velocity: new THREE.Vector3(),
        basePosition,
        glowPhase: Math.random() * Math.PI * 2,
        glowFrequency: 1.5 + Math.random() * 1.5,
        baseGlowFrequency: 1.5 + Math.random() * 1.5,
        speed: 0.3 + Math.random() * 0.5,
        spiralRadius: 0.5 + Math.random() * 1.5,
        spiralPhase: Math.random() * Math.PI * 2,
        driftOffset: new THREE.Vector3(
          Math.random() * 1000,
          Math.random() * 1000,
          Math.random() * 1000
        ),
        driftSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.5
        ),
        trail: [],
        targetOffset: new THREE.Vector3()
      };

      for (let j = 0; j < 5; j++) {
        firefly.trail.push(position.clone());
      }

      this.fireflies.push(firefly);

      const spriteMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffe066,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.5, 0.5, 0.5);
      sprite.position.copy(position);
      this.glowSprites.push(sprite);
      this.group.add(sprite);

      const trailGeometry = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(5 * 3);
      const trailColors = new Float32Array(5 * 3);
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

      const trailMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const trailLine = new THREE.Line(trailGeometry, trailMaterial);
      this.trailLines.push(trailLine);
      this.group.add(trailLine);
    }

    this.points = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        color: 0xffffaa,
        size: 0.15,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      })
    );

    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const pos = this.fireflies[i].position;
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 0.7;
    }

    this.points.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.points.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.group.add(this.points);
  }

  private noise3(x: number, y: number, z: number): number {
    const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
    
    const perm = new Array(512);
    for (let i = 0; i < 256; i++) {
      perm[i] = p[i];
      perm[i + 256] = p[i];
    }

    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;

    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(perm[AA], x, y, z), this.grad(perm[BA], x - 1, y, z)),
        this.lerp(u, this.grad(perm[AB], x, y - 1, z), this.grad(perm[BB], x - 1, y - 1, z))
      ),
      this.lerp(v,
        this.lerp(u, this.grad(perm[AA + 1], x, y, z - 1), this.grad(perm[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(perm[AB + 1], x, y - 1, z - 1), this.grad(perm[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public update(delta: number, params: EnvironmentParams): void {
    const { temperature, humidity, moonPhase } = params;

    const tempFactor = (temperature - 15) / 20;
    const glowFrequencyMultiplier = 1 + tempFactor * 2;
    const baseBrightness = 0.6 + tempFactor * 0.4;
    const moonBrightnessFactor = 1 - moonPhase * 0.7;

    const humidityFactor = 1 - (humidity - 20) / 60;
    const clusterMultiplier = 0.4 + humidityFactor * 0.6;
    const speedMultiplier = 0.8 + tempFactor * 0.4;

    const positions = this.points.geometry.attributes.position.array as Float32Array;
    const colors = this.points.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < this.count; i++) {
      const f = this.fireflies[i];

      f.glowPhase += (delta * Math.PI * 2) / (f.baseGlowFrequency / glowFrequencyMultiplier);
      const glowIntensity = (Math.sin(f.glowPhase) * 0.5 + 0.5) * baseBrightness * moonBrightnessFactor;
      const displayIntensity = Math.max(glowIntensity, 0.3 * moonBrightnessFactor);

      f.spiralPhase += delta * f.speed * 0.5;
      const spiralX = Math.cos(f.spiralPhase) * f.spiralRadius;
      const spiralZ = Math.sin(f.spiralPhase) * f.spiralRadius;
      const spiralY = Math.sin(f.spiralPhase * 0.7) * f.spiralRadius * 0.5;

      f.driftOffset.add(f.driftSpeed.clone().multiplyScalar(delta * 0.1));
      const noiseX = this.noise3(f.driftOffset.x, f.driftOffset.y, f.driftOffset.z) * 0.3;
      const noiseY = this.noise3(f.driftOffset.x + 100, f.driftOffset.y + 100, f.driftOffset.z + 100) * 0.2;
      const noiseZ = this.noise3(f.driftOffset.x + 200, f.driftOffset.y + 200, f.driftOffset.z + 200) * 0.3;

      const targetX = f.basePosition.x + (spiralX + noiseX * 3) * clusterMultiplier;
      const targetY = f.basePosition.y + (spiralY + noiseY * 2) * clusterMultiplier;
      const targetZ = f.basePosition.z + (spiralZ + noiseZ * 3) * clusterMultiplier;

      let avoidX = 0, avoidY = 0, avoidZ = 0;
      let avoidCount = 0;

      for (let j = 0; j < this.count; j++) {
        if (i !== j) {
          const other = this.fireflies[j];
          const dx = f.position.x - other.position.x;
          const dy = f.position.y - other.position.y;
          const dz = f.position.z - other.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 0.5 && dist > 0) {
            const force = (0.5 - dist) / 0.5;
            avoidX += (dx / dist) * force;
            avoidY += (dy / dist) * force;
            avoidZ += (dz / dist) * force;
            avoidCount++;
          }
        }
      }

      if (avoidCount > 0) {
        avoidX /= avoidCount;
        avoidY /= avoidCount;
        avoidZ /= avoidCount;
      }

      const finalTargetX = targetX + avoidX * 2;
      const finalTargetY = targetY + avoidY * 2;
      const finalTargetZ = targetZ + avoidZ * 2;

      const moveSpeed = f.speed * speedMultiplier * delta;
      f.velocity.set(
        (finalTargetX - f.position.x) * moveSpeed,
        (finalTargetY - f.position.y) * moveSpeed,
        (finalTargetZ - f.position.z) * moveSpeed
      );

      f.position.add(f.velocity);

      f.position.x = Math.max(-this.areaSize + 5, Math.min(this.areaSize - 5, f.position.x));
      f.position.y = Math.max(0.5, Math.min(12, f.position.y));
      f.position.z = Math.max(-this.areaSize + 5, Math.min(this.areaSize - 5, f.position.z));

      for (let t = 0; t < f.trail.length - 1; t++) {
        f.trail[t].copy(f.trail[t + 1]);
      }
      f.trail[f.trail.length - 1].copy(f.position);

      positions[i * 3] = f.position.x;
      positions[i * 3 + 1] = f.position.y;
      positions[i * 3 + 2] = f.position.z;

      const colorIntensity = Math.min(displayIntensity, 1);
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.95 + colorIntensity * 0.05;
      colors[i * 3 + 2] = 0.6 + colorIntensity * 0.1;

      this.glowSprites[i].position.copy(f.position);
      const glowScale = 0.3 + displayIntensity * 0.5;
      this.glowSprites[i].scale.set(glowScale, glowScale, glowScale);
      (this.glowSprites[i].material as THREE.SpriteMaterial).opacity = 0.5 + displayIntensity * 0.5;

      const trailGeometry = this.trailLines[i].geometry;
      const trailPositions = trailGeometry.attributes.position.array as Float32Array;
      const trailColors = trailGeometry.attributes.color.array as Float32Array;

      for (let t = 0; t < f.trail.length; t++) {
        trailPositions[t * 3] = f.trail[t].x;
        trailPositions[t * 3 + 1] = f.trail[t].y;
        trailPositions[t * 3 + 2] = f.trail[t].z;

        const trailAlpha = t / f.trail.length;
        trailColors[t * 3] = 1 * trailAlpha * displayIntensity;
        trailColors[t * 3 + 1] = 0.9 * trailAlpha * displayIntensity;
        trailColors[t * 3 + 2] = 0.5 * trailAlpha * displayIntensity;
      }

      trailGeometry.attributes.position.needsUpdate = true;
      trailGeometry.attributes.color.needsUpdate = true;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  public getBoundingBox(): THREE.Box3 {
    return new THREE.Box3(
      new THREE.Vector3(-this.areaSize, 0, -this.areaSize),
      new THREE.Vector3(this.areaSize, 15, this.areaSize)
    );
  }
}
