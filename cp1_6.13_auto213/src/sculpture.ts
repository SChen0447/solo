import * as THREE from 'three';

interface Ripple {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  amplitude: number;
  radius: number;
}

interface SculptureOptions {
  radius: number;
  segments: number;
  colorCenter: THREE.Color;
  colorEdge: THREE.Color;
  opacity: number;
}

export class Sculpture {
  public mesh: THREE.Mesh;
  public geometry: THREE.PlaneGeometry;
  public material: THREE.ShaderMaterial;

  private segments: number;
  private basePositions: Float32Array;
  private baseColors: Float32Array;
  private currentDisplacements: Float32Array;
  private velocities: Float32Array;

  private ripples: Ripple[] = [];
  private mouseWorld: THREE.Vector2 = new THREE.Vector2();
  private isMouseDown: boolean = false;
  private isDragging: boolean = false;

  private twistAngle: number = 0;
  private targetTwistAngle: number = 0;
  private twistVelocity: number = 0;

  private autoMode: 'static' | 'dynamic' = 'static';
  private time: number = 0;

  private colorShift: number = 0;

  private lastMouseAngle: number = 0;
  private isCircling: boolean = false;
  private circleCenter: THREE.Vector2 = new THREE.Vector2();
  private circleAccumulator: number = 0;

  constructor(options: SculptureOptions) {
    this.segments = options.segments;

    this.geometry = new THREE.PlaneGeometry(
      options.radius * 2,
      options.radius * 2,
      options.segments - 1,
      options.segments - 1
    );

    this.geometry.rotateX(-Math.PI / 2);

    const vertexCount = this.geometry.attributes.position.count;
    this.basePositions = new Float32Array(vertexCount * 3);
    this.baseColors = new Float32Array(vertexCount * 3);
    this.currentDisplacements = new Float32Array(vertexCount);
    this.velocities = new Float32Array(vertexCount).fill(0);

    const positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < vertexCount; i++) {
      this.basePositions[i * 3] = positions[i * 3];
      this.basePositions[i * 3 + 1] = positions[i * 3 + 1];
      this.basePositions[i * 3 + 2] = positions[i * 3 + 2];

      const x = positions[i * 3];
      const z = positions[i * 3 + 2];
      const dist = Math.sqrt(x * x + z * z) / options.radius;
      const t = Math.min(dist, 1);

      const color = new THREE.Color().lerpColors(
        options.colorCenter,
        options.colorEdge,
        t
      );

      this.baseColors[i * 3] = color.r;
      this.baseColors[i * 3 + 1] = color.g;
      this.baseColors[i * 3 + 2] = color.b;
    }

