export const vertexShader = `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aDistance;

  varying vec3 vColor;
  varying float vDistance;

  uniform float uTime;
  uniform float uTurbulenceStrength;
  uniform float uTurbulenceFrequency;

  void main() {
    vColor = aColor;
    vDistance = aDistance;

    vec3 pos = position;

    float t = uTime * uTurbulenceFrequency;
    float nx = sin(pos.x * 2.3 + t * 1.7) + sin(pos.y * 1.9 + t * 2.3) + sin(pos.z * 2.7 + t * 1.1);
    float ny = sin(pos.x * 1.5 + t * 2.1) + sin(pos.y * 2.5 + t * 1.3) + sin(pos.z * 2.1 + t * 2.7);
    float nz = sin(pos.x * 2.9 + t * 1.5) + sin(pos.y * 1.7 + t * 1.9) + sin(pos.z * 1.3 + t * 2.5);

    pos.x += nx * uTurbulenceStrength * 0.15;
    pos.y += ny * uTurbulenceStrength * 0.15;
    pos.z += nz * uTurbulenceStrength * 0.15;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
  }
`;

export const fragmentShader = `
  varying vec3 vColor;
  varying float vDistance;

  uniform float uAlphaMin;
  uniform float uAlphaMax;
  uniform int uAlphaCurve;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) {
      discard;
    }

    float alpha;
    float t = clamp(vDistance, 0.0, 1.0);

    if (uAlphaCurve == 0) {
      alpha = mix(uAlphaMin, uAlphaMax, t);
    } else if (uAlphaCurve == 1) {
      float sigmoid = 1.0 / (1.0 + exp(-(t - 0.5) * 8.0));
      alpha = mix(uAlphaMin, uAlphaMax, sigmoid);
    } else {
      float gaussian = exp(-pow(t - 0.5, 2.0) * 8.0);
      alpha = mix(uAlphaMin, uAlphaMax, gaussian * 1.2);
    }

    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    float shape = core * 0.8 + glow * glow * 0.4;
    alpha *= shape;

    vec3 color = vColor * (0.8 + core * 0.4);

    gl_FragColor = vec4(color, alpha);
  }
`;
