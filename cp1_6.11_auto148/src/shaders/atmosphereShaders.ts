const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uTropicalColor;
  uniform vec3 uTemperateColor;
  uniform vec3 uPolarColor;
  uniform float uAtmosphereIntensity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    float latitude = vPosition.y / 2.0;

    vec3 surfaceColor;
    float tropicalZone = 0.5;
    float temperateZone = 0.8;

    float absLat = abs(latitude);

    if (absLat < tropicalZone) {
      surfaceColor = uTropicalColor;
    } else if (absLat < temperateZone) {
      float t = (absLat - tropicalZone) / (temperateZone - tropicalZone);
      vec3 midColor = mix(uTropicalColor, uTemperateColor, 0.5);
      surfaceColor = mix(midColor, uTemperateColor, smoothstep(0.0, 1.0, t));
    } else {
      float t = (absLat - temperateZone) / (1.0 - temperateZone);
      surfaceColor = mix(uTemperateColor, uPolarColor, smoothstep(0.0, 1.0, t));
    }

    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    vec3 atmosphereColor = vec3(0.4, 0.6, 1.0) * uAtmosphereIntensity;
    vec3 finalColor = surfaceColor + atmosphereColor * fresnel * 0.5;

    float rim = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);
    finalColor += vec3(0.3, 0.5, 0.9) * rim * uAtmosphereIntensity;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const glowVertexShader = /* glsl */ `
  varying vec3 vNormal;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragmentShader = /* glsl */ `
  uniform vec3 uGlowColor;
  uniform float uGlowIntensity;

  varying vec3 vNormal;

  void main() {
    float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    vec3 color = uGlowColor * intensity * uGlowIntensity;
    gl_FragColor = vec4(color, intensity * 0.8);
  }
`;

export { 
  atmosphereVertexShader, 
  atmosphereFragmentShader,
  glowVertexShader,
  glowFragmentShader
};
