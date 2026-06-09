import * as THREE from 'three';
import type { Constellation } from './constellation';
import { getConstellationCenter } from './constellation';

export interface ConstellationMeshes {
  stars: THREE.Mesh[];
  lines: THREE.Line[];
  glowParticles?: THREE.Points;
}

export interface GlowParticlesData {
  positions: Float32Array;
  count: number;
}

export function createGlowParticles(
  scene: THREE.Scene,
  constellation: Constellation,
  color: string
): { points: THREE.Points; data: GlowParticlesData } {
  const center = getConstellationCenter(constellation);
  const particleCount = 60;
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const starIdx = i % constellation.stars.length;
    const star = constellation.stars[starIdx];
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.15 + Math.random() * 0.35;
    const phi = Math.random() * Math.PI * 2;
    positions[i * 3] = star.x + Math.cos(angle) * Math.cos(phi) * radius;
    positions[i * 3 + 1] = star.y + Math.sin(phi) * radius;
    positions[i * 3 + 2] = star.z + Math.sin(angle) * Math.cos(phi) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: new THREE.Color(color),
    size: 0.12,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.userData = {
    baseCenter: center,
    constellationId: constellation.id,
    phase: Math.random() * Math.PI * 2
  };
  scene.add(points);

  return { points, data: { positions, count: particleCount } };
}

export function setGlowActive(
  points: THREE.Points,
  active: boolean,
  intensity: number = 1
): void {
  const mat = points.material as THREE.PointsMaterial;
  const targetOpacity = active ? 0.75 * intensity : 0;
  mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.15);
  mat.size = active ? 0.15 * intensity : 0.12;
}

export function updateGlowParticles(points: THREE.Points, dt: number): void {
  const positions = points.geometry.attributes.position.array as Float32Array;
  const data = points.userData as { baseCenter: { x: number; y: number; z: number }; phase: number };
  data.phase += dt * 0.8;

  const center = data.baseCenter;
  const n = positions.length / 3;
  for (let i = 0; i < n; i++) {
    const ix = i * 3, iy = i * 3 + 1, iz = i * 3 + 2;
    const dx = positions[ix] - center.x;
    const dy = positions[iy] - center.y;
    const dz = positions[iz] - center.z;
    const wobble = Math.sin(data.phase + i * 0.5) * 0.008;
    positions[ix] += dx * 0.002 + wobble;
    positions[iy] += dy * 0.002 + wobble * 0.7;
    positions[iz] += dz * 0.002;
  }
  points.geometry.attributes.position.needsUpdate = true;
}

