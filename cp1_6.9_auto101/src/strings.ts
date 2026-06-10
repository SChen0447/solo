import * as THREE from 'three';
import { scene, treeResult, addNoteToSequence } from './main';

export interface StringData {
  stringGroup: THREE.Group;
  strings: {
    mesh: THREE.Mesh;
    geometry: THREE.BufferGeometry;
    positions: Float32Array;
    basePositions: Float32Array;
    displacements: Float32Array;
    note: string;
    frequency: number;
    color: number;
    amplitude: number;
    decayTime: number;
    triggerTime: number;
    isVibrating: boolean;
    vertexCount: number;
  }[];
  trailPoints: THREE.Points[];
}

const NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
const NOTE_FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];
const NOTE_COLORS = [0xff3366, 0xff8833, 0xffcc44, 0x44ff88, 0x33ddff, 0x3366ff, 0xaa66ff];
const STRING_COUNT = 7;
const VERTEX_COUNT = 200;

let audioContext: AudioContext | null = null;
let stringDataRef: StringData | null = null;

export function createStrings(scene: THREE.Scene): StringData {
  const stringGroup = new THREE.Group();
  const strings: StringData['strings'] = [];

  const startX = -2.1;
  const spacing = 0.7;
  const baseY = 2.0;
  const stringLengthBase = 1.5;

  for (let i = 0; i < STRING_COUNT; i++) {
    const x = startX + i * spacing;
    const length = stringLengthBase + Math.random() * 0.5;
    const startPos = new THREE.Vector3(x, baseY + length, 0);
    const endPos = new THREE.Vector3(x, baseY, 0);

    const colorStart = new THREE.Color(0xffdd88);
    const colorEnd = new THREE.Color(0xffaaff);
    const colorT = i / (STRING_COUNT - 1);
    const stringColor = colorStart.clone().lerp(colorEnd, colorT);

    const positions = new Float32Array(VERTEX_COUNT * 3);
    const basePositions = new Float32Array(VERTEX_COUNT * 3);
    const displacements = new Float32Array(VERTEX_COUNT);
    const colors = new Float32Array(VERTEX_COUNT * 3);

    for (let j = 0; j < VERTEX_COUNT; j++) {
      const t = j / (VERTEX_COUNT - 1);
      positions[j * 3] = THREE.MathUtils.lerp(startPos.x, endPos.x, t);
      positions[j * 3 + 1] = THREE.MathUtils.lerp(startPos.y, endPos.y, t);
      positions[j * 3 + 2] = THREE.MathUtils.lerp(startPos.z, endPos.z, t);

      basePositions[j * 3] = positions[j * 3];
      basePositions[j * 3 + 1] = positions[j * 3 + 1];
      basePositions[j * 3 + 2] = positions[j * 3 + 2];

      displacements[j] = 0;

      colors[j * 3] = stringColor.r;
      colors[j * 3 + 1] = stringColor.g;
      colors[j * 3 + 2] = stringColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      linewidth: 1
    });

    const line = new THREE.Line(geometry, material) as unknown as THREE.Mesh;
    stringGroup.add(line);

    strings.push({
      mesh: line,
      geometry,
      positions,
      basePositions,
      displacements,
      note: NOTES[i],
      frequency: NOTE_FREQUENCIES[i],
      color: NOTE_COLORS[i],
      amplitude: 0,
      decayTime: 0.3,
      triggerTime: 0,
      isVibrating: false,
      vertexCount: VERTEX_COUNT
    });
  }

  stringGroup.position.set(0, 0, 0);
  scene.add(stringGroup);

  stringDataRef = { stringGroup, strings, trailPoints: [] };
  return stringDataRef;
}

export function triggerString(
  stringIndex: number,
  triggerPosition: THREE.Vector3,
  _mousePosition: THREE.Vector2
) {
  if (!stringDataRef) return;
  const str = stringDataRef.strings[stringIndex];
  if (!str) return;

  str.isVibrating = true;
  str.amplitude = 0.02 + Math.random() * 0.03;
  str.triggerTime = performance.now() / 1000;

  playNote(str.frequency, str.note);
  addNoteToSequence(str.note);
  launchOrbFromString(stringIndex, triggerPosition);
  addTrailPoint(triggerPosition, str.color);
}

function playNote(frequency: number, note: string) {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    const harmonic = audioContext.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(frequency * 2, audioContext.currentTime);

    const harmonicGain = audioContext.createGain();
    harmonicGain.gain.setValueAtTime(0.15, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.35, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    oscillator.connect(gainNode);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    harmonic.start();
    oscillator.stop(audioContext.currentTime + 0.8);
    harmonic.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log('Audio not available:', note);
  }
}

function launchOrbFromString(stringIndex: number, startPos: THREE.Vector3) {
  if (!treeResult || !stringDataRef) return;

  const color = NOTE_COLORS[stringIndex];
  const orbGeometry = new THREE.SphereGeometry(0.12, 16, 16);
  const orbMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95
  });
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  orb.position.copy(startPos);

  const glowGeometry = new THREE.SphereGeometry(0.18, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  orb.add(glow);

  scene.add(orb);
  treeResult.orbs.push(orb);
  treeResult.orbGroup.add(orb);

  const targetOrb = treeResult.orbs[Math.floor(Math.random() * Math.min(8, treeResult.orbs.length))];
  if (!targetOrb) return;

  animateOrbAlongBranch(orb, startPos, targetOrb.position, color);
}

