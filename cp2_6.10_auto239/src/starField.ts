import * as THREE from 'three';

export function createStarField(): THREE.Points {
  const particleCount = 2000;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const radius = 500 + Math.random() * 500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    const colorT = Math.random();
    colors[i3] = 1;
    colors[i3 + 1] = 1 - colorT * 0.2;
    colors[i3 + 2] = 1 - colorT * 0.4;

    sizes[i] = 1 + Math.random() * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  const stars = new THREE.Points(geometry, material);
  stars.userData.twinkleSpeed = new Float32Array(particleCount);
  stars.userData.twinklePhase = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    stars.userData.twinkleSpeed[i] = 0.5 + Math.random() * 2;
    stars.userData.twinklePhase[i] = Math.random() * Math.PI * 2;
  }

  return stars;
}

export function updateStarField(stars: THREE.Points, time: number): void {
  const sizes = stars.geometry.attributes.size as THREE.BufferAttribute;
  const twinkleSpeed = stars.userData.twinkleSpeed as Float32Array;
  const twinklePhase = stars.userData.twinklePhase as Float32Array;

  for (let i = 0; i < sizes.count; i++) {
    const baseSize = 1 + (i % 2);
    const twinkle = Math.sin(time * twinkleSpeed[i] + twinklePhase[i]);
    sizes.array[i] = baseSize + twinkle * 0.5;
  }
  sizes.needsUpdate = true;
}
