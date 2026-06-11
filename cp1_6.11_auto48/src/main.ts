import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import gsap from 'gsap';

import { SimulationParams } from './simulation';
import { createThermalVent, ThermalVentSystem } from './thermalVent';
import { createTemperatureField, TemperatureFieldSystem } from './temperatureField';
import { createUIPanel, createMobileToggle, VentData, UIPanelSystem } from './uiPanel';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let clock: THREE.Clock;

let thermalVent: ThermalVentSystem;
let temperatureField: TemperatureFieldSystem;
let uiPanel: UIPanelSystem;

let worker: Worker;
let currentParticlesData: Float32Array;

let pane: Pane;
const params = {
  temperature: 300,
  currentStrength: 2,
  particleCount: 1250
};

let smoothedParams: SimulationParams = {
  temperature: 300,
  currentStrength: 2,
  particleCount: 1250,
  maxParticles: 2000
};

let ambientParticles: THREE.Points;
let seaFloor: THREE.Mesh;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

let stats = {
  avgVelocity: 0,
  diffusionRadius: 0,
  currentDensity: 0
};

const loadingScreen = document.getElementById('loading-screen')!;
const container = document.getElementById('canvas-container')!;

const init = async (): Promise<void> => {
  initThree();
  initLights();
  initAmbientParticles();
  initSeaFloor();

  thermalVent = createThermalVent();
  scene.add(thermalVent.group);

  temperatureField = createTemperatureField();
  scene.add(temperatureField.group);

  uiPanel = createUIPanel();
  createMobileToggle();

  initWorker();
  initControls();
  initTweakpane();
  initInteractions();

  window.addEventListener('resize', onResize);
  onResize();

  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 800);
  }, 800);

  clock.start();
  animate();
};

const initThree = (): void => {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1628);
  scene.fog = new THREE.FogExp2(0x0a1628, 0.008);

  const fov = window.innerWidth < 768 ? 65 : 55;
  camera = new THREE.PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(35, 28, 45);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
};

const initLights = (): void => {
  const ambient = new THREE.AmbientLight(0x1a3a5c, 0.6);
  scene.add(ambient);

  const hemiLight = new THREE.HemisphereLight(0x1e90ff, 0x0a1628, 0.4);
  scene.add(hemiLight);

  const mainPointLight = new THREE.PointLight(0x39ff14, 0.8, 120, 1.5);
  mainPointLight.position.set(0, 35, 0);
  scene.add(mainPointLight);

  const fillLight = new THREE.PointLight(0x1e90ff, 0.5, 100, 2);
  fillLight.position.set(-40, 20, -30);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0xff4500, 0.6, 80, 1.8);
  rimLight.position.set(30, 15, 25);
  scene.add(rimLight);
};

