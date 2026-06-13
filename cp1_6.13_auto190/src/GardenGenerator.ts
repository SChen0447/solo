import * as THREE from 'three';

export const COLOR_PALETTE: string[] = [
  '#ff6b9d', '#c44dff', '#4ecdc4', '#45b7d1', '#96e6a1',
  '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#fa709a',
  '#fee140', '#30cfd0', '#330867', '#a8edea', '#fed6e3',
  '#ff9a9e', '#fecfef', '#a1c4fd', '#c2e9fb', '#fbc2eb',
  '#a6c1ee', '#84fab0', '#8fd3f4', '#fccb90'
];

export interface CrystalData {
  id: number;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  baseColor: THREE.Color;
  height: number;
  radius: number;
  lifetime: number;
  maxLifetime: number;
  isDecaying: boolean;
  decayStartTime: number;
  generation: number;
  cracks?: THREE.LineSegments;
  originalScale: THREE.Vector3;
}

export interface SpawnSparkle {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

export interface RippleParticle {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  center: THREE.Vector3;
  initialRadius: number;
  finalRadius: number;
  angle: number;
}

export interface DecayParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  startTime: number;
  duration: number;
}

export class GardenGenerator {
  private scene: THREE.Scene;
  public crystals: Map<number, CrystalData> = new Map();
  public ground!: THREE.Mesh;
  public groundRadius: number = 300;
  public gardenGroup!: THREE.Group;
  private crystalIdCounter: number = 0;
  private textureLoader: THREE.TextureLoader;

