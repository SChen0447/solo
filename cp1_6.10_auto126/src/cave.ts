import * as THREE from 'three';

export interface CaveChannel {
  id: number;
  points: THREE.Vector3[];
  radius: number;
  length: number;
  avgRadius: number;
  connectedNodes: number[];
  mesh: THREE.Mesh;
  highlightMesh: THREE.Mesh | null;
  isHighlighted: boolean;
  children: CaveChannel[];
  isMain: boolean;
  branchWidth: number;
  opacity: number;
  targetOpacity: number;
  opacityAnimStart: number;
  opacityAnimDuration: number;
  growProgress: number;
}

const vertexShader = `
  uniform float uTime;
  uniform float uBumpScale;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vHeight;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
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
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;
    vHeight = position.y;
    float noise = snoise(position * 2.0 + uTime * 0.05);
    vec3 newPosition = position + normal * noise * uBumpScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float uOpacity;
  uniform float uHighlight;
  uniform float uTime;
  uniform vec3 uColorStart;
  uniform vec3 uColorEnd;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vHeight;

  void main() {
    float t = clamp((vHeight + 20.0) / 40.0, 0.0, 1.0);
    vec3 baseColor = mix(uColorStart, uColorEnd, t);
    float pulse = 0.5 + 0.5 * sin(uTime * 3.14159 * 2.0);
    vec3 highlightColor = vec3(0.0, 0.706, 0.847);
    vec3 finalColor = mix(baseColor, highlightColor, uHighlight * (0.3 + 0.7 * pulse));
    float light = dot(normalize(vNormal), normalize(vec3(0.5, 1.0, 0.3)));
    finalColor *= 0.6 + 0.4 * max(light, 0.0);
    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

class CaveSystem {
  public channels: CaveChannel[] = [];
  public group: THREE.Group;
  public raycaster: THREE.Raycaster;
  private scene: THREE.Scene;
  private nextId = 0;
  private mainChannelCount = 5;
  private branchCount = 12;
  private materialCache: THREE.ShaderMaterial | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Mesh = { threshold: 0.5 };
    this.generate();
  }

  private createMaterial(): THREE.ShaderMaterial {
    if (this.materialCache) return this.materialCache.clone();
    this.materialCache = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBumpScale: { value: 0.5 },
        uOpacity: { value: 0.7 },
        uHighlight: { value: 0 },
        uColorStart: { value: new THREE.Color('#8b5a2b') },
        uColorEnd: { value: new THREE.Color('#5c3a1e') }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    return this.materialCache.clone();
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private generateMainChannelPoints(direction: THREE.Vector3): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const start = new THREE.Vector3(0, 0, 0);
    points.push(start.clone());
    let current = start.clone();
    let dir = direction.clone().normalize();
    const segments = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < segments; i++) {
      const step = this.randomRange(3, 6);
      const noise = new THREE.Vector3(
        this.randomRange(-0.5, 0.5),
        this.randomRange(-0.4, 0.4),
        this.randomRange(-0.5, 0.5)
      );
      dir.add(noise).normalize();
      current = current.clone().add(dir.clone().multiplyScalar(step));
      points.push(current.clone());
    }
    return points;
  }

  private generateBranchPoints(fromPoints: THREE.Vector3[], startT: number): THREE.Vector3[] {
    const startIdx = Math.floor(startT * (fromPoints.length - 1));
    const idx = Math.min(startIdx, fromPoints.length - 2);
    const t = startT * (fromPoints.length - 1) - idx;
    const p0 = fromPoints[idx];
    const p1 = fromPoints[Math.min(idx + 1, fromPoints.length - 1)];
    const origin = new THREE.Vector3().lerpVectors(p0, p1, t);
    const tangent = new THREE.Vector3().subVectors(p1, p0).normalize();
    const normal = new THREE.Vector3(
      this.randomRange(-1, 1),
      this.randomRange(-1, 1),
      this.randomRange(-1, 1)
    ).normalize();
    const branchDir = new THREE.Vector3()
      .addVectors(tangent.clone().multiplyScalar(0.3), normal.clone().multiplyScalar(0.7))
      .normalize();
    const points: THREE.Vector3[] = [];
    points.push(origin.clone());
    let current = origin.clone();
    let dir = branchDir.clone();
    const segments = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < segments; i++) {
      const step = this.randomRange(2, 4);
      const noise = new THREE.Vector3(
        this.randomRange(-0.6, 0.6),
        this.randomRange(-0.5, 0.5),
        this.randomRange(-0.6, 0.6)
      );
      dir.add(noise).normalize();
      current = current.clone().add(dir.clone().multiplyScalar(step));
      points.push(current.clone());
    }
    return points;
  }

  private createChannel(
    points: THREE.Vector3[],
    radius: number,
    isMain: boolean,
    branchWidth: number
  ): CaveChannel {
    const curve = new THREE.CatmullRomCurve3(points);
    const tubularSegments = Math.max(64, points.length * 12);
    const radialSegments = 16;
    const geometry = new THREE.TubeGeometry(
      curve, tubularSegments, radius, radialSegments, false
    );
    const material = this.createMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    const highlightGeo = new THREE.TubeGeometry(
      curve, tubularSegments, radius * 1.08, radialSegments, false
    );
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0x00b4d8,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false
    });
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
    highlightMesh.visible = false;
    this.group.add(highlightMesh);
    const length = curve.getLength();
    const channel: CaveChannel = {
      id: this.nextId++,
      points,
      radius,
      length,
      avgRadius: radius,
      connectedNodes: [],
      mesh,
      highlightMesh,
      isHighlighted: false,
      children: [],
      isMain,
      branchWidth,
      opacity: isMain ? 0.7 : 0,
      targetOpacity: 0.7,
      opacityAnimStart: -1,
      opacityAnimDuration: 0.3,
      growProgress: 1
    };
    mesh.userData.channel = channel;
    return channel;
  }

  private generate(): void {
    const mainDirections: THREE.Vector3[] = [];
    for (let i = 0; i < this.mainChannelCount; i++) {
      const angle = (i / this.mainChannelCount) * Math.PI * 2 + this.randomRange(-0.3, 0.3);
      const y = this.randomRange(-0.4, 0.4);
      const horiz = Math.sqrt(1 - y * y);
      mainDirections.push(new THREE.Vector3(
        Math.cos(angle) * horiz,
        y,
        Math.sin(angle) * horiz
      ));
    }
    for (let i = 0; i < this.mainChannelCount; i++) {
      const radius = this.randomRange(1.0, 2.0);
      const points = this.generateMainChannelPoints(mainDirections[i]);
      const channel = this.createChannel(points, radius, true, radius);
      channel.connectedNodes = [0, i + 1];
      this.channels.push(channel);
    }
    for (let i = 0; i < this.branchCount; i++) {
      const mainChannel = this.channels[i % this.mainChannelCount];
      const startT = this.randomRange(0.2, 0.8);
      const radius = this.randomRange(0.5, mainChannel.radius * 0.7);
      const points = this.generateBranchPoints(mainChannel.points, startT);
      const channel = this.createChannel(points, radius, false, radius);
      channel.connectedNodes = [mainChannel.id, this.nextId];
      this.channels.push(channel);
    }
  }

  public setOpacity(target: number): void {
    const now = performance.now() / 1000;
    for (const channel of this.channels) {
      channel.targetOpacity = target;
      channel.opacityAnimStart = now;
    }
  }

  public setGrowthFactor(factor: number, previousFactor: number): void {
    const wasLow = previousFactor < 0.1;
    const isRising = factor > previousFactor;
    if (wasLow && isRising && factor > 0.2) {
      this.spawnChildBranches();
    }
    for (const channel of this.channels) {
      if (!channel.isMain) {
        const now = performance.now() / 1000;
        channel.targetOpacity = Math.min(0.7, 0.3 + factor * 0.7);
        if (channel.opacityAnimStart < 0) {
          channel.opacityAnimStart = now;
        }
      }
    }
  }

  private spawnChildBranches(): void {
    const spawnCount = 3 + Math.floor(Math.random() * 3);
    const mainChannels = this.channels.filter(c => c.isMain);
    for (let i = 0; i < spawnCount; i++) {
      const parent = mainChannels[Math.floor(Math.random() * mainChannels.length)];
      const startT = this.randomRange(0.15, 0.85);
      const radius = this.randomRange(0.1, 0.3);
      const points = this.generateBranchPoints(parent.points, startT);
      if (points.length < 3) continue;
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, 48, radius, 12, false);
      const material = this.createMaterial();
      (material.uniforms.uOpacity as { value: number }).value = 0;
      const mesh = new THREE.Mesh(geometry, material);
      this.group.add(mesh);
      const length = curve.getLength();
      const channel: CaveChannel = {
        id: this.nextId++,
        points,
        radius,
        length,
        avgRadius: radius,
        connectedNodes: [parent.id, this.nextId],
        mesh,
        highlightMesh: null,
        isHighlighted: false,
        children: [],
        isMain: false,
        branchWidth: radius,
        opacity: 0,
        targetOpacity: 0.6,
        opacityAnimStart: performance.now() / 1000,
        opacityAnimDuration: 1.0,
        growProgress: 0
      };
      mesh.userData.channel = channel;
      parent.children.push(channel);
      this.channels.push(channel);
    }
  }

  public highlightChannel(channel: CaveChannel | null): void {
    for (const c of this.channels) {
      c.isHighlighted = (c === channel);
      if (c.highlightMesh) {
        c.highlightMesh.visible = c.isHighlighted;
      }
      const mat = c.mesh.material as THREE.ShaderMaterial;
      if (mat && mat.uniforms && mat.uniforms.uHighlight) {
        mat.uniforms.uHighlight.value = c.isHighlighted ? 1 : 0;
      }
    }
  }

  public pickChannel(mouse: THREE.Vector2, camera: THREE.Camera): CaveChannel | null {
    this.raycaster.setFromCamera(mouse, camera);
    const meshes = this.channels.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      return (intersects[0].object as THREE.Mesh).userData.channel as CaveChannel;
    }
    return null;
  }

  public update(time: number): void {
    const now = time;
    for (const channel of this.channels) {
      if (channel.opacityAnimStart >= 0) {
        const t = Math.min(1, (now - channel.opacityAnimStart) / channel.opacityAnimDuration);
        const eased = easeInOutCubic(t);
        channel.opacity = lerp(channel.opacity, channel.targetOpacity, eased * 0.15);
        if (t >= 1) {
          channel.opacity = channel.targetOpacity;
          channel.opacityAnimStart = -1;
        }
      }
      const mat = channel.mesh.material as THREE.ShaderMaterial;
      if (mat && mat.uniforms) {
        if (mat.uniforms.uTime) mat.uniforms.uTime.value = time;
        if (mat.uniforms.uOpacity) mat.uniforms.uOpacity.value = channel.opacity;
      }
      if (channel.highlightMesh && channel.isHighlighted) {
        const pulse = 0.5 + 0.5 * Math.sin(time * Math.PI * 2);
        const hMat = channel.highlightMesh.material as THREE.MeshBasicMaterial;
        hMat.opacity = 0.15 + 0.25 * pulse;
      }
    }
  }

  public getAllMeshes(): THREE.Mesh[] {
    return this.channels.map(c => c.mesh);
  }
}

export default CaveSystem;