const initAmbientParticles = (): void => {
  const count = 1000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = Math.random() * 120 - 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

    const colorChoice = Math.random();
    if (colorChoice < 0.3) {
      colors[i * 3] = 0.22;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 0.08;
    } else if (colorChoice < 0.6) {
      colors[i * 3] = 0.12;
      colors[i * 3 + 1] = 0.56;
      colors[i * 3 + 2] = 1;
    } else {
      colors[i * 3] = 0.7;
      colors[i * 3 + 1] = 0.85;
      colors[i * 3 + 2] = 1;
    }

    sizes[i] = Math.random() * 1.5 + 0.3;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float time;
      void main() {
        vColor = color;
        vec3 pos = position;
        pos.x += sin(time * 0.3 + position.y * 0.05) * 0.5;
        pos.z += cos(time * 0.25 + position.x * 0.05) * 0.5;
        pos.y += sin(time * 0.2 + position.x * 0.03 + position.z * 0.03) * 0.3;
        vAlpha = 0.3 + sin(time + position.x * 0.1) * 0.2;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = (1.0 - dist * 2.0) * vAlpha;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  ambientParticles = new THREE.Points(geometry, material);
  scene.add(ambientParticles);
};

const initSeaFloor = (): void => {
  const size = 200;
  const segments = 80;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const positions = geometry.attributes.position.array as Float32Array;
  const colors = new Float32Array(positions.length);

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 1];
    const distFromCenter = Math.sqrt(x * x + z * z);

    let height = 0;
    height += Math.sin(x * 0.08) * Math.cos(z * 0.08) * 2.5;
    height += Math.sin(x * 0.2 + 1.5) * Math.cos(z * 0.15) * 1.2;
    height += Math.sin(x * 0.03 + z * 0.05) * 4;
    height -= distFromCenter * 0.02;

    const ventRim = Math.max(0, 15 - distFromCenter);
    height += ventRim * 0.4;
    if (distFromCenter < 12) {
      height -= (12 - distFromCenter) * 0.35;
    }

    positions[i + 2] = height;

    const depthFactor = Math.min(1, distFromCenter / 80);
    const heatFactor = Math.max(0, 1 - distFromCenter / 25);

    const baseR = 0.03 + depthFactor * 0.02;
    const baseG = 0.06 + depthFactor * 0.04;
    const baseB = 0.1 + depthFactor * 0.06;

    const r = baseR + heatFactor * 0.15;
    const g = baseG + heatFactor * 0.08;
    const b = baseB + heatFactor * 0.02;

    colors[i] = r;
    colors[i + 1] = g;
    colors[i + 2] = b;
  }

  geometry.computeVertexNormals();
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.02,
    side: THREE.DoubleSide,
    flatShading: false
  });

  seaFloor = new THREE.Mesh(geometry, material);
  seaFloor.rotation.x = -Math.PI / 2;
  scene.add(seaFloor);

  addRocks();
};

const addRocks = (): void => {
  const rockPositions = [
    { x: 18, z: -12, s: 1.8 },
    { x: -22, z: 8, s: 2.2 },
    { x: 28, z: 22, s: 1.5 },
    { x: -15, z: -28, s: 2.5 },
    { x: 35, z: -5, s: 1.2 },
    { x: -30, z: -15, s: 1.9 },
    { x: 8, z: 30, s: 1.6 },
    { x: -8, z: 35, s: 2.1 }
  ];

  for (const rp of rockPositions) {
    const geo = new THREE.DodecahedronGeometry(rp.s, 0);
    const geoPos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < geoPos.length; i += 3) {
      geoPos[i] += (Math.random() - 0.5) * 0.3;
      geoPos[i + 1] += (Math.random() - 0.5) * 0.3;
      geoPos[i + 2] += (Math.random() - 0.5) * 0.3;
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.58 + Math.random() * 0.05, 0.2, 0.1 + Math.random() * 0.05),
      roughness: 0.9,
      metalness: 0.05
    });

    const rock = new THREE.Mesh(geo, mat);
    const raycasterTemp = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, -1, 0);
    const origin = new THREE.Vector3(rp.x, 50, rp.z);
    raycasterTemp.set(origin, direction);
    const intersects = raycasterTemp.intersectObject(seaFloor);

    if (intersects.length > 0) {
      rock.position.copy(intersects[0].point);
      rock.position.y += rp.s * 0.2;
    } else {
      rock.position.set(rp.x, 0, rp.z);
    }

    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    scene.add(rock);
  }
};

