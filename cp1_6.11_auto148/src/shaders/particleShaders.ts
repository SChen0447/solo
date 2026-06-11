const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aLife;
  attribute float aSpeed;
  attribute vec3 aVelocity;
  attribute vec3 aBasePosition;
  attribute float aPhase;
  attribute float aSeed;

  uniform float uTime;
  uniform float uTimeScale;
  uniform float uWindSpeed;
  uniform vec3 uWindDirection;
  uniform float uTurbulence;
  uniform float uSizeMultiplier;
  uniform float uOpacityBoost;

  varying float vLife;
  varying float vAlpha;
  varying float vSeed;

  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vLife = aLife;
    vSeed = aSeed;

    float time = uTime * uTimeScale;
    float lifeTime = aLife + time * aSpeed;
    lifeTime = mod(lifeTime, 1.0);

    vec3 pos = aBasePosition;

    float fallSpeed = 0.5 + aSpeed * 0.5;
    pos.y -= fallTime * fallSpeed * 3.0 * uTimeScale;

    float waveAmplitude = uWindSpeed * 0.3 * uTurbulence;
    float waveFrequency = 2.0;
    pos.x += sin(time * waveFrequency + aPhase) * waveAmplitude;
    pos.z += cos(time * waveFrequency * 0.7 + aPhase * 1.3) * waveAmplitude * 0.5;

    pos += uWindDirection * uWindSpeed * 0.2 * fallTime;

    float noiseVal = noise(vec2(aSeed, time * 0.5));
    pos.x += (noiseVal - 0.5) * uTurbulence * 0.2;
    pos.z += (noiseVal - 0.5) * uTurbulence * 0.2;

    float alpha = 1.0;
    if (lifeTime < 0.1) {
      alpha = lifeTime / 0.1;
    } else if (lifeTime > 0.85) {
      alpha = (1.0 - lifeTime) / 0.15;
    }
    alpha = clamp(alpha, 0.0, 1.0);
    vAlpha = alpha * (1.0 + uOpacityBoost);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float size = aSize * uSizeMultiplier * (300.0 / -mvPosition.z);
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColorEnd;

  varying float vLife;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) {
      discard;
    }

    float alpha = smoothstep(0.5, 0.0, dist);
    alpha *= alpha;
    alpha *= vAlpha;

    vec3 color = mix(uColor, uColorEnd, vSeed);
    float brightness = 0.8 + vSeed * 0.4;
    color *= brightness;

    float glow = smoothstep(0.5, 0.2, dist) * 0.5;
    color += uColor * glow;

    gl_FragColor = vec4(color, alpha);
  }
`;

export { vertexShader, fragmentShader };
