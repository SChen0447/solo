import * as THREE from 'three';

const NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
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
`;

const vertexShader = `
${NOISE_GLSL}

uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uIdle;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying float vNoiseVal;

void main() {
  vec3 pos = position;
  float freq = 0.8 + uFrequency * 0.003;
  float amp = uAmplitude * 1.5 * (1.0 - uIdle);

  float noise1 = snoise(pos * freq + uTime * 0.3);
  float noise2 = snoise(pos * freq * 2.0 + uTime * 0.5) * 0.5;
  float noise3 = snoise(pos * freq * 4.0 + uTime * 0.8) * 0.25;
  float displacement = (noise1 + noise2 + noise3) * amp;

  vNoiseVal = noise1;

  vec3 newPos = pos + normal * displacement;
  vDisplacement = displacement;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(newPos, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

const fragmentShader = `
uniform float uAmplitude;
uniform float uFrequency;
uniform float uTime;
uniform float uIdle;
uniform float uGlowIntensity;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;
varying float vNoiseVal;

vec3 warmLow1 = vec3(1.0, 0.42, 0.42);
vec3 warmLow2 = vec3(0.996, 0.792, 0.341);
vec3 neutralMid = vec3(1.0, 0.624, 0.953);
vec3 coolHigh1 = vec3(0.282, 0.859, 0.984);
vec3 coolHigh2 = vec3(0.329, 0.627, 1.0);
vec3 idleColor = vec3(0.165, 0.165, 0.165);

vec3 getColor(float freq, float amp) {
  vec3 color;
  if (freq < 200.0) {
    float t = freq / 200.0;
    color = mix(warmLow1, warmLow2, t);
  } else if (freq < 2000.0) {
    float t = (freq - 200.0) / 1800.0;
    vec3 fromWarm = mix(warmLow2, neutralMid, t * 0.5);
    color = mix(fromWarm, neutralMid, t);
  } else {
    float t = min((freq - 2000.0) / 3000.0, 1.0);
    color = mix(neutralMid, mix(coolHigh1, coolHigh2, t), t);
  }
  return mix(color, idleColor, uIdle);
}

void main() {
  vec3 viewDir = normalize(-vPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.5);

  vec3 baseColor = getColor(uFrequency, uAmplitude);
  float ampFactor = uAmplitude * (1.0 - uIdle);
  baseColor += fresnel * 0.4 * ampFactor;

  float glow = uGlowIntensity * (1.0 - uIdle);
  baseColor += glow * 0.15;

  float rim = fresnel * 0.6;
  vec3 finalColor = baseColor + vec3(rim * 0.3 * ampFactor);

  float alpha = 0.92 + fresnel * 0.08;
  gl_FragColor = vec4(finalColor, alpha);
}
`;

const PARTICLE_VERTEX = `
attribute float aOpacity;
attribute float aSize;
varying float vOpacity;

void main() {
  vOpacity = aOpacity;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (200.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const PARTICLE_FRAGMENT = `
uniform vec3 uParticleColor;
varying float vOpacity;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.1, dist) * vOpacity;
  gl_FragColor = vec4(uParticleColor, alpha);
}
`;

const GLOW_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GLOW_FRAGMENT = `
uniform float uGlowAlpha;
uniform vec3 uGlowColor;
varying vec2 vUv;

