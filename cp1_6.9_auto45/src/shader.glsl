// ============================================
// 熔岩灯 GLSL 着色器
// 包含顶点着色器（流体扭曲）和片元着色器（颜色混合/发光）
// ============================================

// ---------- 顶点着色器 ----------
export const vertexShader = `
uniform float uTime;
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform float uTemperature;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;

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
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vUv = uv;
  vNormal = normal;
  vPosition = position;

  float tempFactor = 0.5 + (uTemperature - 20.0) / 120.0;
  float speed = uTime * (0.8 + tempFactor * 0.8);

  vec3 noisePos = position * uNoiseScale + vec3(speed * 0.3, speed * 0.5, speed * 0.2);
  float noise1 = snoise(noisePos);
  float noise2 = snoise(noisePos * 2.0 + 100.0) * 0.5;
  float noise3 = snoise(noisePos * 4.0 + 200.0) * 0.25;
  float displacement = (noise1 + noise2 + noise3) * uNoiseStrength * tempFactor;

  vec3 newPosition = position + normal * displacement;
  vec4 worldPos = modelMatrix * vec4(newPosition, 1.0);
  vWorldPosition = worldPos.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

// ---------- 片元着色器 ----------
export const fragmentShader = `
uniform vec3 uColor;
uniform vec3 uColorTarget;
uniform float uBlendFactor;
uniform float uTime;
uniform float uGlowIntensity;
uniform float uTemperature;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;

void main() {
  vec3 blendedColor = mix(uColor, uColorTarget, uBlendFactor);

  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.5);

  float tempGlow = (uTemperature - 20.0) / 60.0;
  float glow = fresnel * (0.3 + tempGlow * 0.5) * uGlowIntensity;

  vec3 finalColor = blendedColor + blendedColor * glow;

  float pulse = sin(uTime * 2.0 + vPosition.y * 3.0) * 0.03 + 0.97;
  finalColor *= pulse;

  float alpha = 0.85 + glow * 0.15;

  gl_FragColor = vec4(finalColor, alpha);
}
`;
