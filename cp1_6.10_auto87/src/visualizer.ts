import * as THREE from 'three';

export type VisualizerMode = 'sphere' | 'nebula' | 'explode';

const PARTICLE_COUNT = 2000;
const GEOMETRY_COUNT = 20;
const TRANSITION_DURATION = 0.5;

interface ParticleData {
  spherePos: Float32Array;
  nebulaPos: Float32Array;
  explodePos: Float32Array;
  currentPos: Float32Array;
  targetPos: Float32Array;
  baseHue: Float32Array;
  baseSize: Float32Array;
}

interface GeometryItem {
  mesh: THREE.Mesh;
  rotationAxis: THREE.Vector3;
  baseRotationSpeed: number;
  baseScale: number;
  basePosition: THREE.Vector3;
  midFreqPhase: number;
}

let particles: THREE.Points | null = null;
let particleData: ParticleData | null = null;
let geometries: GeometryItem[] = [];
let centerSphere: THREE.Mesh | null = null;
let centerSphereMaterial: THREE.MeshStandardMaterial | null = null;
let particleMaterial: THREE.PointsMaterial | null = null;

let currentMode: VisualizerMode = 'sphere';
let targetMode: VisualizerMode = 'sphere';
let transitionProgress: number = 1.0;

let particleRotationY: number = 0;
let explodePhase: number = 0;

const colorHelper = new THREE.Color();

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hslToRgb(h: number, s: number, l: number, out: Float32Array, offset: number): void {
  colorHelper.setHSL(h / 360, s / 100, l / 100);
  out[offset] = colorHelper.r;
  out[offset + 1] = colorHelper.g;
  out[offset + 2] = colorHelper.b;
}

export function createVisualizer(scene: THREE.Scene): void {
  createParticles(scene);
  createGeometries(scene);
  createCenterSphere(scene);
}

function createParticles(scene: THREE.Scene): void {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);

  const spherePos = new Float32Array(PARTICLE_COUNT * 3);
  const nebulaPos = new Float32Array(PARTICLE_COUNT * 3);
  const explodePos = new Float32Array(PARTICLE_COUNT * 3);
  const currentPos = new Float32Array(PARTICLE_COUNT * 3);
  const targetPos = new Float32Array(PARTICLE_COUNT * 3);
  const baseHue = new Float32Array(PARTICLE_COUNT);
  const baseSize = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 8 * Math.cbrt(Math.random());
    spherePos[i3] = r * Math.sin(phi) * Math.cos(theta);
    spherePos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    spherePos[i3 + 2] = r * Math.cos(phi);

    const nebulaTheta = (i / PARTICLE_COUNT) * Math.PI * 8 + Math.random() * 0.3;
    const nebulaRadius = 1 + (i / PARTICLE_COUNT) * 7;
    const nebulaY = (Math.random() - 0.5) * 2 + Math.sin(nebulaTheta * 2) * 0.5;
    nebulaPos[i3] = Math.cos(nebulaTheta) * nebulaRadius;
    nebulaPos[i3 + 1] = nebulaY;
    nebulaPos[i3 + 2] = Math.sin(nebulaTheta) * nebulaRadius;

    const explodeR = 2 + Math.random() * 10;
    const explodeTheta = Math.random() * Math.PI * 2;
    const explodePhi = Math.acos(2 * Math.random() - 1);
    explodePos[i3] = explodeR * Math.sin(explodePhi) * Math.cos(explodeTheta);
    explodePos[i3 + 1] = explodeR * Math.sin(explodePhi) * Math.sin(explodeTheta);
    explodePos[i3 + 2] = explodeR * Math.cos(explodePhi);

    currentPos[i3] = spherePos[i3];
    currentPos[i3 + 1] = spherePos[i3 + 1];
    currentPos[i3 + 2] = spherePos[i3 + 2];
    targetPos[i3] = spherePos[i3];
    targetPos[i3 + 1] = spherePos[i3 + 1];
    targetPos[i3 + 2] = spherePos[i3 + 2];

    positions[i3] = spherePos[i3];
    positions[i3 + 1] = spherePos[i3 + 1];
    positions[i3 + 2] = spherePos[i3 + 2];

    const hue = Math.random() * 360;
    baseHue[i] = hue;
    hslToRgb(hue, 80 + Math.random() * 20, 50 + Math.random() * 20, colors, i3);

    const size = 0.05 + Math.random() * 0.1;
    baseSize[i] = size;
    sizes[i] = size;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  particleMaterial = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particles = new THREE.Points(geometry, particleMaterial);
  scene.add(particles);

  particleData = {
    spherePos,
    nebulaPos,
    explodePos,
    currentPos,
    targetPos,
    baseHue,
    baseSize
  };
}