const initWorker = (): void => {
  const workerBlob = new Blob([`
    const MAX_PARTICLES = 2000;
    const FADE_HEIGHT = 100;
    const BASE_TEMPERATURE = 4;

    const particles = [];
    let params = {
      temperature: 300,
      currentStrength: 2,
      particleCount: 1250,
      maxParticles: MAX_PARTICLES
    };
    let time = 0;
    const ventPosition = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push({
        id: i, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        temperature: BASE_TEMPERATURE, life: 0, maxLife: 1,
        active: false, driftAngle: 0, driftPhase: 0
      });
    }

    const spawnParticle = () => {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 2.5;
          p.x = ventPosition.x + Math.cos(angle) * radius;
          p.y = ventPosition.y + 8 + Math.random() * 2;
          p.z = ventPosition.z + Math.sin(angle) * radius;

          const tempFactor = (params.temperature - 200) / 200;
          p.vy = 0.8 + tempFactor * 1.2 + Math.random() * 0.3;
          p.vx = (Math.random() - 0.5) * 0.1;
          p.vz = (Math.random() - 0.5) * 0.1;

          p.temperature = params.temperature * (0.85 + Math.random() * 0.15);
          p.life = 1;
          p.maxLife = FADE_HEIGHT / p.vy;
          p.active = true;
          p.driftAngle = (Math.random() - 0.5) * Math.PI / 2;
          p.driftPhase = Math.random() * Math.PI * 2;
          return;
        }
      }
    };

    const update = (deltaTime) => {
      time += deltaTime;
      const dt = Math.min(deltaTime, 0.05);

      let activeCount = 0;
      let totalVelocity = 0;
      let maxRadius = 0;

      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;

        p.driftPhase += dt * 0.8;
        const sCurve = Math.sin(p.driftPhase) * params.currentStrength * 0.5;
        const cosA = Math.cos(p.driftAngle);
        const sinA = Math.sin(p.driftAngle);

        const buoyancyFactor = (p.temperature - BASE_TEMPERATURE) / params.temperature;
        p.vy += buoyancyFactor * 0.02;
        p.vy = Math.min(p.vy, 3.5);

        const driftX = cosA * sCurve * dt * 1.2;
        const driftZ = sinA * sCurve * dt * 1.2;
        p.vx += driftX + (Math.random() - 0.5) * params.currentStrength * 0.05;
        p.vz += driftZ + (Math.random() - 0.5) * params.currentStrength * 0.05;

        const drag = 0.995;
        p.vx *= drag;
        p.vz *= drag;

        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.z += p.vz * dt * 60;

        const heightRatio = Math.min(p.y / FADE_HEIGHT, 1);
        p.temperature = BASE_TEMPERATURE + (params.temperature - BASE_TEMPERATURE) * (1 - heightRatio * 0.9);
        p.life = 1 - heightRatio;

        const distFromCenter = Math.sqrt(p.x * p.x + p.z * p.z);
        if (distFromCenter > maxRadius) maxRadius = distFromCenter;

        totalVelocity += Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
        activeCount++;

        if (p.life <= 0 || p.y > FADE_HEIGHT + 10) {
          p.active = false;
        }
      }

      const targetCount = params.particleCount;
      const spawnRate = Math.max(1, Math.floor((targetCount - activeCount) * 0.15 + 5));
      for (let s = 0; s < spawnRate && activeCount < targetCount; s++) {
        spawnParticle();
      }

      const particlesData = new Float32Array(MAX_PARTICLES * 8);
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        const offset = i * 8;
        particlesData[offset] = p.x;
        particlesData[offset + 1] = p.y;
        particlesData[offset + 2] = p.z;
        particlesData[offset + 3] = p.temperature;
        particlesData[offset + 4] = p.life;
        particlesData[offset + 5] = p.active ? 1 : 0;
        particlesData[offset + 6] = p.vy;
        particlesData[offset + 7] = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
      }

      return {
        particlesData,
        avgVelocity: activeCount > 0 ? totalVelocity / activeCount : 0,
        diffusionRadius: maxRadius,
        currentDensity: activeCount
      };
    };

    self.onmessage = (e) => {
      const msg = e.data;
      switch (msg.type) {
        case 'init':
          break;
        case 'update':
          if (msg.deltaTime !== undefined) {
            const result = update(msg.deltaTime);
            self.postMessage({ type: 'update', result }, [result.particlesData.buffer]);
          }
          break;
        case 'setParams':
          if (msg.params) {
            if (msg.params.temperature !== undefined) params.temperature = msg.params.temperature;
            if (msg.params.currentStrength !== undefined) params.currentStrength = msg.params.currentStrength;
            if (msg.params.particleCount !== undefined) params.particleCount = msg.params.particleCount;
          }
          break;
      }
    };
  `], { type: 'application/javascript' });

  const workerUrl = URL.createObjectURL(workerBlob);
  worker = new Worker(workerUrl);

  worker.postMessage({ type: 'init' });

  worker.onmessage = (e: MessageEvent) => {
    if (e.data.type === 'update') {
      currentParticlesData = new Float32Array(e.data.result.particlesData);
      stats.avgVelocity = e.data.result.avgVelocity;
      stats.diffusionRadius = e.data.result.diffusionRadius;
      stats.currentDensity = e.data.result.currentDensity;
    }
  };

  currentParticlesData = new Float32Array(2000 * 8);
};

