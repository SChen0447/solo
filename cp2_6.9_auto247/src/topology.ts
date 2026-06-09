import * as THREE from 'three';

export interface MorphParams {
  progress: number;
  twist: number;
  subdivision: number;
}

const SPHERE_RADIUS = 2;
const TORUS_MAJOR_RADIUS = 2;
const TORUS_MINOR_RADIUS = 1;

export function createTopologyGeometry(subdivision: number): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, subdivision, subdivision);
  return geometry;
}

export function updateMorphGeometry(
  geometry: THREE.BufferGeometry,
  params: MorphParams
): void {
  const { progress, twist, subdivision } = params;
  const t = Math.max(0, Math.min(1, progress));

  const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const positions = positionAttr.array as Float32Array;
  const vertexCount = positionAttr.count;

  const widthSegments = subdivision;
  const heightSegments = subdivision;

  const twistAngle = twist * Math.PI;

  for (let i = 0; i < vertexCount; i++) {
    const ix = i * 3;

    const x0 = positions[ix];
    const y0 = positions[ix + 1];
    const z0 = positions[ix + 2];

    const len = Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0);
    const nx = len > 0 ? x0 / len : 0;
    const ny = len > 0 ? y0 / len : 0;
    const nz = len > 0 ? z0 / len : 0;

    const theta = Math.acos(nz);
    const phi = Math.atan2(ny, nx);

    const sx = SPHERE_RADIUS * Math.sin(theta) * Math.cos(phi);
    const sy = SPHERE_RADIUS * Math.sin(theta) * Math.sin(phi);
    const sz = SPHERE_RADIUS * Math.cos(theta);

    const u = phi;
    const v = theta - Math.PI / 2;

    const tx = (TORUS_MAJOR_RADIUS + TORUS_MINOR_RADIUS * Math.cos(v)) * Math.cos(u);
    const ty = (TORUS_MAJOR_RADIUS + TORUS_MINOR_RADIUS * Math.cos(v)) * Math.sin(u);
    const tz = TORUS_MINOR_RADIUS * Math.sin(v);

    let px = sx * (1 - t) + tx * t;
    let py = sy * (1 - t) + ty * t;
    let pz = sz * (1 - t) + tz * t;

    if (twistAngle !== 0) {
      const angle = twistAngle * t * (v / Math.PI + 0.5);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const rx = px * cosA - py * sinA;
      const ry = px * sinA + py * cosA;
      px = rx;
      py = ry;
    }

    positions[ix] = px;
    positions[ix + 1] = py;
    positions[ix + 2] = pz;
  }

  positionAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}
