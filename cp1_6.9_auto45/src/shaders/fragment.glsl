// ============================================
// 片元着色器 - 流体颜色混合与发光效果
// ============================================
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
