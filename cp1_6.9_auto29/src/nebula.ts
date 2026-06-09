import * as THREE from 'three';

const nebulaVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uPulse;

  void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;

    vec3 pos = position;
    float displacement = sin(uTime * 2.0 + position.y * 3.0) * 0.05 * uPulse;
    pos += normal * displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const nebulaFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPulse;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    vec3 uvOffset = vec3(vUv * 2.0, uTime * 0.05);
    float n1 = snoise(vPosition * 0.8 + uvOffset * 0.5);
    float n2 = snoise(vPosition * 2.0 + uvOffset);
    float n3 = snoise(vPosition * 4.0 - uvOffset * 0.3);
    float noise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    noise = noise * 0.5 + 0.5;

    float dist = length(vPosition) / 2.5;
    float alpha = smoothstep(1.0, 0.0, dist) * (0.4 + noise * 0.6);

    vec3 glowColor = uColor * (0.8 + noise * 0.4);
    vec3 white = vec3(1.0, 1.0, 1.0);
    vec3 finalColor = mix(glowColor, white, smoothstep(0.7, 1.0, noise) * 0.3);

    float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
    finalColor += uColor * rim * 0.3;

    gl_FragColor = vec4(finalColor, alpha * 0.7);
  }
`;

export interface MergeResult {
  merged: boolean;
  newColor: THREE.Color;
  newRadius: number;
  collisionPoint: THREE.Vector3;
  velocity: number;
  angle: number;
  mass: number;
}

export class Nebula {
  public mesh: THREE.Mesh;
  public coreLight: THREE.PointLight;
  public group: THREE.Group;
  public color: THREE.Color;
  public baseRadius: number;
  public currentRadius: number;
  public isDragging: boolean = false;
  public isMerging: boolean = false;
  public mergeTarget: Nebula | null = null;
  public mergeProgress: number = 0;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public previousPosition: THREE.Vector3;
  public mass: number;
  public id: number;

  private pulsePhase: number;
  private pulseSpeed: number;
  private pulseAmount: number;
  private paused: boolean = false;
  private time: number = 0;
  private material: THREE.ShaderMaterial;
  private static nextId: number = 0;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    colorHex: number,
    radius: number
  ) {
    this.id = Nebula.nextId++;
    this.color = new THREE.Color(colorHex);
    this.baseRadius = radius;
    this.currentRadius = radius;
    this.mass = radius;
    this.previousPosition = position.clone();

    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.8 + Math.random() * 0.5;
    this.pulseAmount = 0.2 + Math.random() * 0.3;

    this.material = new THREE.ShaderMaterial({
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      uniforms: {
        uColor: { value: this.color },
        uTime: { value: 0 },
        uPulse: { value: 1.0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(position);
    this.mesh.userData.nebula = this;

    this.coreLight = new THREE.PointLight(colorHex, 0.5, 15);
    this.coreLight.position.copy(position);

    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.group.add(this.coreLight);
    scene.add(this.group);
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  public set position(pos: THREE.Vector3) {
    this.mesh.position.copy(pos);
    this.coreLight.position.copy(pos);
  }

  public update(deltaTime: number): void {
    if (!this.paused) {
      this.time += deltaTime;
      this.pulsePhase += this.pulseSpeed * deltaTime;
      const pulseFactor = 1 + Math.sin(this.pulsePhase) * this.pulseAmount * 0.15;
      this.currentRadius = this.baseRadius * pulseFactor;
      this.mesh.scale.setScalar(pulseFactor);

      this.material.uniforms.uTime.value = this.time;
      this.material.uniforms.uPulse.value = pulseFactor;

      this.velocity.copy(this.mesh.position).sub(this.previousPosition).divideScalar(Math.max(deltaTime, 0.001));
      this.previousPosition.copy(this.mesh.position);
    }

    if (this.isMerging && this.mergeTarget) {
      this.mergeProgress += deltaTime / 0.8;
      const t = Math.min(this.mergeProgress, 1);
      const easeT = t * t * (3 - 2 * t);
      const midPoint = new THREE.Vector3()
        .addVectors(this.mesh.position, this.mergeTarget.mesh.position)
        .multiplyScalar(0.5);
      this.mesh.position.lerp(midPoint, easeT * 0.1);
      this.coreLight.position.copy(this.mesh.position);
    }
  }

  public checkCollision(other: Nebula): boolean {
    const distance = this.mesh.position.distanceTo(other.mesh.position);
    const minDist = this.currentRadius + other.currentRadius;
    return distance < minDist;
  }

  public computeMerge(other: Nebula): MergeResult {
    const collisionPoint = new THREE.Vector3()
      .addVectors(this.mesh.position, other.mesh.position)
      .multiplyScalar(0.5);

    const velocityMag = this.velocity.length() + other.velocity.length();
    const direction = new THREE.Vector3().subVectors(
      other.mesh.position, this.mesh.position
    ).normalize();
    const angle = this.velocity.angleTo(direction);
    const newRadius = Math.max(this.baseRadius, other.baseRadius) + 1;
    const totalMass = this.mass + other.mass;

    const hslA = { h: 0, s: 0, l: 0 };
    const hslB = { h: 0, s: 0, l: 0 };
    this.color.getHSL(hslA);
    other.color.getHSL(hslB);

    const weightA = this.mass / totalMass;
    const newHue = hslA.h * weightA + hslB.h * (1 - weightA);
    const newSat = hslA.s * weightA + hslB.s * (1 - weightA);
    const newLight = hslA.l * weightA + hslB.l * (1 - weightA);
    const newColor = new THREE.Color().setHSL(newHue, newSat, newLight);

    return {
      merged: true,
      newColor,
      newRadius,
      collisionPoint,
      velocity: velocityMag,
      angle,
      mass: totalMass
    };
  }

  public applyMerge(result: MergeResult): void {
    this.color.copy(result.newColor);
    this.material.uniforms.uColor.value.copy(result.newColor);
    this.baseRadius = result.newRadius;
    this.currentRadius = result.newRadius;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.SphereGeometry(result.newRadius, 64, 64);
    this.coreLight.color.copy(result.newColor);
    this.coreLight.intensity = 0.5;
    this.mass = result.mass;
    this.mesh.position.copy(result.collisionPoint);
    this.coreLight.position.copy(result.collisionPoint);
    this.previousPosition.copy(result.collisionPoint);
    this.isMerging = false;
    this.mergeTarget = null;
    this.mergeProgress = 0;
  }

  public dispose(scene: THREE.Scene): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    scene.remove(this.group);
  }

  public static hsvToRgb(h: number, s: number, v: number): THREE.Color {
    return new THREE.Color().setHSL(h, s, v);
  }
}
