import * as THREE from 'three';

const FIREFLY_COLORS = [
  new THREE.Color('#fff44f'),
  new THREE.Color('#aaff55'),
  new THREE.Color('#55aaff'),
  new THREE.Color('#ffaa55'),
  new THREE.Color('#ff55aa'),
  new THREE.Color('#cc55ff'),
];

interface Firefly {
  position: THREE.Vector3;
  color: THREE.Color;
  size: number;
  baseSpeed: number;
  speed: number;
  flickerPhase: number;
  flickerFrequency: number;
  brightness: number;
  bezierStart: THREE.Vector3;
  bezierCtrl1: THREE.Vector3;
  bezierCtrl2: THREE.Vector3;
  bezierEnd: THREE.Vector3;
  bezierProgress: number;
  bezierDuration: number;
  nextCtrlRefresh: number;
}

interface Stats {
  totalCount: number;
  averageSpeed: number;
  activeCount: number;
}

export class FireflyManager {
  private scene: THREE.Scene;
  private fireflies: Firefly[] = [];
  private totalFireflies: number = 200;
  private visibleCount: number = 200;
  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.ShaderMaterial;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private brightness!: Float32Array;
  private windSpeed: number = 1;
  private degraded: boolean = false;
  private fpsHistory: number[] = [];
  private lastFrameTime: number = performance.now();
  private _baseGlowSize: number = 3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createFireflies();
    this.createPoints();
  }

  private createFireflies(): void {
    for (let i = 0; i < this.totalFireflies; i++) {
      this.fireflies.push(this.createSingleFirefly());
    }
  }

  private createSingleFirefly(): Firefly {
    const colorIdx = Math.floor(Math.random() * FIREFLY_COLORS.length);
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 16,
      Math.random() * 8 + 1,
      (Math.random() - 0.5) * 16
    );
    const baseSpeed = 0.5 + Math.random() * 1.0;

    const start = position.clone();
    const ctrl1 = this.randomNear(position, 10);
    const ctrl2 = this.randomNear(position, 10);
    const end = this.randomNear(position, 10);

    return {
      position,
      color: FIREFLY_COLORS[colorIdx].clone(),
      size: 1 + Math.random() * 2,
      baseSpeed,
      speed: baseSpeed,
      flickerPhase: Math.random() * Math.PI * 2,
      flickerFrequency: 0.3 + Math.random() * 0.5,
      brightness: 0.1 + Math.random() * 0.9,
      bezierStart: start,
      bezierCtrl1: ctrl1,
      bezierCtrl2: ctrl2,
      bezierEnd: end,
      bezierProgress: 0,
      bezierDuration: 3 + Math.random() * 2,
      nextCtrlRefresh: 3 + Math.random() * 2,
    };
  }

  private randomNear(center: THREE.Vector3, radius: number): THREE.Vector3 {
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize();
    const r = Math.random() * radius;
    return center.clone().add(dir.multiplyScalar(r));
  }

  private createPoints(): void {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.totalFireflies * 3);
    this.colors = new Float32Array(this.totalFireflies * 3);
    this.sizes = new Float32Array(this.totalFireflies);
    this.brightness = new Float32Array(this.totalFireflies);

    for (let i = 0; i < this.totalFireflies; i++) {
      const ff = this.fireflies[i];
      this.positions[i * 3] = ff.position.x;
      this.positions[i * 3 + 1] = ff.position.y;
      this.positions[i * 3 + 2] = ff.position.z;
      this.colors[i * 3] = ff.color.r;
      this.colors[i * 3 + 1] = ff.color.g;
      this.colors[i * 3 + 2] = ff.color.b;
      this.sizes[i] = ff.size;
      this.brightness[i] = ff.brightness;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aBrightness', new THREE.BufferAttribute(this.brightness, 1));

    const vertexShader = `
      attribute float aSize;
      attribute float aBrightness;
      varying vec3 vColor;
      varying float vBrightness;
      void main() {
        vColor = color;
        vBrightness = aBrightness;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vBrightness;
      uniform float uGlowSize;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        float glow = smoothstep(0.5, 0.0, dist);
        float outerGlow = smoothstep(uGlowSize * 0.5, 0.0, dist) * 0.5;
        float alpha = (glow + outerGlow) * vBrightness;
        vec3 finalColor = vColor * (vBrightness * 0.7 + 0.3);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uGlowSize: { value: this._baseGlowSize },
      },
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  public setWindSpeed(speed: number): void {
    this.windSpeed = speed;
  }

  public setBrightness(brightness: number): void {
    const t = 1 - brightness / 100;
    this._baseGlowSize = 3 + t * 3;
    if (this.material) {
      this.material.uniforms.uGlowSize.value = this._baseGlowSize;
    }
  }

  private cubicBezier(
    t: number,
    p0: THREE.Vector3,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3
  ): THREE.Vector3 {
    const oneMinusT = 1 - t;
    const oneMinusT2 = oneMinusT * oneMinusT;
    const oneMinusT3 = oneMinusT2 * oneMinusT;
    const t2 = t * t;
    const t3 = t2 * t;

    return new THREE.Vector3(
      oneMinusT3 * p0.x + 3 * oneMinusT2 * t * p1.x + 3 * oneMinusT * t2 * p2.x + t3 * p3.x,
      oneMinusT3 * p0.y + 3 * oneMinusT2 * t * p1.y + 3 * oneMinusT * t2 * p2.y + t3 * p3.y,
      oneMinusT3 * p0.z + 3 * oneMinusT2 * t * p1.z + 3 * oneMinusT * t2 * p2.z + t3 * p3.z
    );
  }

  private regenerateBezier(ff: Firefly): void {
    ff.bezierStart.copy(ff.position);
    const windOffset = this.windSpeed * 0.5;

    ff.bezierCtrl1.copy(this.randomNear(ff.position, 10));
    ff.bezierCtrl1.x += windOffset + (Math.random() - 0.5) * 2;

    ff.bezierCtrl2.copy(this.randomNear(ff.position, 10));
    ff.bezierCtrl2.x += windOffset + (Math.random() - 0.5) * 2;

    ff.bezierEnd.copy(this.randomNear(ff.position, 10));
    ff.bezierEnd.x += windOffset * 1.5;

    ff.bezierEnd.x = Math.max(-15, Math.min(15, ff.bezierEnd.x));
    ff.bezierEnd.y = Math.max(0.5, Math.min(12, ff.bezierEnd.y));
    ff.bezierEnd.z = Math.max(-15, Math.min(15, ff.bezierEnd.z));

    ff.bezierProgress = 0;
    ff.bezierDuration = 3 + Math.random() * 2;
    ff.nextCtrlRefresh = ff.bezierDuration;
  }

  private applyAttraction(dt: number): void {
    const count = this.visibleCount;
    const forces: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      forces.push(new THREE.Vector3());
    }

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = this.fireflies[i];
        const b = this.fireflies[j];
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dz = b.position.z - a.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist < 5 && dist > 0.01) {
          const invDist = 1 / dist;
          const nx = dx * invDist;
          const ny = dy * invDist;
          const nz = dz * invDist;

          let strength: number;
          if (dist < 2) {
            strength = -(2 - dist) * 2.0;
          } else {
            strength = (5 - dist) * 0.3;
          }

          forces[i].x -= nx * strength * dt;
          forces[i].y -= ny * strength * dt;
          forces[i].z -= nz * strength * dt;
          forces[j].x += nx * strength * dt;
          forces[j].y += ny * strength * dt;
          forces[j].z += nz * strength * dt;
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const ff = this.fireflies[i];
      const f = forces[i];
      const maxForce = 1.5;
      f.x = Math.max(-maxForce, Math.min(maxForce, f.x));
      f.y = Math.max(-maxForce, Math.min(maxForce, f.y));
      f.z = Math.max(-maxForce, Math.min(maxForce, f.z));
      ff.position.add(f);
    }
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.updateFps();
    this.checkPerformanceDegradation();

    const count = this.visibleCount;

    for (let i = 0; i < count; i++) {
      const ff = this.fireflies[i];

      ff.brightness = 0.55 + 0.45 * Math.sin(2 * Math.PI * ff.flickerFrequency * elapsedTime + ff.flickerPhase);
      ff.brightness = Math.max(0.1, Math.min(1.0, ff.brightness));

      ff.nextCtrlRefresh -= deltaTime;
      if (ff.nextCtrlRefresh <= 0 || ff.bezierProgress >= 1) {
        this.regenerateBezier(ff);
      }

      ff.bezierProgress += (deltaTime * ff.baseSpeed) / ff.bezierDuration;
      ff.bezierProgress = Math.min(1, ff.bezierProgress);

      const bezierPos = this.cubicBezier(
        ff.bezierProgress,
        ff.bezierStart,
        ff.bezierCtrl1,
        ff.bezierCtrl2,
        ff.bezierEnd
      );

      ff.position.lerp(bezierPos, Math.min(1, deltaTime * 2));

      ff.position.x = Math.max(-18, Math.min(18, ff.position.x));
      ff.position.y = Math.max(0.3, Math.min(14, ff.position.y));
      ff.position.z = Math.max(-18, Math.min(18, ff.position.z));
    }

    this.applyAttraction(deltaTime);

    for (let i = 0; i < count; i++) {
      const ff = this.fireflies[i];
      this.positions[i * 3] = ff.position.x;
      this.positions[i * 3 + 1] = ff.position.y;
      this.positions[i * 3 + 2] = ff.position.z;
      this.brightness[i] = ff.brightness;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aBrightness.needsUpdate = true;

    this.points.geometry.setDrawRange(0, this.visibleCount);
  }

  private updateFps(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const fps = 1000 / delta;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 30) {
      this.fpsHistory.shift();
    }
  }

  private checkPerformanceDegradation(): void {
    if (this.fpsHistory.length < 20) return;
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    if (!this.degraded && avgFps < 30) {
      this.degraded = true;
      this.visibleCount = 100;
    } else if (this.degraded && avgFps > 50) {
      this.degraded = false;
      this.visibleCount = 200;
    }
  }

  public getStats(): Stats {
    let totalSpeed = 0;
    let activeCount = 0;
    const count = this.visibleCount;

    for (let i = 0; i < count; i++) {
      const ff = this.fireflies[i];
      totalSpeed += ff.baseSpeed;
      if (ff.brightness > 0.7) {
        activeCount++;
      }
    }

    return {
      totalCount: this.visibleCount,
      averageSpeed: count > 0 ? totalSpeed / count : 0,
      activeCount,
    };
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }
}
