import * as THREE from 'three';

export interface PlantParams {
  branchAngle: number;
  branchDepth: number;
  lengthDecay: number;
  noiseStrength: number;
}

export interface BranchSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  depth: number;
}

export interface PlantMeshData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  branchCount: number;
  segmentsByDepth: BranchSegment[][];
}

export interface Preset {
  name: string;
  params: PlantParams;
}

export const PRESETS: Record<string, Preset> = {
  maple: {
    name: '枫树',
    params: { branchAngle: 60, branchDepth: 6, lengthDecay: 0.7, noiseStrength: 0.1 }
  },
  fern: {
    name: '蕨类',
    params: { branchAngle: 30, branchDepth: 4, lengthDecay: 0.8, noiseStrength: 0.05 }
  },
  vine: {
    name: '藤蔓',
    params: { branchAngle: 45, branchDepth: 8, lengthDecay: 0.6, noiseStrength: 0.15 }
  }
};

const SEGMENTS_PER_CYLINDER = 8;

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function applyNoise(v: THREE.Vector3, strength: number, rand: () => number): THREE.Vector3 {
  if (strength <= 0) return v;
  const nx = (rand() - 0.5) * 2 * strength;
  const ny = (rand() - 0.5) * 2 * strength;
  const nz = (rand() - 0.5) * 2 * strength;
  return v.clone().add(new THREE.Vector3(nx, ny, nz));
}

function getPerpendicular(dir: THREE.Vector3): THREE.Vector3 {
  const up = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3().crossVectors(dir, up).normalize();
}

export function generateBranches(params: PlantParams): BranchSegment[][] {
  const { branchAngle, branchDepth, lengthDecay, noiseStrength } = params;
  const angleRad = (branchAngle * Math.PI) / 180;
  const rand = mulberry32(42);

  const segmentsByDepth: BranchSegment[][] = [];
  const initialLength = 2.5;
  const initialRadius = 0.08;
  const radiusDecay = lengthDecay * 0.85;

  for (let i = 0; i <= branchDepth; i++) {
    segmentsByDepth[i] = [];
  }

  const trunkStart = new THREE.Vector3(0, 0, 0);
  const trunkDir = applyNoise(new THREE.Vector3(0, 1, 0), noiseStrength * 0.3, rand).normalize();
  const trunkEnd = trunkStart.clone().add(trunkDir.clone().multiplyScalar(initialLength));

  segmentsByDepth[0].push({
    start: trunkStart,
    end: trunkEnd,
    radius: initialRadius,
    depth: 0
  });

  function recurse(
    parentStart: THREE.Vector3,
    parentEnd: THREE.Vector3,
    parentDir: THREE.Vector3,
    currentDepth: number,
    currentLength: number,
    currentRadius: number
  ) {
    if (currentDepth >= branchDepth) return;

    const nextLength = currentLength * lengthDecay;
    const nextRadius = currentRadius * radiusDecay;
    const nextDepth = currentDepth + 1;

    const perp1 = getPerpendicular(parentDir);
    const perp2 = new THREE.Vector3().crossVectors(parentDir, perp1).normalize();

    const branchCount = currentDepth === 0 ? 3 : currentDepth < 2 ? 3 : 2;

    for (let i = 0; i < branchCount; i++) {
      let angleOffset = 0;
      if (branchCount === 3) {
        angleOffset = (i * 2 * Math.PI) / 3;
      } else if (branchCount === 2) {
        angleOffset = i * Math.PI + (rand() - 0.5) * 0.3;
      } else {
        angleOffset = rand() * Math.PI * 2;
      }

      const rotatedPerp = perp1
        .clone()
        .applyAxisAngle(parentDir, angleOffset)
        .normalize();

      let branchDir = parentDir
        .clone()
        .applyAxisAngle(rotatedPerp, angleRad)
        .normalize();

      const tilt = rand() * 0.3 - 0.15;
      branchDir = branchDir.applyAxisAngle(perp2, tilt).normalize();
      branchDir = applyNoise(branchDir, noiseStrength, rand).normalize();

      const startPoint = parentEnd.clone();
      const endPoint = startPoint.clone().add(branchDir.clone().multiplyScalar(nextLength));

      segmentsByDepth[nextDepth].push({
        start: startPoint,
        end: endPoint,
        radius: nextRadius,
        depth: nextDepth
      });

      recurse(startPoint, endPoint, branchDir, nextDepth, nextLength, nextRadius);
    }
  }

  recurse(trunkStart, trunkEnd, trunkDir, 0, initialLength, initialRadius);

  return segmentsByDepth;
}

function buildCylinder(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  positions: number[],
  normals: number[],
  indices: number[],
  vertexOffset: number
): number {
  const dir = new THREE.Vector3().subVectors(end, start).normalize();
  const perp = getPerpendicular(dir);
  const perp2 = new THREE.Vector3().crossVectors(dir, perp).normalize();

  const length = start.distanceTo(end);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir
  );
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const segments = SEGMENTS_PER_CYLINDER;
  const topRadius = radius * 0.7;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const bottomLocal = new THREE.Vector3(radius * cos, -length / 2, radius * sin);
    const topLocal = new THREE.Vector3(topRadius * cos, length / 2, topRadius * sin);

    bottomLocal.applyQuaternion(quaternion).add(mid);
    topLocal.applyQuaternion(quaternion).add(mid);

    const normalBottom = new THREE.Vector3(cos, 0, sin).applyQuaternion(quaternion);
    const normalTop = normalBottom.clone();

    positions.push(bottomLocal.x, bottomLocal.y, bottomLocal.z);
    normals.push(normalBottom.x, normalBottom.y, normalBottom.z);

    positions.push(topLocal.x, topLocal.y, topLocal.z);
    normals.push(normalTop.x, normalTop.y, normalTop.z);
  }

  for (let i = 0; i < segments; i++) {
    const base = vertexOffset + i * 2;
    indices.push(base, base + 1, base + 2);
    indices.push(base + 1, base + 3, base + 2);
  }

  return (segments + 1) * 2;
}

export function generatePlantMesh(params: PlantParams): PlantMeshData {
  const segmentsByDepth = generateBranches(params);

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  let vertexOffset = 0;
  let branchCount = 0;

  for (const depthSegments of segmentsByDepth) {
    for (const seg of depthSegments) {
      const added = buildCylinder(
        seg.start,
        seg.end,
        seg.radius,
        positions,
        normals,
        indices,
        vertexOffset
      );
      vertexOffset += added;
      branchCount++;
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    branchCount,
    segmentsByDepth
  };
}

export function generatePartialMesh(
  params: PlantParams,
  maxDepth: number
): PlantMeshData {
  const fullSegments = generateBranches(params);
  const segmentsByDepth: BranchSegment[][] = [];

  for (let i = 0; i <= Math.min(maxDepth, params.branchDepth); i++) {
    segmentsByDepth[i] = fullSegments[i] || [];
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  let vertexOffset = 0;
  let branchCount = 0;

  for (const depthSegments of segmentsByDepth) {
    for (const seg of depthSegments) {
      const added = buildCylinder(
        seg.start,
        seg.end,
        seg.radius,
        positions,
        normals,
        indices,
        vertexOffset
      );
      vertexOffset += added;
      branchCount++;
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
    branchCount,
    segmentsByDepth
  };
}