const initControls = (): void => {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 150;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.15;
  controls.target.set(0, 12, 0);
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.6;
  controls.enablePan = true;
};

const initTweakpane = (): void => {
  const paneContainer = document.getElementById('tweakpane-container')!;

  pane = new Pane({
    title: '深海热泉控制',
    container: paneContainer,
    expanded: true
  });

  (pane.containerElem_.querySelector('.tp-rotv_c') as HTMLElement)?.style.setProperty('--tp-base-background-color', 'transparent');

  pane.addBinding(params, 'temperature', {
    label: '热泉温度 (°C)',
    min: 200,
    max: 400,
    step: 1
  }).on('change', (ev) => {
    worker.postMessage({
      type: 'setParams',
      params: { temperature: ev.value }
    });
    gsap.to(smoothedParams, {
      temperature: ev.value,
      duration: 0.5,
      ease: 'power2.out'
    });
  });

  pane.addBinding(params, 'currentStrength', {
    label: '洋流强度',
    min: 0,
    max: 5,
    step: 0.1
  }).on('change', (ev) => {
    worker.postMessage({
      type: 'setParams',
      params: { currentStrength: ev.value }
    });
    gsap.to(smoothedParams, {
      currentStrength: ev.value,
      duration: 0.5,
      ease: 'power2.out'
    });
  });

  pane.addBinding(params, 'particleCount', {
    label: '粒子数量',
    min: 500,
    max: 2000,
    step: 10
  }).on('change', (ev) => {
    worker.postMessage({
      type: 'setParams',
      params: { particleCount: ev.value }
    });
    gsap.to(smoothedParams, {
      particleCount: ev.value,
      duration: 0.5,
      ease: 'power2.out'
    });
  });
};

const initInteractions = (): void => {
  renderer.domElement.addEventListener('click', onCanvasClick);
};

const onCanvasClick = (event: MouseEvent): void => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const ventMeshes = thermalVent.getVentMeshes();
  const intersects = raycaster.intersectObjects(ventMeshes, false);

  if (intersects.length > 0) {
    const data: VentData = {
      temperature: Math.round(smoothedParams.temperature),
      velocity: parseFloat((stats.avgVelocity * 0.8).toFixed(2)),
      radius: parseFloat(stats.diffusionRadius.toFixed(1)),
      density: stats.currentDensity,
      pressure: parseFloat((25 + Math.random() * 2).toFixed(1))
    };
    uiPanel.show(data);
  }
};

const onResize = (): void => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const isMobile = width < 768;
  camera.fov = isMobile ? 65 : 55;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
};

const animate = (): void => {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  worker.postMessage({
    type: 'update',
    deltaTime: delta
  });

  controls.update();

  if (currentParticlesData) {
    thermalVent.update(currentParticlesData, smoothedParams);
  }

  const hasParticlesNearby = stats.currentDensity > 300;
  temperatureField.update(smoothedParams.temperature, elapsed, hasParticlesNearby);

  if (ambientParticles) {
    const mat = ambientParticles.material as THREE.ShaderMaterial;
    mat.uniforms.time.value = elapsed;
  }

  if (uiPanel.isVisible()) {
    uiPanel.updateData({
      temperature: Math.round(smoothedParams.temperature),
      velocity: parseFloat((stats.avgVelocity * 0.8).toFixed(2)),
      radius: parseFloat(stats.diffusionRadius.toFixed(1)),
      density: stats.currentDensity
    });
  }

  renderer.render(scene, camera);
};

init().catch((err) => {
  console.error('初始化失败:', err);
});