function animateOrbAlongBranch(
  orb: THREE.Mesh,
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number
) {
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const upOffset = new THREE.Vector3(0, 0.6 + Math.random() * 0.5, 0);
  const controlPoint = mid.clone().add(upOffset);
  controlPoint.x += (Math.random() - 0.5) * 0.5;
  controlPoint.z += (Math.random() - 0.5) * 0.5;

  const distance = start.distanceTo(end);
  const duration = distance / 2.0;
  const startTime = performance.now() / 1000;

  createArcTrail(start, controlPoint, end, color);

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  function animate() {
    const now = performance.now() / 1000;
    const t = Math.min(1, (now - startTime) / duration);
    const eased = easeOutCubic(t);

    const a = start.clone().lerp(controlPoint, eased);
    const b = controlPoint.clone().lerp(end, eased);
    orb.position.copy(a.lerp(b, eased));

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      if (treeResult) {
        let closestOrb: THREE.Mesh | null = null;
        let closestDist = Infinity;

        for (const other of treeResult.orbs) {
          if (other === orb) continue;
          const dist = orb.position.distanceTo(other.position);
          if (dist < closestDist) {
            closestDist = dist;
            closestOrb = other;
          }
        }

        if (closestOrb && closestDist < 0.4) {
          const targetColor = (closestOrb.userData as { color: number }).color || color;
          import('./particles').then(mod => {
            mod.spawnCollisionParticles(orb.position, color, targetColor);
          });
        }
      }

      setTimeout(() => {
        scene.remove(orb);
        const idx = treeResult?.orbs.indexOf(orb);
        if (idx !== undefined && idx > -1 && treeResult) {
          treeResult.orbs.splice(idx, 1);
        }
      }, 100);
    }
  }

  animate();
}

function createArcTrail(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, color: number) {
  const trailPoints: THREE.Vector3[] = [];
  const segmentCount = 20;

  for (let i = 0; i <= segmentCount; i++) {
    const t = i / segmentCount;
    const a = p0.clone().lerp(p1, t);
    const b = p1.clone().lerp(p2, t);
    trailPoints.push(a.lerp(b, t));
  }

  const positions = new Float32Array(trailPoints.length * 3);
  trailPoints.forEach((p, i) => {
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.35
  });

  const line = new THREE.Line(geometry, material);
  scene.add(line);

  const startTime = performance.now() / 1000;
  const duration = 0.5;

  function fadeTrail() {
    const now = performance.now() / 1000;
    const t = (now - startTime) / duration;
    if (t < 1) {
      material.opacity = 0.35 * (1 - t);
      requestAnimationFrame(fadeTrail);
    } else {
      scene.remove(line);
      geometry.dispose();
      material.dispose();
    }
  }
  fadeTrail();
}

function addTrailPoint(position: THREE.Vector3, color: number) {
  if (!stringDataRef) return;

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([position.x, position.y, position.z]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size: 0.08,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
  });

  const point = new THREE.Points(geometry, material);
  scene.add(point);
  stringDataRef.trailPoints.push(point);

  const startTime = performance.now() / 1000;
  const duration = 0.2;

  function fade() {
    const now = performance.now() / 1000;
    const t = (now - startTime) / duration;
    if (t < 1) {
      material.opacity = 0.5 * (1 - t);
      requestAnimationFrame(fade);
    } else {
      scene.remove(point);
      geometry.dispose();
      material.dispose();
      const idx = stringDataRef?.trailPoints.indexOf(point);
      if (idx !== undefined && idx > -1 && stringDataRef) {
        stringDataRef.trailPoints.splice(idx, 1);
      }
    }
  }
  fade();
}

export function handleStringHover(mousePosition: THREE.Vector2): number | null {
  if (!stringDataRef) return null;

  const hoverThreshold = 0.25;

  for (let i = 0; i < stringDataRef.strings.length; i++) {
    const str = stringDataRef.strings[i];
    const midX = (str.basePositions[0] + str.basePositions[(str.vertexCount - 1) * 3]) / 2;
    const topY = str.basePositions[1];
    const bottomY = str.basePositions[(str.vertexCount - 1) * 3 + 1];

    if (
      Math.abs(mousePosition.x - midX) < hoverThreshold &&
      mousePosition.y >= bottomY - 0.3 &&
      mousePosition.y <= topY + 0.3
    ) {
      const triggerY = THREE.MathUtils.clamp(mousePosition.y, bottomY, topY);
      const triggerPos = new THREE.Vector3(midX, triggerY, 0);

      const now = performance.now() / 1000;
      if (now - str.triggerTime > 0.15) {
        triggerString(i, triggerPos, mousePosition);
      }
      return i;
    }
  }
  return null;
}

export function updateStrings(delta: number, elapsed: number) {
  if (!stringDataRef) return;

  for (const str of stringDataRef.strings) {
    if (!str.isVibrating) continue;

    const timeSinceTrigger = elapsed - str.triggerTime;

    if (timeSinceTrigger > str.decayTime) {
      str.isVibrating = false;
      str.amplitude = 0;

      for (let j = 0; j < str.vertexCount; j++) {
        str.positions[j * 3] = str.basePositions[j * 3];
        str.positions[j * 3 + 1] = str.basePositions[j * 3 + 1];
        str.positions[j * 3 + 2] = str.basePositions[j * 3 + 2];
      }
    } else {
      const decay = 1 - timeSinceTrigger / str.decayTime;
      const currentAmp = str.amplitude * decay;

      for (let j = 1; j < str.vertexCount - 1; j++) {
        const t = j / (str.vertexCount - 1);
        const waveEnvelope = Math.sin(t * Math.PI);
        const wave = Math.sin(elapsed * str.frequency * 0.5 + j * 0.3) * waveEnvelope;

        str.positions[j * 3] = str.basePositions[j * 3] + wave * currentAmp;
        str.positions[j * 3 + 2] = str.basePositions[j * 3 + 2] + wave * currentAmp * 0.5;
      }
    }

    const posAttr = str.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  }
}
