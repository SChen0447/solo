varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPosition.xyz);
  vUv = uv;
  gl_Position = projectionMatrix * mvPosition;
}
