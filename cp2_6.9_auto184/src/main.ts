import * as THREE from 'three';
import { CONSTELLATIONS } from './constellation';
import type { Constellation } from './constellation';
import { InteractionManager, applyConstellationHighlight } from './interaction';
import {
  createGlowParticles,
  setGlowActive,
  updateGlowParticles,
  triggerRippleAnimation,
  showStoryCard,
  hideStoryCard,
  spawnMeteor,
  updateMeteors,
  type ConstellationMeshes,
  type Meteor
} from './effects';

const SKY_ROTATION_SPEED = 0.01;

const container = document.getElementById('canvas-container');
if (!container) throw new Error('Canvas container not found');

const storyCard = document.getElementById('story-card');
const storyName = document.getElementById('story-name');
const storyMyth = document.getElementById('story-myth');
const storyCanvas = document.getElementById('story-canvas') as HTMLCanvasElement | null;
if (!storyCard || !storyName || !storyMyth || !storyCanvas) {
  throw new Error('Story card elements not found');
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.015);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

const skyGroup = new THREE.Group();
scene.add(skyGroup);

function createBackgroundStars(): THREE.Points {
  const count = 2000;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 18 + Math.random() * 4;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 0.3 + Math.random() * 0.5;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false
  });
  const points = new THREE.Points(geom, mat);
  return points;
}

function createMilkyWay(): THREE.Points {
  const count = 1000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const bandGauss = (Math.random() + Math.random() + Math.random() - 1.5) * 0.8;
    const r = 17 + Math.random() * 5;
    positions[i * 3] = r * Math.cos(theta) * Math.cos(bandGauss);
    positions[i * 3 + 1] = r * Math.sin(bandGauss);
    positions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(bandGauss);
    const t = 1 - Math.min(1, Math.abs(bandGauss) * 2);
    colors[i * 3] = 0.55 + 0.2 * t;
    colors[i * 3 + 1] = 0.45 + 0.15 * t;
    colors[i * 3 + 2] = 0.75 + 0.2 * t;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  return new THREE.Points(geom, mat);
}

const backgroundStars = createBackgroundStars();
const milkyWay = createMilkyWay();
skyGroup.add(backgroundStars);
skyGroup.add(milkyWay);

const constellationGroups = new Map<string, THREE.Group>();
const constellationMeshes = new Map<string, ConstellationMeshes>();
const glowParticlesMap = new Map<string, THREE.Points>();
const constellationById = new Map<string, Constellation>();

for (const c of CONSTELLATIONS) {
  constellationById.set(c.id, c);
  const group = new THREE.Group();
  group.userData.constellationId = c.id;

  const stars: THREE.Mesh[] = [];
  for (const s of c.stars) {
    const geom = new THREE.SphereGeometry(s.size || 0.3, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(c.color) });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(s.x, s.y, s.z);
    mesh.userData.constellationId = c.id;
    group.add(mesh);
    stars.push(mesh);
  }

  const lines: THREE.Line[] = [];
  for (const [a, b] of c.lines) {
    const sa = c.stars[a];
    const sb = c.stars[b];
    const pts = [
      new THREE.Vector3(sa.x, sa.y, sa.z),
      new THREE.Vector3(sb.x, sb.y, sb.z)
    ];
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: 0x4a90d9,
      transparent: true,
      opacity: 0.6
    });
    const line = new THREE.Line(geom, mat);
    line.userData.constellationId = c.id;
    group.add(line);
    lines.push(line);
  }

  const meshes: ConstellationMeshes = { stars, lines };
  constellationMeshes.set(c.id, meshes);
  constellationGroups.set(c.id, group);
  skyGroup.add(group);

  const glow = createGlowParticles(scene, c, c.color);
  glowParticlesMap.set(c.id, glow.points);
}

let selectedId: string | null = null;
let hoveredId: string | null = null;

const interaction = new InteractionManager({
  camera,
  container,
  constellationGroups,
  constellationMeshes,
  callbacks: {
    onHover: (id) => {
      hoveredId = id;
    },
    onClick: (id) => {
      if (selectedId === id) return;
      selectedId = id;
      const c = constellationById.get(id);
      const meshes = constellationMeshes.get(id);
      if (c && meshes) {
        interaction.focusOnConstellation(id, 1.2);
        triggerRippleAnimation(scene, c, meshes);
        showStoryCard(c, storyCard, storyName, storyMyth, storyCanvas);
      }
    },
    onOutsideClick: () => {
      if (selectedId) {
        selectedId = null;
        hideStoryCard(storyCard);
      }
    },
    onAutoRoamToggle: () => {
      if (!interaction.isRoamActive()) {
        selectedId = null;
        hideStoryCard(storyCard);
      }
    }
  }
});

let meteors: Meteor[] = [];
let nextMeteorTime = 15 + Math.random() * 15;
let elapsed = 0;
let lastFrameTime = performance.now();

function animate(now: number): void {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  elapsed += dt;

  skyGroup.rotation.y += SKY_ROTATION_SPEED * dt;

  interaction.update(dt);

  for (const [id, points] of glowParticlesMap) {
    const isHover = hoveredId === id;
    const isSel = selectedId === id;
    const c = constellationById.get(id);
    const intensity = c ? c.animationParams.glowIntensity : 1;
    setGlowActive(points, isHover || isSel, intensity);
    updateGlowParticles(points, dt);
  }

  for (const [id, meshes] of constellationMeshes) {
    const c = constellationById.get(id);
    if (c) {
      applyConstellationHighlight(meshes, c, hoveredId === id, selectedId === id);
    }
  }

  if (elapsed >= nextMeteorTime) {
    meteors.push(spawnMeteor(scene));
    nextMeteorTime = elapsed + 15 + Math.random() * 15;
  }
  meteors = updateMeteors(meteors, scene, dt);

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
