import * as THREE from 'three';

export interface GalaxyParams {
  count: number;
  radius: number;
  minRadius: number;
  rotationPeriod: number;
}

export class Galaxy {
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;
  public points: THREE.Points;

  private params: GalaxyParams;
  private originalPositions: Float32Array;
  private originalColors: Float32Array;
  private currentPositions: Float32Array;
  private currentColors: Float32Array;
  private sizes: Float32Array;
  private pulsePhases: Float32Array;
  private pulsePeriods: Float32Array;

  private explosionIndices: Map<number, {
    startTime: number;
    direction: THREE.Vector3;
    speed: number;
  }> = new Map();

  private gravityWell: {
    position: THREE.Vector3;
    startTime: number;
    duration: number;
    active: boolean;
  } | null = null;

  private returningIndices: Map<number, {
    startTime: number;
    duration: number;
    fromPosition: THREE.Vector3;
  }> = new Map();

  private galaxyRotation: number = 0;

  constructor(params: GalaxyParams) {
    this.params = params;
    this.geometry = new THREE.BufferGeometry();
    this.originalPositions = new Float32Array(params.count * 3);
    this.originalColors = new Float32Array(params.count * 3);
    this.currentPositions = new Float32Array(params.count * 3);
    this.currentColors = new Float32Array(params.count * 3);
    this.sizes = new Float32Array(params.count);
    this.pulsePhases = new Float32Array(params.count);
    this.pulsePeriods = new Float32Array(params.count);

    this.generateParticles();
    this.setupMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private generateParticles(): void {
    const innerColor = new THREE.Color(0x0066ff);
    const outerColor = new THREE.Color(0xff6600);
    const tmpColor = new THREE.Color();

    const a = 0.3;
    const b = 0.18;

    for (let i = 0; i < this.params.count; i++) {
      const t = Math.pow(Math.random(), 1.5);
      const radius = this.params.minRadius + t * (this.params.radius - this.params.minRadius);

      const theta = radius / a * b + (Math.random() - 0.5) * 0.6;
      const armOffset = Math.floor(Math.random() * 3) * (Math.PI * 2 / 3);
      const angle = theta + armOffset;

      const spread = (1 - t) * 0.8 + 0.1;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * spread;
      const y = (Math.random() - 0.5) * (0.5 + (1 - t) * 1.5);
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * spread;

      const idx = i * 3;
      this.originalPositions[idx] = x;
      this.originalPositions[idx + 1] = y;
      this.originalPositions[idx + 2] = z;
      this.currentPositions[idx] = x;
      this.currentPositions[idx + 1] = y;
      this.currentPositions[idx + 2] = z;

      const colorT = (radius - this.params.minRadius) / (this.params.radius - this.params.minRadius);
      tmpColor.copy(innerColor).lerp(outerColor, colorT);
      this.originalColors[idx] = tmpColor.r;
      this.originalColors[idx + 1] = tmpColor.g;
      this.originalColors[idx + 2] = tmpColor.b;
      this.currentColors[idx] = tmpColor.r;
      this.currentColors[idx + 1] = tmpColor.g;
      this.currentColors[idx + 2] = tmpColor.b;

      this.sizes[i] = 1.0;
      this.pulsePhases[i] = Math.random() * Math.PI * 2;
      this.pulsePeriods[i] = 0.2 + Math.random() * 0.6;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.currentColors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
  }

  private setupMaterial(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    this.material = new THREE.PointsMaterial({
      size: 0.12,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false
    });
  }

  public triggerExplosion(centerIndex: number, currentTime: number): void {
    const cx = this.originalPositions[centerIndex * 3];
    const cy = this.originalPositions[centerIndex * 3 + 1];
    const cz = this.originalPositions[centerIndex * 3 + 2];
    const explosionRadius = 1.5;
    const explosionRadiusSq = explosionRadius * explosionRadius;

    const dir = new THREE.Vector3();

    for (let i = 0; i < this.params.count; i++) {
      const idx = i * 3;
      const dx = this.originalPositions[idx] - cx;
      const dy = this.originalPositions[idx + 1] - cy;
      const dz = this.originalPositions[idx + 2] - cz;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= explosionRadiusSq) {
        dir.set(dx, dy, dz);
        if (distSq < 0.001) {
          dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        } else {
          dir.normalize();
        }
        this.explosionIndices.set(i, {
          startTime: currentTime,
          direction: dir.clone(),
          speed: 1.0 + Math.random() * 2.0
        });
      }
    }
  }

  public setGravityWell(position: THREE.Vector3, currentTime: number, duration: number): void {
    this.gravityWell = {
      position: position.clone(),
      startTime: currentTime,
      duration: duration,
      active: true
    };
  }

  public deactivateGravityWell(currentTime: number): void {
    if (this.gravityWell && this.gravityWell.active) {
      this.gravityWell.active = false;
      const gwPos = this.gravityWell.position;
      const gwRadius = 3.0;
      const gwRadiusSq = gwRadius * gwRadius;

      for (let i = 0; i < this.params.count; i++) {
        const idx = i * 3;
        const px = this.currentPositions[idx];
        const py = this.currentPositions[idx + 1];
        const pz = this.currentPositions[idx + 2];

        const ox = this.originalPositions[idx];
        const oy = this.originalPositions[idx + 1];
        const oz = this.originalPositions[idx + 2];

        const ddx = px - ox;
        const ddy = py - oy;
        const ddz = pz - oz;
        const displaced = ddx * ddx + ddy * ddy + ddz * ddz > 0.001;

        const gdx = px - gwPos.x;
        const gdy = py - gwPos.y;
        const gdz = pz - gwPos.z;
        const inRange = gdx * gdx + gdy * gdy + gdz * gdz <= gwRadiusSq;

        if ((displaced || inRange) && !this.returningIndices.has(i) && !this.explosionIndices.has(i)) {
          this.returningIndices.set(i, {
            startTime: currentTime,
            duration: 1.5,
            fromPosition: new THREE.Vector3(px, py, pz)
          });
        }
      }
    }
  }

  public update(currentTime: number, deltaTime: number): void {
    const rotationSpeed = (Math.PI * 2) / this.params.rotationPeriod;
    this.galaxyRotation += rotationSpeed * deltaTime;

    const cosR = Math.cos(this.galaxyRotation);
    const sinR = Math.sin(this.galaxyRotation);

    const explosionDuration = 1.0;
    const colorTransitionDuration = 0.8;
    const whiteColor = new THREE.Color(0xffffff);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < this.params.count; i++) {
      const idx = i * 3;

      let ox = this.originalPositions[idx];
      let oy = this.originalPositions[idx + 1];
      let oz = this.originalPositions[idx + 2];

      const rx = ox * cosR - oz * sinR;
      const rz = ox * sinR + oz * cosR;
      ox = rx;
      oz = rz;

      let px = ox;
      let py = oy;
      let pz = oz;

      const explosion = this.explosionIndices.get(i);
      if (explosion) {
        const elapsed = currentTime - explosion.startTime;
        if (elapsed >= explosionDuration) {
          this.explosionIndices.delete(i);
          this.returningIndices.set(i, {
            startTime: currentTime,
            duration: 0.3,
            fromPosition: new THREE.Vector3(
              this.currentPositions[idx],
              this.currentPositions[idx + 1],
              this.currentPositions[idx + 2]
            )
          });
        } else {
          const t = elapsed / explosionDuration;
          const ease = 1 - Math.pow(1 - t, 2);
          const distance = explosion.speed * ease;
          px = ox + explosion.direction.x * distance;
          py = oy + explosion.direction.y * distance;
          pz = oz + explosion.direction.z * distance;
        }
      }

      const returning = this.returningIndices.get(i);
      if (returning && !this.explosionIndices.has(i)) {
        const elapsed = currentTime - returning.startTime;
        if (elapsed >= returning.duration) {
          this.returningIndices.delete(i);
          px = ox;
          py = oy;
          pz = oz;
        } else {
          const t = elapsed / returning.duration;
          const ease = t * t * (3 - 2 * t);
          const fp = returning.fromPosition;
          const rox = this.originalPositions[idx];
          const roy = this.originalPositions[idx + 1];
          const roz = this.originalPositions[idx + 2];
          const rx2 = rox * cosR - roz * sinR;
          const rz2 = rox * sinR + roz * cosR;
          px = fp.x + (rx2 - fp.x) * ease;
          py = fp.y + (roy - fp.y) * ease;
          pz = fp.z + (rz2 - fp.z) * ease;
        }
      }

      if (this.gravityWell && this.gravityWell.active && !this.explosionIndices.has(i)) {
        const gw = this.gravityWell;
        const elapsed = currentTime - gw.startTime;
        if (elapsed < gw.duration) {
          const dx = gw.position.x - px;
          const dy = gw.position.y - py;
          const dz = gw.position.z - pz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const gwRadius = 3.0;

          if (dist < gwRadius && dist > 0.01) {
            const falloff = 1 - (dist / gwRadius);
            const speed = 0.5 * falloff * falloff;
            const ndx = dx / dist;
            const ndy = dy / dist;
            const ndz = dz / dist;
            px += ndx * speed;
            py += ndy * speed;
            pz += ndz * speed;

            if (this.returningIndices.has(i)) {
              this.returningIndices.delete(i);
            }
          }
        }
      }

      this.currentPositions[idx] = px;
      this.currentPositions[idx + 1] = py;
      this.currentPositions[idx + 2] = pz;

      const pulsePhase = this.pulsePhases[i] + (currentTime * Math.PI * 2) / this.pulsePeriods[i];
      const pulse = 0.5 + 0.75 * (0.5 + 0.5 * Math.sin(pulsePhase));
      this.sizes[i] = pulse;

      let cr = this.originalColors[idx];
      let cg = this.originalColors[idx + 1];
      let cb = this.originalColors[idx + 2];

      if (explosion) {
        const elapsed = currentTime - explosion.startTime;
        const colorT = Math.min(1, elapsed / colorTransitionDuration);
        tmpColor.setRGB(cr, cg, cb);
        tmpColor.lerpColors(whiteColor, tmpColor, colorT);
        cr = tmpColor.r;
        cg = tmpColor.g;
        cb = tmpColor.b;
      }

      this.currentColors[idx] = cr;
      this.currentColors[idx + 1] = cg;
      this.currentColors[idx + 2] = cb;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;

    this.material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           attribute float size;`
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position);
           gl_PointSize = size * 8.0;`
        );
    };
  }

  public getOriginalPositions(): Float32Array {
    return this.originalPositions;
  }

  public getCurrentPositions(): Float32Array {
    return this.currentPositions;
  }

  public getCount(): number {
    return this.params.count;
  }
}
