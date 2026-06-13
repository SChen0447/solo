import * as THREE from 'three';
import type { StarData } from './galaxy';

const vertexShader = `
  uniform float uTime;
  uniform float uSpeedMultiplier;
  uniform float uPointSize;
  uniform float uOpacity;

  attribute float aDistance;
  attribute float aAngle;
  attribute vec3 aColor;
  attribute float aSize;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;

    float angularSpeed = uSpeedMultiplier * 0.3 / (aDistance * 0.05 + 0.3);
    float currentAngle = aAngle + uTime * angularSpeed;

    float x = aDistance * cos(currentAngle);
    float z = aDistance * sin(currentAngle);
    vec3 pos = vec3(x, position.y, z);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPointSize * (200.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float distNorm = aDistance / 50.0;
    vAlpha = (1.0 - distNorm * 0.5) * uOpacity;
    vAlpha = clamp(vAlpha, 0.05, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float core = 1.0 - smoothstep(0.0, 0.15, d);
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    float alpha = (core * 0.8 + glow * 0.5) * vAlpha;

    vec3 col = vColor + vec3(core * 0.3);
    gl_FragColor = vec4(col, alpha);
  }
`;

export interface StarSystem {
  mesh: THREE.Points;
  material: THREE.ShaderMaterial;
  update(speedMultiplier: number, deltaTime: number): void;
  dispose(): void;
  setOpacity(value: number): void;
}

export function createStarSystem(scene: THREE.Scene, data: StarData): StarSystem {
  const geometry = new THREE.BufferGeometry();
  const count = data.positions.length / 3;

  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
  geometry.setAttribute('aDistance', new THREE.BufferAttribute(data.distances, 1));
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(data.angles, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0.0 },
      uSpeedMultiplier: { value: 1.0 },
      uPointSize: { value: 1.0 },
      uOpacity: { value: 1.0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Points(geometry, material);
  scene.add(mesh);

  return {
    mesh,
    material,
    update(speedMultiplier: number, deltaTime: number) {
      material.uniforms.uTime.value += deltaTime;
      material.uniforms.uSpeedMultiplier.value = speedMultiplier;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      scene.remove(mesh);
    },
    setOpacity(value: number) {
      material.uniforms.uOpacity.value = value;
    },
  };
}