    const colors = new Float32Array(vertexCount * 3);
    colors.set(this.baseColors);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: options.opacity }
      },
      vertexShader: `
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor, uOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      vertexColors: true
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  public setMousePosition(x: number, y: number): void {
    this.mouseWorld.set(x, y);

    if (this.isMouseDown) {
      const dx = x - this.circleCenter.x;
      const dy = y - this.circleCenter.y;
      const currentAngle = Math.atan2(dy, dx);

      if (this.isCircling) {
        let deltaAngle = currentAngle - this.lastMouseAngle;
        if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
        this.circleAccumulator += deltaAngle;
        this.targetTwistAngle = this.circleAccumulator;
      }

      this.lastMouseAngle = currentAngle;
    }
  }

  public onMouseDown(x: number, y: number): void {
    this.isMouseDown = true;
    this.isDragging = true;
    this.isCircling = false;
    this.circleCenter.set(x, y);
    this.circleAccumulator = 0;
    this.lastMouseAngle = 0;
  }

  public onMouseMoveWhileDown(x: number, y: number): void {
    const distFromCenter = Math.sqrt(
      (x - this.circleCenter.x) ** 2 + (y - this.circleCenter.y) ** 2
    );

    if (distFromCenter > 0.1 && !this.isCircling) {
      this.isCircling = true;
      const dx = x - this.circleCenter.x;
      const dy = y - this.circleCenter.y;
      this.lastMouseAngle = Math.atan2(dy, dx);
    }
  }

  public onMouseUp(): void {
    this.isMouseDown = false;
    this.isDragging = false;
    this.isCircling = false;
    this.targetTwistAngle = 0;
  }

  public onClick(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      startTime: this.time,
      duration: 1.5,
      amplitude: 0.5,
      radius: 1.0
    });
  }

  public toggleAutoMode(): void {
    this.autoMode = this.autoMode === 'static' ? 'dynamic' : 'static';
  }

  public getAutoMode(): 'static' | 'dynamic' {
    return this.autoMode;
  }

  public getColorShift(): number {
    return this.colorShift;
  }

  public getRippleIntensity(): number {
    let intensity = 0;
    for (const ripple of this.ripples) {
      const elapsed = this.time - ripple.startTime;
      const progress = elapsed / ripple.duration;
      if (progress < 1) {
        intensity = Math.max(intensity, (1 - progress) * ripple.amplitude);
      }
    }
    return intensity;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    this.ripples = this.ripples.filter(
      r => this.time - r.startTime < r.duration
    );

    const twistSpring = 5;
    const twistDamping = 0.9;
    const twistAccel = (this.targetTwistAngle - this.twistAngle) * twistSpring;
    this.twistVelocity += twistAccel * deltaTime;
    this.twistVelocity *= Math.pow(twistDamping, deltaTime * 60);
    this.twistAngle += this.twistVelocity * deltaTime;

    this.colorShift = Math.min(Math.abs(this.twistAngle) / (Math.PI * 2), 1);

    const vertexCount = this.geometry.attributes.position.count;
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    const autoAmp = this.autoMode === 'static' ? 0.05 : 0.2;
    const autoPeriod = this.autoMode === 'static' ? 4 : 2;

    for (let i = 0; i < vertexCount; i++) {
      const bx = this.basePositions[i * 3];
      const by = this.basePositions[i * 3 + 1];
      const bz = this.basePositions[i * 3 + 2];

      const distFromCenter = Math.sqrt(bx * bx + bz * bz);

      let angle = Math.atan2(bz, bx);
      angle += this.twistAngle * (1 - distFromCenter / 1.5);

      const rx = Math.cos(angle) * distFromCenter;
      const rz = Math.sin(angle) * distFromCenter;

      let displacement = 0;

      if (this.isDragging && !this.isCircling) {
        const dx = rx - this.mouseWorld.x;
        const dz = rz - this.mouseWorld.y;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const influence = Math.max(0, 1 - dist / 0.8);
        displacement -= influence * 0.3;
      }

      if (this.isCircling) {
        const dx = rx - this.circleCenter.x;
        const dz = rz - this.circleCenter.y;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const influence = Math.max(0, 1 - dist / 1.2);
        displacement += Math.abs(this.twistVelocity) * 0.02 * influence;
      }

      for (const ripple of this.ripples) {
        const elapsed = this.time - ripple.startTime;
        const progress = elapsed / ripple.duration;
        if (progress < 1) {
          const dx = rx - ripple.x;
          const dz = rz - ripple.y;
          const dist = Math.sqrt(dx * dx + dz * dz);

          const waveRadius = progress * ripple.radius;
          const waveWidth = 0.2;
          const wave = Math.exp(-((dist - waveRadius) ** 2) / (waveWidth * waveWidth));
          const decay = 1 - progress;
          const jitter = (Math.sin(dist * 20 - elapsed * 10) * 0.3 + 0.7);

          displacement += ripple.amplitude * wave * decay * jitter;
        }
      }

      const autoWave = Math.sin(this.time * (Math.PI * 2) / autoPeriod + distFromCenter * 2) * autoAmp;
      displacement += autoWave;

      if (this.autoMode === 'dynamic') {
        const noise1 = Math.sin(this.time * 1.3 + bx * 5 + bz * 3) * 0.05;
        const noise2 = Math.sin(this.time * 0.7 + bx * 3 - bz * 7) * 0.05;
        displacement += noise1 + noise2;
      }

      const springForce = (0 - this.currentDisplacements[i]) * 2;
      this.velocities[i] += springForce * deltaTime;
      this.velocities[i] += (displacement - this.currentDisplacements[i]) * 8 * deltaTime;
      this.velocities[i] *= Math.pow(0.92, deltaTime * 60);
      this.currentDisplacements[i] += this.velocities[i] * deltaTime;

      positions[i * 3] = rx;
      positions[i * 3 + 1] = by + this.currentDisplacements[i];
      positions[i * 3 + 2] = rz;

      const colorT = Math.min(distFromCenter / 1.5, 1);
      const baseColor = new THREE.Color(
        this.baseColors[i * 3],
        this.baseColors[i * 3 + 1],
        this.baseColors[i * 3 + 2]
      );

      const purpleColor = new THREE.Color(0x9944ff);
      const magentaColor = new THREE.Color(0xff33aa);

      let finalColor = baseColor.clone();
      if (this.colorShift > 0) {
        const t = this.colorShift;
        if (t < 0.5) {
          finalColor.lerp(purpleColor, t * 2 * (1 - colorT * 0.5));
        } else {
          finalColor = baseColor.clone().lerp(purpleColor, (1 - colorT * 0.5));
          finalColor.lerp(magentaColor, (t - 0.5) * 2 * (1 - colorT * 0.5));
        }
      }

      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
