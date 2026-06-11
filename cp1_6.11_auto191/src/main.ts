import * as THREE from 'three';
import gsap from 'gsap';
import { createSceneSetup } from './sceneSetup';
import { AuroraSystem } from './auroraSystem';
import { IceCrystalSystem } from './iceCrystals';
import { Controls } from './controls';

const STAR_COUNT = 2500;
const STAR_MIN_RADIUS = 200;
const STAR_MAX_RADIUS = 300;
const TWINKLE_INTERVAL_MS = 300;

function createStarField(scene: THREE.Scene): {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  points: THREE.Points;
  twinkleState: Float32Array;
} {
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const twinkleState = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    const radius = STAR_MIN_RADIUS + Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    sizes[i] = 0.5 + Math.random() * 1.0;
    twinkleState[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return { geometry, material, points, twinkleState };
}

function createIceGround(scene: THREE.Scene): THREE.Mesh {
  const groundGeometry = new THREE.PlaneGeometry(200, 200, 32, 32);
  const groundMaterial = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        float highlight = sin(vUv.x * 20.0 + uTime * 0.5) * sin(vUv.y * 20.0 + uTime * 0.3) * 0.5 + 0.5;
        highlight = pow(highlight, 3.0) * 0.15;
        vec3 baseColor = vec3(0.102, 0.165, 0.227);
        vec3 highlightColor = vec3(0.3, 0.45, 0.55);
        vec3 finalColor = mix(baseColor, highlightColor, highlight);
        float dist = length(vUv - vec2(0.5));
        float fade = 1.0 - smoothstep(0.3, 0.5, dist);
        gl_FragColor = vec4(finalColor, 0.4 * fade);
      }
    `,
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  return ground;
}

function main(): void {
  const { scene, camera, renderer } = createSceneSetup();

  const auroraSystem = new AuroraSystem(scene);
  const iceCrystals = new IceCrystalSystem(scene);
  const controls = new Controls(camera, renderer, auroraSystem);
  const stars = createStarField(scene);
  const ground = createIceGround(scene);

  auroraSystem.startRevealAnimation();

  let lastTwinkleTime = 0;
  const clock = new THREE.Clock();

  function animate(): void {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    auroraSystem.update(time);
    iceCrystals.update(time);
    controls.update();

    if (ground.material instanceof THREE.ShaderMaterial) {
      ground.material.uniforms.uTime.value = time;
    }

    const now = performance.now();
    if (now - lastTwinkleTime > TWINKLE_INTERVAL_MS) {
      lastTwinkleTime = now;
      const starOpacity = 0.4 + Math.random() * 0.6;
      stars.material.opacity = starOpacity;

      const posAttr = stars.geometry.getAttribute('position') as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      const twinkleCount = Math.floor(STAR_COUNT * 0.05);
      for (let j = 0; j < twinkleCount; j++) {
        const idx = Math.floor(Math.random() * STAR_COUNT);
        const currentSize = 0.5 + Math.random() * 1.0;
        stars.twinkleState[idx] = currentSize;
      }
    }

    renderer.render(scene, camera);
  }

  animate();
}

main();