  private crystalVertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private crystalFragmentShader = `
    uniform float uTime;
    uniform vec3 uBaseColor;
    uniform float uOpacity;
    uniform float uDecayFactor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      vec3 baseColor = uBaseColor;
      if (uDecayFactor > 0.0) {
        baseColor = mix(baseColor, vec3(0.2, 0.2, 0.22), uDecayFactor);
      }

      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);

      float flow = sin(vPosition.y * 0.08 + uTime * 1.5) * 0.5 + 0.5;
      float flow2 = sin(vUv.x * 6.28 + uTime * 2.0 + vPosition.y * 0.03) * 0.5 + 0.5;

      float hueShift = flow * 0.08 + flow2 * 0.05;
      vec3 shiftedColor = baseColor;
      float hue = (baseColor.r + baseColor.g + baseColor.b) / 3.0;
      shiftedColor = mix(baseColor, baseColor * 1.3 + vec3(0.05, 0.02, 0.08), flow * 0.4);

      vec3 hologram = hsv2rgb(vec3(fract(vUv.y * 2.0 + uTime * 0.3 + hueShift), 0.4, 1.0));
      shiftedColor = mix(shiftedColor, hologram, 0.25 * (flow + flow2) * 0.5);

      float rim = fresnel * 0.6;
      vec3 finalColor = shiftedColor + rim * vec3(0.8, 0.9, 1.0);

      float verticalGlow = sin(vUv.y * 3.14159) * 0.3;
      finalColor += baseColor * verticalGlow * 0.3;

      float sparkle = pow(max(0.0, sin(vPosition.x * 10.0 + uTime * 3.0) * sin(vPosition.y * 8.0 + uTime * 2.5)), 8.0) * 0.3;
      finalColor += sparkle * vec3(1.0, 1.0, 1.0);

      gl_FragColor = vec4(finalColor, uOpacity);
    }
  `;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.init();
  }

  private init(): void {
    this.gardenGroup = new THREE.Group();
    this.scene.add(this.gardenGroup);
    this.createGround();
    this.createBackgroundGlow();
    this.generateInitialCrystals();
  }

  private createGround(): void {
    const viewportHeight = window.innerHeight;
    this.groundRadius = Math.max(400, viewportHeight * 0.6) / 2;

    const geometry = new THREE.CircleGeometry(this.groundRadius, 64);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0;
        
        float grid = 0.0;
        vec2 gridUv = vUv * 16.0;
        vec2 gridFrac = fract(gridUv);
        vec2 gridDelta = fwidth(gridUv);
        float gx = smoothstep(0.0, gridDelta.x * 2.0, gridFrac.x) * (1.0 - smoothstep(1.0 - gridDelta.x * 2.0, 1.0, gridFrac.x));
        float gy = smoothstep(0.0, gridDelta.y * 2.0, gridFrac.y) * (1.0 - smoothstep(1.0 - gridDelta.y * 2.0, 1.0, gridFrac.y));
        grid = max(1.0 - gx, 1.0 - gy);
        grid = 1.0 - grid;

        float edgeFade = smoothstep(1.0, 0.85, dist);
        float alpha = 0.15 + grid * 0.3 * edgeFade;

        float ripple = sin(dist * 40.0 - uTime * 0.5) * 0.5 + 0.5;
        ripple *= smoothstep(0.3, 0.9, dist) * 0.08;

        vec3 color = vec3(0.10, 0.16, 0.29);
        color += ripple * vec3(0.3, 0.5, 0.8);

        gl_FragColor = vec4(color, alpha * edgeFade);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -10;
    this.gardenGroup.add(this.ground);

    const ringGeometry = new THREE.RingGeometry(this.groundRadius * 0.98, this.groundRadius * 1.02, 128);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x4ecdc4,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -9.5;
    this.gardenGroup.add(ring);
  }

  private createBackgroundGlow(): void {
    const glowGeometry = new THREE.PlaneGeometry(2000, 2000);
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const fragmentShader = `
      varying vec2 vUv;
      void main() {
        vec2 center = vUv - 0.5;
        float dist = length(center) * 2.0;
        float glow = smoothstep(1.0, 0.0, dist);
        glow = pow(glow, 2.0);
        vec3 color = mix(vec3(0.0, 0.0, 0.0), vec3(0.10, 0.16, 0.29), glow * 0.6);
        gl_FragColor = vec4(color, glow * 0.5);
      }
    `;
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const glowPlane = new THREE.Mesh(glowGeometry, glowMaterial);
    glowPlane.position.z = -500;
    this.scene.add(glowPlane);
  }

  private generateInitialCrystals(): void {
    const count = 9;
    const radius = this.groundRadius * 0.5;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius * (0.3 + Math.random() * 0.6);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = -10;

      const height = 30 + Math.random() * 50;
      const crystalRadius = 15 + Math.random() * 10;

      this.createCrystal(
        new THREE.Vector3(x, y, z),
        height,
        crystalRadius,
        COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
        0,
        true
      );
    }
  }

  public createCrystalMaterial(baseColor: THREE.Color): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: this.crystalVertexShader,
      fragmentShader: this.crystalFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color(baseColor) },
        uOpacity: { value: 1.0 },
        uDecayFactor: { value: 0.0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  public createHexagonalPrism(radius: number, height: number): THREE.BufferGeometry {
    const geometry = new THREE.CylinderGeometry(radius, radius * 0.7, height, 6, 1, false);

    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;

    for (let i = 0; i < posArray.length; i += 3) {
      const yRatio = (posArray[i + 1] + height / 2) / height;
      const irregularity = (Math.sin(i * 0.137) + Math.cos(i * 0.213)) * 0.12;
      const yJitter = yRatio < 0.5 ? irregularity * (1 - yRatio * 2) : irregularity * (yRatio - 0.5) * 2;

      const xzFactor = 1 + irregularity * 0.15 * Math.sin(yRatio * Math.PI);
      posArray[i] *= xzFactor;
      posArray[i + 2] *= xzFactor;
      posArray[i + 1] += yJitter * height * 0.05;
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  public createCrystal(
    position: THREE.Vector3,
    height: number,
    radius: number,
    colorHex: string,
    generation: number = 0,
    animateSpawn: boolean = false
  ): CrystalData | null {
    if (this.crystals.size >= 500) {
      this.removeOldestDecayingCrystal();
      if (this.crystals.size >= 500) return null;
    }

    const geometry = this.createHexagonalPrism(radius, height);
    const baseColor = new THREE.Color(colorHex);
    const material = this.createCrystalMaterial(baseColor);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y = position.y - height / 2;
    mesh.rotation.y = Math.random() * Math.PI * 2;

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: baseColor.clone().multiplyScalar(1.5),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    mesh.add(edges);

    this.gardenGroup.add(mesh);

    const id = this.crystalIdCounter++;
    const crystalData: CrystalData = {
      id,
      mesh,
      position: position.clone(),
      baseColor,
      height,
      radius,
      lifetime: 0,
      maxLifetime: 60 + generation * 10,
      isDecaying: false,
      decayStartTime: 0,
      generation,
      originalScale: new THREE.Vector3(1, 1, 1)
    };

    this.crystals.set(id, crystalData);

    if (animateSpawn) {
      mesh.scale.set(0.01, 0.01, 0.01);
      mesh.position.y -= 20;
    }

    return crystalData;
  }

  public removeOldestDecayingCrystal(): void {
    let oldest: CrystalData | null = null;
    let oldestTime = Infinity;

    for (const crystal of this.crystals.values()) {
      if (crystal.isDecaying && crystal.lifetime < oldestTime) {
        oldest = crystal;
        oldestTime = crystal.lifetime;
      }
    }

    if (!oldest) {
      let oldestNormal: CrystalData | null = null;
      let oldestNormalTime = -Infinity;
      for (const crystal of this.crystals.values()) {
        if (crystal.lifetime > oldestNormalTime) {
          oldestNormal = crystal;
          oldestNormalTime = crystal.lifetime;
        }
      }
      if (oldestNormal) {
        this.removeCrystal(oldestNormal.id);
      }
    } else {
      this.removeCrystal(oldest.id);
    }
  }

  public removeCrystal(id: number): void {
    const crystal = this.crystals.get(id);
    if (!crystal) return;

    this.gardenGroup.remove(crystal.mesh);
    crystal.mesh.geometry.dispose();
    (crystal.mesh.material as THREE.Material).dispose();
    if (crystal.cracks) {
      this.gardenGroup.remove(crystal.cracks);
      crystal.cracks.geometry.dispose();
      (crystal.cracks.material as THREE.Material).dispose();
    }

    this.crystals.delete(id);
  }

  public createCrackLines(crystal: CrystalData): void {
    const segments: number[] = [];
    const crackCount = 6 + Math.floor(Math.random() * 3);

    for (let i = 0; i < crackCount; i++) {
      const startY = -crystal.height / 2 + Math.random() * crystal.height;
      const startAngle = Math.random() * Math.PI * 2;
      const startR = crystal.radius * (0.8 + Math.random() * 0.2);

      const startX = Math.cos(startAngle) * startR;
      const startZ = Math.sin(startAngle) * startR;

      segments.push(startX, startY, startZ);

      const segmentsInCrack = 2 + Math.floor(Math.random() * 2);
      let curX = startX, curY = startY, curZ = startZ;

      for (let j = 0; j < segmentsInCrack; j++) {
        const len = (crystal.height / crackCount) * (0.5 + Math.random() * 0.5);
        const dirAngle = Math.random() * Math.PI * 2;
        const dirY = (Math.random() - 0.5) * 2;

        curX += Math.cos(dirAngle) * len * 0.3;
        curY += dirY * len;
        curZ += Math.sin(dirAngle) * len * 0.3;

        curX = THREE.MathUtils.clamp(curX, -crystal.radius * 1.1, crystal.radius * 1.1);
        curZ = THREE.MathUtils.clamp(curZ, -crystal.radius * 1.1, crystal.radius * 1.1);
        curY = THREE.MathUtils.clamp(curY, -crystal.height / 2, crystal.height / 2);

        segments.push(curX, curY, curZ);
        segments.push(curX, curY, curZ);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0,
      linewidth: 2,
      blending: THREE.AdditiveBlending
    });

    const lines = new THREE.LineSegments(geometry, material);
    crystal.mesh.add(lines);
    crystal.cracks = lines;
  }

  public update(time: number, deltaTime: number): void {
    this.gardenGroup.rotation.y += 0.01 * deltaTime;

    const groundMat = this.ground.material as THREE.ShaderMaterial;
    if (groundMat.uniforms) {
      groundMat.uniforms.uTime.value = time;
    }

    for (const crystal of this.crystals.values()) {
      crystal.lifetime += deltaTime;

      const mat = crystal.mesh.material as THREE.ShaderMaterial;
      if (mat.uniforms) {
        mat.uniforms.uTime.value = time;
      }

      if (crystal.isDecaying && crystal.cracks) {
        const crackMat = crystal.cracks.material as THREE.LineBasicMaterial;
        const elapsed = crystal.lifetime - crystal.decayStartTime;
        crackMat.opacity = Math.min(1, elapsed * 2);
      }

      const breathe = Math.sin(time * 0.8 + crystal.id * 0.7) * 0.02;
      crystal.mesh.scale.x = crystal.originalScale.x * (1 + breathe);
      crystal.mesh.scale.z = crystal.originalScale.z * (1 + breathe);
    }
  }

  public resize(): void {
    const viewportHeight = window.innerHeight;
    const newRadius = Math.max(400, viewportHeight * 0.6) / 2;
    const scale = newRadius / this.groundRadius;
    this.groundRadius = newRadius;

    this.gardenGroup.scale.multiplyScalar(scale);
  }

  public getRandomColor(): string {
    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
  }

  public getCrystalAt(intersectPoint: THREE.Vector3, threshold: number = 25): CrystalData | null {
    let closest: CrystalData | null = null;
    let closestDist = threshold;

    for (const crystal of this.crystals.values()) {
      if (crystal.isDecaying) continue;
      const dist = crystal.mesh.position.distanceTo(intersectPoint);
      if (dist < closestDist + crystal.height / 2) {
        closestDist = dist;
        closest = crystal;
      }
    }

    return closest;
  }
}