void main() {
  float dist = length(vUv - vec2(0.5)) * 2.0;
  float alpha = smoothstep(1.0, 0.0, dist) * uGlowAlpha;
  gl_FragColor = vec4(uGlowColor, alpha);
}
`;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

export class URDFluid {
  group: THREE.Group;
  mesh: THREE.Mesh;
  particles: THREE.Points;
  glowMesh: THREE.Mesh;

  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.ShaderMaterial;
  private glowMaterial: THREE.ShaderMaterial;

  private particleData: Particle[] = [];
  private particlePositions: Float32Array;
  private particleOpacities: Float32Array;
  private particleSizes: Float32Array;

  private currentAmplitude = 0;
  private currentFrequency = 0;
  private targetAmplitude = 0;
  private targetFrequency = 0;
  private smoothAmplitude = 0;
  private smoothFrequency = 0;
  private idleAmount = 0;
  private lastActiveTime = 0;
  private time = 0;

  private currentColor = new THREE.Color(0.996, 0.792, 0.341);
  private targetColor = new THREE.Color(0.996, 0.792, 0.341);

  private readonly PARTICLE_COUNT = 300;
  private readonly IDLE_THRESHOLD = 5000;

  constructor() {
    this.group = new THREE.Group();

    this.geometry = this.createSphereGeometry();
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: 0 },
        uFrequency: { value: 440 },
        uIdle: { value: 0 },
        uGlowIntensity: { value: 0.5 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.group.add(this.mesh);

    const { positions, opacities, sizes } = this.initParticleData();
    this.particlePositions = positions;
    this.particleOpacities = opacities;
    this.particleSizes = sizes;

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.particleOpacities, 1));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(this.particleSizes, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      uniforms: {
        uParticleColor: { value: new THREE.Color(0.996, 0.792, 0.341) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.group.add(this.particles);

    const glowGeo = new THREE.PlaneGeometry(16, 16);
    this.glowMaterial = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      uniforms: {
        uGlowAlpha: { value: 0.0 },
        uGlowColor: { value: new THREE.Color(0.996, 0.792, 0.341) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMaterial);
    this.glowMesh.lookAt(0, 0, 1);
    this.group.add(this.glowMesh);
  }

  private createSphereGeometry(): THREE.BufferGeometry {
    const geo = new THREE.SphereGeometry(2.5, 39, 37);
    return geo;
  }

  private initParticleData() {
    const positions = new Float32Array(this.PARTICLE_COUNT * 3);
    const opacities = new Float32Array(this.PARTICLE_COUNT);
    const sizes = new Float32Array(this.PARTICLE_COUNT);
    this.particleData = [];

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const normal = new THREE.Vector3(x, y, z).normalize();
      const speed = 0.2 + Math.random() * 0.4;
      const maxLife = 3 + Math.random() * 3;

      this.particleData.push({
        position: new THREE.Vector3(x, y, z),
        velocity: normal.multiplyScalar(speed),
        life: Math.random() * maxLife,
        maxLife,
        size: 2 + Math.random() * 3,
      });

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      opacities[i] = 0;
      sizes[i] = this.particleData[i].size;
    }

    return { positions, opacities, sizes };
  }

  private respawnParticle(p: Particle) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 2.5;
    p.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    const normal = p.position.clone().normalize();
    const speed = 0.2 + Math.random() * 0.4;
    p.velocity.copy(normal.multiplyScalar(speed));
    p.maxLife = 3 + Math.random() * 3;
    p.life = p.maxLife;
    p.size = 2 + Math.random() * 3;
  }

  private computeTargetColor(freq: number): THREE.Color {
    if (freq < 200) {
      const t = freq / 200;
      const c1 = new THREE.Color(0xff6b6b);
      const c2 = new THREE.Color(0xfeca57);
      return c1.lerp(c2, t);
    } else if (freq < 2000) {
      const t = (freq - 200) / 1800;
      const c2 = new THREE.Color(0xfeca57);
      const c3 = new THREE.Color(0xff9ff3);
      return c2.lerp(c3, t);
    } else {
      const t = Math.min((freq - 2000) / 3000, 1);
      const c3 = new THREE.Color(0xff9ff3);
      const c4 = new THREE.Color(0x48dbfb);
      const c5 = new THREE.Color(0x54a0ff);
      return c3.lerp(c4.lerp(c5, t), t);
    }
  }

  update(amplitude: number, frequency: number, delta: number): void {
    this.time += delta;
    this.targetAmplitude = amplitude;
    this.targetFrequency = frequency;

    if (amplitude > 0.05) {
      this.lastActiveTime = this.time;
    }

    const timeSinceActive = (this.time - this.lastActiveTime) * 1000;
    const targetIdle = timeSinceActive > this.IDLE_THRESHOLD ? 1 : 0;
    this.idleAmount += (targetIdle - this.idleAmount) * delta * 0.5;

    const lerpSpeed = 1 - Math.pow(0.05, delta);
    this.smoothAmplitude += (this.targetAmplitude - this.smoothAmplitude) * lerpSpeed;
    this.smoothFrequency += (this.targetFrequency - this.smoothFrequency) * lerpSpeed;

    this.targetColor = this.computeTargetColor(this.smoothFrequency);
    this.currentColor.lerp(this.targetColor, lerpSpeed);

    const glowIntensity = 0.5 + this.smoothAmplitude * 1.0;
    this.material.uniforms.uTime.value = this.time;
    this.material.uniforms.uAmplitude.value = this.smoothAmplitude;
    this.material.uniforms.uFrequency.value = this.smoothFrequency;
    this.material.uniforms.uIdle.value = this.idleAmount;
    this.material.uniforms.uGlowIntensity.value = glowIntensity;

    this.updateParticles(delta);
    this.updateGlow();
  }

  private updateParticles(delta: number): void {
    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const opAttr = this.particleGeometry.getAttribute('aOpacity') as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.getAttribute('aSize') as THREE.BufferAttribute;

    const ampFactor = this.smoothAmplitude * (1 - this.idleAmount);

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const p = this.particleData[i];
      p.life -= delta;

      if (p.life <= 0) {
        if (ampFactor > 0.02) {
          this.respawnParticle(p);
        } else {
          p.life = 0;
          opAttr.setX(i, 0);
          continue;
        }
      }

      const speedMult = 1 + ampFactor * 2;
      p.position.addScaledVector(p.velocity, delta * speedMult);

      const lifeRatio = p.life / p.maxLife;
      const fadeIn = Math.min(1, (p.maxLife - p.life) / 0.5);
      const fadeOut = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1;
      const opacity = fadeIn * fadeOut * (0.3 + ampFactor * 0.5);

      posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
      opAttr.setX(i, opacity);
      sizeAttr.setX(i, p.size * (0.8 + ampFactor * 0.4));
    }

    posAttr.needsUpdate = true;
    opAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    const pColor = this.currentColor.clone();
    if (this.idleAmount > 0.5) {
      pColor.lerp(new THREE.Color(0x2a2a2a), (this.idleAmount - 0.5) * 2);
    }
    this.particleMaterial.uniforms.uParticleColor.value.copy(pColor);
  }

  private updateGlow(): void {
    const ampFactor = this.smoothAmplitude * (1 - this.idleAmount);
    const glowAlpha = ampFactor * 0.3;
    this.glowMaterial.uniforms.uGlowAlpha.value = glowAlpha;

    const glowColor = this.currentColor.clone();
    if (this.idleAmount > 0.5) {
      glowColor.lerp(new THREE.Color(0x2a2a2a), (this.idleAmount - 0.5) * 2);
    }
    this.glowMaterial.uniforms.uGlowColor.value.copy(glowColor);
  }

  getRotationSpeed(): number {
    return 0.1 + this.smoothAmplitude * 0.9 * (1 - this.idleAmount);
  }
}