function createGeometries(scene: THREE.Scene): void {
  const geoTemplates = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.DodecahedronGeometry(0.6, 0),
    new THREE.TorusKnotGeometry(0.4, 0.15, 64, 8)
  ];

  for (let i = 0; i < GEOMETRY_COUNT; i++) {
    const template = geoTemplates[i % geoTemplates.length];
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.7,
      emissive: 0x000000,
      emissiveIntensity: 0.3
    });

    const mesh = new THREE.Mesh(template, material);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 4 + Math.random() * 2;
    const pos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    mesh.position.copy(pos);

    const baseScale = 0.5 + Math.random() * 1.0;
    mesh.scale.setScalar(baseScale);

    const rotationAxis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();

    const baseRotationSpeed = 0.5 + Math.random() * 1.5;

    geometries.push({
      mesh,
      rotationAxis,
      baseRotationSpeed,
      baseScale,
      basePosition: pos.clone(),
      midFreqPhase: Math.random() * Math.PI * 2
    });

    scene.add(mesh);
  }
}

function createCenterSphere(scene: THREE.Scene): void {
  const geometry = new THREE.SphereGeometry(0.3, 32, 32);
  centerSphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    metalness: 0.2,
    roughness: 0.3,
    emissive: 0xff6b6b,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9
  });
  centerSphere = new THREE.Mesh(geometry, centerSphereMaterial);
  scene.add(centerSphere);

  const pointLight = new THREE.PointLight(0xff6b6b, 1.5, 20);
  centerSphere.add(pointLight);
}

export function setMode(mode: VisualizerMode): void {
  if (mode !== targetMode) {
    targetMode = mode;
    transitionProgress = 0;
  }
}

export function updateVisualizer(
  freqData: Uint8Array,
  deltaTime: number,
  mouseWorldPos: THREE.Vector3 | null,
  mouseActive: boolean
): void {
  if (!particleData || !particles || !centerSphereMaterial) return;

  const lowFreqAmp = getBandAmplitude(freqData, 0, 16);
  const midFreqAmp = getBandAmplitude(freqData, 16, 128);
  const highFreqAmp = getBandAmplitude(freqData, 128, 256);
  const rmsAmp = getRMS(freqData);

  updateParticles(freqData, lowFreqAmp, midFreqAmp, highFreqAmp, deltaTime, mouseWorldPos, mouseActive);
  updateGeometries(lowFreqAmp, midFreqAmp, highFreqAmp, deltaTime);
  updateCenterSphere(rmsAmp);
}

function getBandAmplitude(data: Uint8Array, startBin: number, endBin: number): number {
  let sum = 0;
  const s = Math.max(0, startBin);
  const e = Math.min(data.length, endBin);
  for (let i = s; i < e; i++) {
    sum += data[i];
  }
  return sum / ((e - s) * 255);
}

function getRMS(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i] / 255;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

