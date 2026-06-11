uniform vec3 uAtmosphereColor;
uniform float uIntensity;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;

void main() {
  float fresnel = 1.0 - dot(vNormal, vViewDir);
  fresnel = pow(fresnel, 3.0) * uIntensity;
  float rim = smoothstep(0.0, 1.0, fresnel);
  gl_FragColor = vec4(uAtmosphereColor, rim * 0.7);
}
