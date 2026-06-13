import * as THREE from 'three';

const AURORA_CONFIG = {
  bandCount: 3,
  minWidth: 80,
  maxWidth: 150,
  driftSpeed: 0.3,
  minOpacity: 0.5,
  maxOpacity: 0.9,
  maxVertices: 20000,
  bandLength: 200,
  bandHeight: 15,
  segmentsLength: 128,
  segmentsHeight: 16
};

const COLOR_THEMES = {
  greenPurple: {
    bottom: new THREE.Color(0x00ff88),
    top: new THREE.Color(0x8a2be2)
  },
  bluePink: {
    bottom: new THREE.Color(0x00bfff),
    top: new THREE.Color(0xff69b4)
  }
};

type ColorThemeKey = keyof typeof COLOR_THEMES;

const vertexShader = `
  uniform float uTime;
  uniform float uDriftOffset;
  uniform float uRiseProgress;
  
  attribute vec3 aBasePosition;
  attribute float aNoiseSeed;
  
  varying vec3 vColor;
  varying float vOpacity;
  varying float vHeightRatio;
  
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
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
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
    vHeightRatio = position.y / ${AURORA_CONFIG.bandHeight.toFixed(1)};
    
    vec3 pos = aBasePosition;
    pos.x += uDriftOffset;
    
    float time = uTime * 0.5;
    float noiseScale = 0.02;
    float noiseTime = time * 0.3;
    
    float noise1 = snoise(vec3(pos.x * noiseScale + noiseTime, pos.y * noiseScale * 0.5, aNoiseSeed));
    float noise2 = snoise(vec3(pos.x * noiseScale * 1.5 + noiseTime * 1.2, pos.y * noiseScale * 0.8, aNoiseSeed + 10.0));
    float noise3 = snoise(vec3(pos.x * noiseScale * 0.7 + noiseTime * 0.8, pos.y * noiseScale * 0.3, aNoiseSeed + 20.0));
    
    float wave1 = sin(pos.x * 0.03 + time * 0.8) * 1.5;
    float wave2 = sin(pos.x * 0.05 + time * 1.2 + 1.0) * 0.8;
    float wave3 = sin(pos.x * 0.08 + time * 0.6 + 2.0) * 0.4;
    
    float totalWave = wave1 + wave2 + wave3;
    float totalNoise = (noise1 * 2.0 + noise2 * 1.0 + noise3 * 0.5) * 1.5;
    
    pos.z += totalWave + totalNoise;
    pos.y += (noise1 * 0.5 + noise2 * 0.3) * vHeightRatio * 2.0;
    
    pos.y *= uRiseProgress;
    
    vOpacity = ${AURORA_CONFIG.minOpacity.toFixed(1)} + (${AURORA_CONFIG.maxOpacity.toFixed(1)} - ${AURORA_CONFIG.minOpacity.toFixed(1)}) * 
               (0.5 + 0.5 * sin(time * 0.5 + aNoiseSeed * 0.1));
    vOpacity *= vHeightRatio * 0.8 + 0.2;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColorBottom;
  uniform vec3 uColorTop;
  
  varying vec3 vColor;
  varying float vOpacity;
  varying float vHeightRatio;
  
  void main() {
    vec3 color = mix(uColorBottom, uColorTop, vHeightRatio);
    float alpha = vOpacity;
    
    float edgeFade = smoothstep(0.0, 0.15, vHeightRatio) * smoothstep(1.0, 0.85, vHeightRatio);
    alpha *= edgeFade;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

interface AuroraBand {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  geometry: THREE.BufferGeometry;
  basePosition: Float32Array;
  noiseSeed: Float32Array;
  driftOffset: number;
  width: number;
}

export class AuroraManager {
  private scene: THREE.Scene;
  private bands: AuroraBand[] = [];
  private isPaused = false;
  private currentTheme: ColorThemeKey = 'greenPurple';
  private riseProgress = 0;
  private riseAnimationComplete = false;
  private totalVertices = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createAuroraBands();
  }

  private createAuroraBands(): void {
    const verticesPerBand = (AURORA_CONFIG.segmentsLength + 1) * (AURORA_CONFIG.segmentsHeight + 1);
    const maxBands = Math.floor(AURORA_CONFIG.maxVertices / verticesPerBand);
    const bandCount = Math.min(AURORA_CONFIG.bandCount, maxBands);

    for (let i = 0; i < bandCount; i++) {
      const width = AURORA_CONFIG.minWidth + Math.random() * (AURORA_CONFIG.maxWidth - AURORA_CONFIG.minWidth);
      this.createBand(i, width, verticesPerBand);
    }
  }

  private createBand(index: number, width: number, verticesPerBand: number): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(verticesPerBand * 3);
    const basePosition = new Float32Array(verticesPerBand * 3);
    const noiseSeed = new Float32Array(verticesPerBand);
    const uvs = new Float32Array(verticesPerBand * 2);
    const indices = [];

    const halfLength = AURORA_CONFIG.bandLength / 2;
    const height = AURORA_CONFIG.bandHeight;

    let vertexIndex = 0;
    for (let y = 0; y <= AURORA_CONFIG.segmentsHeight; y++) {
      for (let x = 0; x <= AURORA_CONFIG.segmentsLength; x++) {
        const u = x / AURORA_CONFIG.segmentsLength;
        const v = y / AURORA_CONFIG.segmentsHeight;

        const px = (u - 0.5) * AURORA_CONFIG.bandLength;
        const py = v * height;
        const pz = 0;

        const i = vertexIndex * 3;
        positions[i] = px;
        positions[i + 1] = py;
        positions[i + 2] = pz;

        basePosition[i] = px;
        basePosition[i + 1] = py;
        basePosition[i + 2] = pz;

        noiseSeed[vertexIndex] = Math.random() * 100;

        uvs[vertexIndex * 2] = u;
        uvs[vertexIndex * 2 + 1] = v;

        vertexIndex++;
      }
    }

    for (let y = 0; y < AURORA_CONFIG.segmentsHeight; y++) {
      for (let x = 0; x < AURORA_CONFIG.segmentsLength; x++) {
        const a = y * (AURORA_CONFIG.segmentsLength + 1) + x;
        const b = a + AURORA_CONFIG.segmentsLength + 1;
        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aBasePosition', new THREE.BufferAttribute(basePosition, 3));
    geometry.setAttribute('aNoiseSeed', new THREE.BufferAttribute(noiseSeed, 1));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    const theme = COLOR_THEMES[this.currentTheme];
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uDriftOffset: { value: 0 },
        uRiseProgress: { value: 0 },
        uColorBottom: { value: theme.bottom.clone() },
        uColorTop: { value: theme.top.clone() }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    const yOffset = 5 + index * 2;
    const zOffset = -5 - index * 3;
    const xOffset = (index - 1) * 10;
    mesh.position.set(xOffset, yOffset, zOffset);
    mesh.rotation.y = (Math.random() - 0.5) * 0.3;

    this.scene.add(mesh);

    this.bands.push({
      mesh,
      material,
      geometry,
      basePosition,
      noiseSeed,
      driftOffset: index * 20,
      width
    });

    this.totalVertices += verticesPerBand;
  }

  update(deltaTime: number, elapsedTime: number): void {
    if (this.isPaused) return;

    if (!this.riseAnimationComplete) {
      this.riseProgress = Math.min(this.riseProgress + deltaTime * 0.5, 1);
      if (this.riseProgress >= 1) {
        this.riseAnimationComplete = true;
      }
    }

    this.bands.forEach((band, index) => {
      band.driftOffset -= AURORA_CONFIG.driftSpeed * deltaTime;
      
      if (band.driftOffset < -AURORA_CONFIG.bandLength) {
        band.driftOffset += AURORA_CONFIG.bandLength * 2;
      }

      band.material.uniforms.uTime.value = elapsedTime;
      band.material.uniforms.uDriftOffset.value = band.driftOffset;
      band.material.uniforms.uRiseProgress.value = this.riseProgress;
    });
  }

  togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  isAnimationPaused(): boolean {
    return this.isPaused;
  }

  toggleColorTheme(): void {
    this.currentTheme = this.currentTheme === 'greenPurple' ? 'bluePink' : 'greenPurple';
    const theme = COLOR_THEMES[this.currentTheme];
    
    this.bands.forEach(band => {
      band.material.uniforms.uColorBottom.value.copy(theme.bottom);
      band.material.uniforms.uColorTop.value.copy(theme.top);
    });
  }

  getCurrentTheme(): ColorThemeKey {
    return this.currentTheme;
  }

  getTotalVertices(): number {
    return this.totalVertices;
  }

  setFadeOpacity(opacity: number): void {
    this.bands.forEach(band => {
      band.material.opacity = opacity;
    });
  }

  dispose(): void {
    this.bands.forEach(band => {
      band.geometry.dispose();
      band.material.dispose();
      this.scene.remove(band.mesh);
    });
    this.bands = [];
  }
}
