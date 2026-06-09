import * as THREE from 'three';

export function createGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(30, 30, 128, 128);
  geometry.rotateX(-Math.PI / 2);

  const vertexShader = `
    varying vec2 vUv;
    varying float vHeight;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float freq = 0.02;
      float amp = 0.1;
      pos.y += sin(pos.x * freq * 6.28318) * amp;
      pos.y += sin(pos.z * freq * 6.28318) * amp * 0.8;
      pos.y += sin((pos.x + pos.z) * freq * 3.14159) * amp * 0.5;
      vHeight = pos.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    varying float vHeight;
    void main() {
      vec3 color1 = vec3(0.298, 0.686, 0.314);
      vec3 color2 = vec3(0.180, 0.490, 0.196);
      float t = clamp((vHeight + 0.1) / 0.2, 0.0, 1.0);
      vec3 color = mix(color2, color1, t);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide
  });

  const ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  return ground;
}
