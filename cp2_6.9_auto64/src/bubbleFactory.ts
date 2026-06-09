import * as THREE from 'three';

export interface BubbleData {
  value: number;
  group: THREE.Group;
  sphere: THREE.Mesh;
  glow: THREE.Mesh;
  highlightRing: THREE.LineLoop | null;
  baseScale: number;
  phase: number;
  particles: THREE.Points | null;
}

const MIN_COLOR = new THREE.Color(0x00bfff);
const MAX_COLOR = new THREE.Color(0xff4500);
const MIN_RADIUS = 0.3;
const MAX_RADIUS = 1.5;

export function mapValueToRadius(value: number, minVal: number, maxVal: number): number {
  const t = (value - minVal) / (maxVal - minVal);
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

export function mapValueToColor(value: number, minVal: number, maxVal: number): THREE.Color {
  const t = (value - minVal) / (maxVal - minVal);
  const color = new THREE.Color();
  color.copy(MIN_COLOR).lerp(MAX_COLOR, t);
  return color;
}

export function createBubble(
  value: number,
  minVal: number,
  maxVal: number
): BubbleData {
  const group = new THREE.Group();
  const radius = mapValueToRadius(value, minVal, maxVal);
  const color = mapValueToColor(value, minVal, maxVal);

  const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.1,
    emissive: color,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 1.0
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  const glowGeo = new THREE.SphereGeometry(radius * 1.15, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  group.add(glow);

  return {
    value,
    group,
    sphere,
    glow,
    highlightRing: null,
    baseScale: 1.0,
    phase: Math.random() * Math.PI * 2,
    particles: null
  };
}

export function createHighlightRing(radius: number): THREE.LineLoop {
  const ringGeo = new THREE.RingGeometry(radius * 1.3, radius * 1.45, 64);
  const positions = ringGeo.attributes.position;
  const linePoints: THREE.Vector3[] = [];
  for (let i = 0; i < positions.count; i++) {
    linePoints.push(
      new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      )
    );
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 1.0
  });
  return new THREE.LineLoop(lineGeo, lineMat);
}

export function createParticles(radius: number, color: THREE.Color): THREE.Points {
  const count = 20;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = radius * (1.5 + Math.random() * 0.5);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: color,
    size: 0.15,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true
  });
  return new THREE.Points(geo, mat);
}

export function updateBubbleBreathing(bubble: BubbleData, elapsed: number): void {
  const pulse = 1 + Math.sin(elapsed + bubble.phase) * 0.05;
  bubble.group.scale.setScalar(bubble.baseScale * pulse);
}

export function setBubbleTransparent(bubble: BubbleData, transparent: boolean): void {
  const mat = bubble.sphere.material as THREE.MeshStandardMaterial;
  mat.opacity = transparent ? 0.6 : 1.0;
  mat.transparent = true;
}

export function flashBubble(bubble: BubbleData): void {
  const mat = bubble.sphere.material as THREE.MeshStandardMaterial;
  const originalIntensity = 0.2;
  mat.emissiveIntensity = 1.0;
  setTimeout(() => {
    mat.emissiveIntensity = originalIntensity;
  }, 300);
}

export function addHighlight(bubble: BubbleData): void {
  if (bubble.highlightRing) return;
  const radius = mapValueToRadius(bubble.value, 1, 100);
  const ring = createHighlightRing(radius);
  bubble.highlightRing = ring;
  bubble.group.add(ring);
}

export function removeHighlight(bubble: BubbleData): void {
  if (!bubble.highlightRing) return;
  bubble.group.remove(bubble.highlightRing);
  bubble.highlightRing.geometry.dispose();
  (bubble.highlightRing.material as THREE.Material).dispose();
  bubble.highlightRing = null;
}

export function updateHighlightBlink(bubble: BubbleData, elapsed: number): void {
  if (!bubble.highlightRing) return;
  const freq = 10;
  const blink = (Math.sin(elapsed * freq * Math.PI * 2) + 1) / 2;
  const mat = bubble.highlightRing.material as THREE.LineBasicMaterial;
  mat.opacity = 0.4 + blink * 0.6;
}