function updateParticles(
  freqData: Uint8Array,
  lowAmp: number,
  midAmp: number,
  highAmp: number,
  deltaTime: number,
  mouseWorldPos: THREE.Vector3 | null,
  mouseActive: boolean
): void {
  const positions = particles!.geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = particles!.geometry.getAttribute('color') as THREE.BufferAttribute;
  const sizes = particles!.geometry.getAttribute('size') as THREE.BufferAttribute;
  const posArray = positions.array as Float32Array;
  const colorArray = colors.array as Float32Array;
  const sizeArray = sizes.array as Float32Array;
  const pd = particleData!;

  if (transitionProgress < 1.0) {
    transitionProgress = Math.min(1.0, transitionProgress + deltaTime / TRANSITION_DURATION);
  }

  if (currentMode !== targetMode && transitionProgress >= 1.0) {
    currentMode = targetMode;
  }

  particleRotationY += deltaTime * 0.02;
  const cosR = Math.cos(particleRotationY);
  const sinR = Math.sin(particleRotationY);

  explodePhase += deltaTime * 2;
  const explodeExpand = (Math.sin(explodePhase) + 1) * 0.5;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    let tx: number, ty: number, tz: number;
    if (targetMode === 'sphere') {
      tx = pd.spherePos[i3];
      ty = pd.spherePos[i3 + 1];
      tz = pd.spherePos[i3 + 2];
    } else if (targetMode === 'nebula') {
      tx = pd.nebulaPos[i3];
      ty = pd.nebulaPos[i3 + 1];
      tz = pd.nebulaPos[i3 + 2];
    } else {
      const expand = 1 + explodeExpand * 1.5;
      tx = pd.explodePos[i3] * expand;
      ty = pd.explodePos[i3 + 1] * expand;
      tz = pd.explodePos[i3 + 2] * expand;
    }

    let cx: number, cy: number, cz: number;
    if (currentMode === 'sphere') {
      cx = pd.spherePos[i3];
      cy = pd.spherePos[i3 + 1];
      cz = pd.spherePos[i3 + 2];
    } else if (currentMode === 'nebula') {
      cx = pd.nebulaPos[i3];
      cy = pd.nebulaPos[i3 + 1];
      cz = pd.nebulaPos[i3 + 2];
    } else {
      const expand = 1 + explodeExpand * 1.5;
      cx = pd.explodePos[i3] * expand;
      cy = pd.explodePos[i3 + 1] * expand;
      cz = pd.explodePos[i3 + 2] * expand;
    }

    const t = easeInOutCubic(transitionProgress);
    let px = lerp(cx, tx, t);
    let py = lerp(cy, ty, t);
    let pz = lerp(cz, tz, t);

    const rx = px * cosR - pz * sinR;
    const rz = px * sinR + pz * cosR;
    px = rx;
    pz = rz;

    if (mouseActive && mouseWorldPos) {
      const dx = mouseWorldPos.x - px;
      const dy = mouseWorldPos.y - py;
      const dz = mouseWorldPos.z - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
      const force = 0.05 / (dist * 0.5 + 0.5);
      px += dx * force;
      py += dy * force;
      pz += dz * force;
    }

    posArray[i3] = px;
    posArray[i3 + 1] = py;
    posArray[i3 + 2] = pz;

    const size = pd.baseSize[i] + lowAmp * 0.45;
    sizeArray[i] = size;

    const hueShift = midAmp * 60;
    const hue = (pd.baseHue[i] + hueShift) % 360;
    const sat = 90;
    const light = 50 + midAmp * 20;
    hslToRgb(hue, sat, light, colorArray, i3);
  }

  particleMaterial!.opacity = 0.1 + highAmp * 0.9;

  positions.needsUpdate = true;
  colors.needsUpdate = true;
  sizes.needsUpdate = true;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateGeometries(
  lowAmp: number,
  midAmp: number,
  highAmp: number,
  deltaTime: number
): void {
  for (let i = 0; i < geometries.length; i++) {
    const g = geometries[i];

    const rotSpeed = g.baseRotationSpeed + highAmp * 2.0;
    const angle = rotSpeed * deltaTime;
    g.mesh.rotateOnAxis(g.rotationAxis, angle);

    const pulse = 1.0 + lowAmp * 0.5;
    g.mesh.scale.setScalar(g.baseScale * pulse);

    g.midFreqPhase += deltaTime * 2;
    const hue = (midAmp * 360 + i * 18 + g.midFreqPhase * 10) % 360;
    const mat = g.mesh.material as THREE.MeshStandardMaterial;
    colorHelper.setHSL(hue / 360, 0.85, 0.55);
    mat.color.copy(colorHelper);
    mat.emissive.copy(colorHelper);
    mat.emissiveIntensity = 0.3 + midAmp * 0.6;

    const wobble = Math.sin(g.midFreqPhase) * 0.15 * midAmp;
    g.mesh.position.lerpVectors(
      g.basePosition,
      g.basePosition.clone().normalize().multiplyScalar(g.basePosition.length() + wobble * 2),
      0.5
    );
  }
}

function updateCenterSphere(rmsAmp: number): void {
  if (!centerSphereMaterial) return;

  const t = Math.min(1, rmsAmp * 2.5);
  colorHelper.setHSL(lerp(355, 176, t) / 360, 0.8, 0.6);
  centerSphereMaterial.color.copy(colorHelper);
  centerSphereMaterial.emissive.copy(colorHelper);
  centerSphereMaterial.emissiveIntensity = 0.5 + rmsAmp * 1.5;
}