export function triggerRippleAnimation(
  scene: THREE.Scene,
  constellation: Constellation,
  meshes: ConstellationMeshes
): void {
  const center = getConstellationCenter(constellation);
  const flashSequence = [
    { start: 0, duration: 0.3 },
    { start: 0.45, duration: 0.3 }
  ];
  const totalDuration = 0.9;
  const startTime = performance.now();

  const rippleGroup = new THREE.Group();
  scene.add(rippleGroup);

  for (let r = 0; r < 2; r++) {
    const ringGeom = new THREE.RingGeometry(0.3, 0.38, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(constellation.color),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.set(center.x, center.y, center.z);
    ring.lookAt(0, 0, 0);
    ring.userData = { delay: r * 0.15 };
    rippleGroup.add(ring);
  }

  function animate(): void {
    const elapsed = (performance.now() - startTime) / 1000;
    if (elapsed > totalDuration) {
      scene.remove(rippleGroup);
      rippleGroup.children.forEach(c => {
        (c as THREE.Mesh).geometry.dispose();
        ((c as THREE.Mesh).material as THREE.Material).dispose();
      });
      return;
    }

    let lineHighlight = 0;
    for (const flash of flashSequence) {
      if (elapsed >= flash.start && elapsed < flash.start + flash.duration) {
        const t = (elapsed - flash.start) / flash.duration;
        lineHighlight = Math.sin(t * Math.PI);
      }
    }

    for (const line of meshes.lines) {
      const mat = line.material as THREE.LineBasicMaterial;
      const baseColor = new THREE.Color('#4A90D9').lerp(new THREE.Color('#ffffff'), lineHighlight * 0.8);
      mat.color.copy(baseColor);
      mat.opacity = 0.6 + lineHighlight * 0.4;
    }

    for (const star of meshes.stars) {
      const mat = star.material as THREE.MeshBasicMaterial;
      const baseCol = new THREE.Color(constellation.color);
      mat.color.copy(baseCol).lerp(new THREE.Color('#ffffff'), lineHighlight * 0.5);
    }

    rippleGroup.children.forEach(child => {
      const ring = child as THREE.Mesh;
      const mat = ring.material as THREE.MeshBasicMaterial;
      const delay = ring.userData.delay as number;
      const localT = Math.max(0, (elapsed - delay) / 0.5);
      if (localT > 0 && localT < 1) {
        const scale = 1 + localT * 3;
        ring.scale.set(scale, scale, 1);
        mat.opacity = (1 - localT) * 0.7;
      }
    });

    requestAnimationFrame(animate);
  }
  animate();
}

export function showStoryCard(
  constellation: Constellation,
  cardEl: HTMLElement,
  nameEl: HTMLElement,
  mythEl: HTMLElement,
  canvasEl: HTMLCanvasElement
): void {
  nameEl.textContent = constellation.name;
  mythEl.textContent = constellation.myth;
  drawConstellationSketch(canvasEl, constellation);
  cardEl.classList.add('visible');
}

export function hideStoryCard(cardEl: HTMLElement): void {
  cardEl.classList.remove('visible');
}

export function drawConstellationSketch(canvas: HTMLCanvasElement, constellation: Constellation): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, w, h);

  const stars = constellation.stars;
  const xs = stars.map(s => s.x);
  const ys = stars.map(s => s.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.min((w - 40) / rangeX, (h - 40) / rangeY);
  const offsetX = (w - rangeX * scale) / 2 - minX * scale;
  const offsetY = (h - rangeY * scale) / 2 - minY * scale;

  function toScreen(x: number, y: number): { sx: number; sy: number } {
    return { sx: x * scale + offsetX, sy: h - (y * scale + offsetY) };
  }

  ctx.strokeStyle = constellation.color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  for (const [a, b] of constellation.lines) {
    const pa = toScreen(stars[a].x, stars[a].y);
    const pb = toScreen(stars[b].x, stars[b].y);
    ctx.beginPath();
    ctx.moveTo(pa.sx, pa.sy);
    ctx.lineTo(pb.sx, pb.sy);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const { sx, sy } = toScreen(s.x, s.y);
    const r = (s.size || 0.3) * 4 + 1.5;
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
    grad.addColorStop(0, constellation.color);
    grad.addColorStop(0.4, constellation.color + '88');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export interface Meteor {
  line: THREE.Line;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export function spawnMeteor(scene: THREE.Scene): Meteor {
  const startTheta = Math.random() * Math.PI * 2;
  const startPhi = (Math.random() * 0.5 + 0.3) * Math.PI;
  const startRadius = 12 + Math.random() * 2;
  const start = new THREE.Vector3(
    startRadius * Math.sin(startPhi) * Math.cos(startTheta),
    startRadius * Math.cos(startPhi),
    startRadius * Math.sin(startPhi) * Math.sin(startTheta)
  );

  const dirToCenter = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), start).normalize();
  const tangent = new THREE.Vector3().crossVectors(dirToCenter, new THREE.Vector3(0, 1, 0)).normalize();
  if (tangent.length() < 0.1) tangent.set(1, 0, 0);
  const velocity = dirToCenter.clone().multiplyScalar(6).add(tangent.multiplyScalar(4));

  const end = start.clone().add(velocity.clone().multiplyScalar(0.3));
  const geom = new THREE.BufferGeometry().setFromPoints([start, end]);
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  const line = new THREE.Line(geom, mat);
  scene.add(line);

  return { line, velocity, life: 0, maxLife: 0.8 };
}

export function updateMeteors(
  meteors: Meteor[],
  scene: THREE.Scene,
  dt: number
): Meteor[] {
  const remaining: Meteor[] = [];
  for (const m of meteors) {
    m.life += dt;
    if (m.life >= m.maxLife) {
      scene.remove(m.line);
      m.line.geometry.dispose();
      (m.line.material as THREE.Material).dispose();
      continue;
    }
    const t = m.life / m.maxLife;
    const mat = m.line.material as THREE.LineBasicMaterial;
    mat.opacity = 0.9 * (1 - t);

    const positions = m.line.geometry.attributes.position.array as Float32Array;
    const step = m.velocity.clone().multiplyScalar(dt);
    positions[0] += step.x;
    positions[1] += step.y;
    positions[2] += step.z;
    positions[3] += step.x;
    positions[4] += step.y;
    positions[5] += step.z;
    m.line.geometry.attributes.position.needsUpdate = true;
    remaining.push(m);
  }
  return remaining;
}
