import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import SimplexNoise from 'simplex-noise';
import { ParticleSystem } from './particleSystem';

const simplex = new SimplexNoise();
const noise3D = (x: number, y: number, z: number) => simplex.noise3D(x, y, z);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let particleSystem: ParticleSystem;
let starsMesh: THREE.Points;
let accretionDisk: THREE.Mesh;
let statsEl: HTMLElement;

let lastTime = performance.now();
let frameCount = 0;
let fps = 0;
let fpsAccumulator = 0;
const clock = new THREE.Clock();

let mouseX = 0;
let mouseY = 0;
let isDragging = false;
let lastDragX = 0;
let lastDragY = 0;
let dragDirX = 0;
let dragDirY = 0;

let displayMode: 'normal' | 'xray' = 'normal';

function init() {
  const app = document.getElementById('app');
  if (!app) throw new Error('App container not found');

  statsEl = document.getElementById('stats')!;

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 8, 18);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  app.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 6;
  controls.maxDistance = 60;
  controls.enablePan = false;

  createBlackHole();
  createAccretionDisk();
  createStars();

  particleSystem = new ParticleSystem(scene);

  setupEventListeners();

  animate();
}

function createBlackHole() {
  const geometry = new THREE.SphereGeometry(1.5, 64, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: false
  });
  const blackHole = new THREE.Mesh(geometry, material);
  scene.add(blackHole);
}

function createAccretionDisk() {
  const geometry = new THREE.TorusGeometry(3.5, 1.5, 48, 192);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uInnerRadius: { value: 2.0 },
      uOuterRadius: { value: 5.0 },
      uMode: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying float vRadius;
      void main() {
        vUv = uv;
        vPosition = position;
        vRadius = length(position.xy);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uInnerRadius;
      uniform float uOuterRadius;
      uniform int uMode;
      varying vec2 vUv;
      varying vec3 vPosition;
      varying float vRadius;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        float t = (vRadius - uInnerRadius) / (uOuterRadius - uInnerRadius);
        t = clamp(t, 0.0, 1.0);

        float angle = atan(vPosition.y, vPosition.x);

        float noiseScale = 3.0;
        float noise1 = snoise(vec3(
          cos(angle) * vRadius * noiseScale,
          sin(angle) * vRadius * noiseScale,
          uTime * 0.3
        ));
        float noise2 = snoise(vec3(
          cos(angle * 2.0) * vRadius * noiseScale * 1.5,
          sin(angle * 2.0) * vRadius * noiseScale * 1.5,
          uTime * 0.5 + 100.0
        ));
        float turbulence = (noise1 * 0.6 + noise2 * 0.4);
        float flicker = 0.75 + 0.25 * turbulence;

        vec3 colorInner = vec3(1.0, 1.0, 1.0);
        vec3 colorMid = vec3(1.0, 0.45, 0.15);
        vec3 colorOuter = vec3(0.55, 0.0, 0.0);

        vec3 diskColor;
        if (t < 0.5) {
          diskColor = mix(colorInner, colorMid, t * 2.0);
        } else {
          diskColor = mix(colorMid, colorOuter, (t - 0.5) * 2.0);
        }
        diskColor *= flicker;

        float verticalFade = 1.0 - smoothstep(0.2, 0.5, abs(vPosition.z));
        float radialFade = smoothstep(uInnerRadius, uInnerRadius + 0.3, vRadius)
          * (1.0 - smoothstep(uOuterRadius - 0.3, uOuterRadius, vRadius));

        float alpha = verticalFade * radialFade * 0.9;

        if (uMode == 1) {
          float brightness = 0.3 + 0.7 * flicker;
          diskColor = vec3(0.3, 0.6, 0.9) * brightness;
          alpha = verticalFade * radialFade * 0.5;
        }

        gl_FragColor = vec4(diskColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  accretionDisk = new THREE.Mesh(geometry, material);
  accretionDisk.rotation.x = -Math.PI / 2;
  scene.add(accretionDisk);
}

function createStars() {
  const starCount = 5000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const basePositions = new Float32Array(starCount * 3);

  const colorStart = new THREE.Color(0xffffff);
  const colorEnd = new THREE.Color(0xc8d0e8);

  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 60 + Math.random() * 40;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    basePositions[i * 3] = x;
    basePositions[i * 3 + 1] = y;
    basePositions[i * 3 + 2] = z;

    const colorMix = Math.random();
    const color = colorStart.clone().lerp(colorEnd, colorMix);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 0.04 + Math.random() * 0.06;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  (geometry as any).basePositions = basePositions;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uVisible: { value: 1.0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      uniform float uVisible;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uVisible;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = (1.0 - dist * 2.0) * uVisible;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  starsMesh = new THREE.Points(geometry, material);
  scene.add(starsMesh);
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      particleSystem.triggerLensFlare();
    } else if (e.key === '1') {
      displayMode = 'normal';
      particleSystem.setMode('normal');
      updateModeVisuals();
    } else if (e.key === '2') {
      displayMode = 'xray';
      particleSystem.setMode('xray');
      updateModeVisuals();
    }
  });

  const canvas = renderer.domElement;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      isDragging = true;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

    if (isDragging) {
      dragDirX = e.clientX - lastDragX;
      dragDirY = e.clientY - lastDragY;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      particleSystem.setDistortion(true, new THREE.Vector2(dragDirX, dragDirY).multiplyScalar(0.02));
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    particleSystem.setDistortion(false, new THREE.Vector2(0, 0));
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    particleSystem.setDistortion(false, new THREE.Vector2(0, 0));
  });
}

function updateModeVisuals() {
  const diskMat = accretionDisk.material as THREE.ShaderMaterial;
  diskMat.uniforms.uMode.value = displayMode === 'xray' ? 1 : 0;

  const starsMat = starsMesh.material as THREE.ShaderMaterial;
  starsMat.uniforms.uVisible.value = displayMode === 'xray' ? 0 : 1;
}

function updateStars(dt: number) {
  const positions = starsMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const basePositions = (starsMesh.geometry as any).basePositions as Float32Array;
  const driftSpeed = 0.008;

  for (let i = 0; i < positions.count; i++) {
    const bx = basePositions[i * 3];
    const by = basePositions[i * 3 + 1];
    const bz = basePositions[i * 3 + 2];

    const noiseVal = noise3D(bx * 0.01, by * 0.01, performance.now() * 0.00005);
    const noiseVal2 = noise3D(bx * 0.015 + 100, bz * 0.015, performance.now() * 0.00003);

    positions.setX(i, bx + mouseX * 0.8 + noiseVal * 0.5);
    positions.setY(i, by + mouseY * 0.8 + noiseVal2 * 0.5);
    positions.setZ(i, bz + noiseVal * 0.3);
  }
  positions.needsUpdate = true;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateStats(dt: number) {
  frameCount++;
  fpsAccumulator += dt;

  if (fpsAccumulator >= 0.5) {
    fps = Math.round(frameCount / fpsAccumulator);
    frameCount = 0;
    fpsAccumulator = 0;
  }

  const modeName = displayMode === 'normal' ? 'Normal Mode' : 'X-Ray Mode';
  statsEl.textContent = `Particles: ${particleSystem.getParticleCount()}\nFPS: ${fps}\n${modeName}`;
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  const elapsed = clock.getElapsedTime();

  controls.update();

  const diskMat = accretionDisk.material as THREE.ShaderMaterial;
  diskMat.uniforms.uTime.value = elapsed;

  updateStars(dt);

  particleSystem.update(dt);

  updateStats(dt);

  renderer.render(scene, camera);
}

init();
