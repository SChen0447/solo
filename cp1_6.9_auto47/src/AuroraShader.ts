import * as THREE from 'three';

export const auroraUniforms: {
  time: { value: number };
  speedFactor: { value: number };
  pulseIntensity: { value: number };
  highlightPositions: { value: THREE.Vector3[] };
  highlightColors: { value: THREE.Color[] };
  highlightCount: { value: number };
} = {
  time: { value: 0 },
  speedFactor: { value: 3 },
  pulseIntensity: { value: 0 },
  highlightPositions: { value: [] },
  highlightColors: { value: [] },
  highlightCount: { value: 0 }
};

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = `
  uniform float time;
  uniform float speedFactor;
  uniform float pulseIntensity;
  uniform vec3 highlightPositions[16];
  uniform vec3 highlightColors[16];
  uniform int highlightCount;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

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
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
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
    float speed = 0.005 + (speedFactor - 1.0) * 0.01375;
    float t = time * speed * 60.0;

    vec3 uv3 = vec3(vUv * 3.0, t * 0.3);
    float n1 = snoise(uv3) * 0.5 + 0.5;
    float n2 = snoise(uv3 * 2.0 + vec3(100.0)) * 0.5 + 0.5;
    float aurora = n1 * 0.6 + n2 * 0.4;

    float wave = sin(vUv.x * 8.0 + t * 0.5) * 0.5 + 0.5;
    aurora *= mix(0.5, 1.0, wave);

    float topMask = smoothstep(0.0, 0.3, vUv.y);
    float bottomMask = 1.0 - smoothstep(0.7, 1.0, vUv.y);
    aurora *= topMask * bottomMask;

    float colorPhase = sin(time * 0.3) * 0.5 + 0.5;
    vec3 colorA = vec3(0.0, 1.0, 0.533);
    vec3 colorB = vec3(0.0, 0.533, 1.0);
    vec3 baseColor = mix(colorA, colorB, colorPhase);

    float highlight = 0.0;
    vec3 highlightColorSum = vec3(0.0);
    for (int i = 0; i < 16; i++) {
      if (i >= highlightCount) break;
      vec3 hp = highlightPositions[i];
      vec3 hc = highlightColors[i];
      float dist = length(vWorldPos.xz - hp.xz);
      float yDiff = abs(vWorldPos.y - (hp.y + 2.0));
      float influence = exp(-dist * 2.0) * exp(-yDiff * 0.8);
      highlight = max(highlight, influence);
      highlightColorSum += hc * influence;
    }

    float alpha = aurora * (0.4 + 0.3 * sin(time * 0.2));
    alpha = mix(alpha, 0.85, highlight);
    alpha = clamp(alpha, 0.0, 0.95);

    vec3 finalColor = baseColor;
    if (highlight > 0.01) {
      finalColor = mix(finalColor, highlightColorSum / max(highlight, 0.001), highlight * 0.7);
    }

    if (pulseIntensity > 0.01) {
      vec3 pulseColor = vec3(1.0);
      finalColor = mix(finalColor, pulseColor, pulseIntensity);
      alpha = min(alpha + pulseIntensity * 0.3, 1.0);
    }

    finalColor *= 0.8 + aurora * 0.6;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export function createAuroraMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: auroraUniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

export function setAuroraSpeed(level: number): void {
  auroraUniforms.speedFactor.value = Math.max(1, Math.min(5, level));
}

export function setAuroraPulse(intensity: number): void {
  auroraUniforms.pulseIntensity.value = Math.max(0, Math.min(1, intensity));
}

export function updateHighlights(positions: THREE.Vector3[], colors: THREE.Color[]): void {
  const count = Math.min(positions.length, 16);
  auroraUniforms.highlightCount.value = count;
  auroraUniforms.highlightPositions.value = positions.slice(0, count);
  auroraUniforms.highlightColors.value = colors.slice(0, count);
}

export function updateAuroraTime(delta: number): void {
  auroraUniforms.time.value += delta;
}
