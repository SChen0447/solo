import * as THREE from 'three';

export interface TreeParams {
  light: number;
  water: number;
  wind: number;
}

export interface TreeStats {
  height: number;
  branchCount: number;
  leafCount: number;
}

export interface BranchData {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  depth: number;
}

export interface LeafData {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  size: number;
}

export interface TreeMeshData {
  branchPositions: Float32Array;
  branchIndices: Uint32Array;
  branchColors: Float32Array;
  leafPositions: Float32Array;
  leafColors: Float32Array;
  leafIndices: Uint32Array;
  stats: TreeStats;
  branches: BranchData[];
  leaves: LeafData[];
}

export interface TreeObject {
  group: THREE.Group;
  branchMesh: THREE.Mesh;
  leafMesh: THREE.Mesh;
  data: TreeMeshData;
  params: TreeParams;
}

const TRUNK_COLOR = new THREE.Color(0x5d4037);
const DARK_TRUNK_COLOR = new THREE.Color(0x3e2723);

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, t);
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateBranchSegments(
  start: THREE.Vector3,
  direction: THREE.Vector3,
  length: number,
  radius: number,
  depth: number,
  params: TreeParams,
  branches: BranchData[],
  leaves: LeafData[],
  maxDepth: number
): void {
  const windBend = params.wind * 0.3;
  const bendDirection = new THREE.Vector3(
    Math.sin(depth * 1.5) * windBend,
    0,
    Math.cos(depth * 1.5) * windBend
  );

  const actualDirection = direction.clone().add(bendDirection).normalize();
  const end = start.clone().add(actualDirection.multiplyScalar(length));

  branches.push({
    start: start.clone(),
    end: end.clone(),
    radius,
    depth
  });

  if (depth >= maxDepth) {
    const leafCount = Math.floor(randomRange(2, 5) * params.light);
    for (let i = 0; i < leafCount; i++) {
      const leafPos = end.clone().add(
        new THREE.Vector3(
          randomRange(-0.3, 0.3),
          randomRange(-0.2, 0.2),
          randomRange(-0.3, 0.3)
        )
      );
      const leafNormal = new THREE.Vector3(
        randomRange(-1, 1),
        randomRange(0.3, 1),
        randomRange(-1, 1)
      ).normalize();
      leaves.push({
        position: leafPos,
        normal: leafNormal,
        size: randomRange(0.15, 0.3)
      });
    }
    return;
  }

  const branchCount = Math.max(2, Math.floor(randomRange(2, 4) + params.light * 0.5));
  const lengthScale = 0.7 + params.water * 0.15;
  const radiusScale = 0.65;
  const angleSpread = 0.4 + params.light * 0.2;

  for (let i = 0; i < branchCount; i++) {
    const baseAngle = (i / branchCount) * Math.PI * 2;
    const angleJitter = randomRange(-0.3, 0.3);
    const polarAngle = randomRange(0.3, angleSpread);

    const newDirection = new THREE.Vector3(
      Math.sin(polarAngle) * Math.cos(baseAngle + angleJitter),
      Math.cos(polarAngle),
      Math.sin(polarAngle) * Math.sin(baseAngle + angleJitter)
    );

    const newLength = length * lengthScale * randomRange(0.85, 1.15);
    const newRadius = radius * radiusScale;

    generateBranchSegments(
      end,
      newDirection,
      newLength,
      newRadius,
      depth + 1,
      params,
      branches,
      leaves,
      maxDepth
    );
  }
}

function createCylinderGeometry(
  branch: BranchData,
  radialSegments: number
): { positions: number[]; indices: number[]; colors: number[]; baseIndex: number } {
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  const { start, end, radius, depth } = branch;
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  direction.normalize();

  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

  const topRadius = radius * 0.7;
  const colorT = Math.min(1, depth / 5);
  const segmentColor = lerpColor(TRUNK_COLOR, DARK_TRUNK_COLOR, colorT);

  for (let i = 0; i <= radialSegments; i++) {
    const angle = (i / radialSegments) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const bottomLocal = new THREE.Vector3(cosA * radius, 0, sinA * radius);
    const topLocal = new THREE.Vector3(cosA * topRadius, length, sinA * topRadius);

    bottomLocal.applyQuaternion(quaternion).add(start);
    topLocal.applyQuaternion(quaternion).add(start);

    positions.push(bottomLocal.x, bottomLocal.y, bottomLocal.z);
    colors.push(segmentColor.r, segmentColor.g, segmentColor.b);

    positions.push(topLocal.x, topLocal.y, topLocal.z);
    colors.push(segmentColor.r * 1.1, segmentColor.g * 1.1, segmentColor.b * 1.1);
  }

  for (let i = 0; i < radialSegments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = i * 2 + 2;
    const d = i * 2 + 3;
    indices.push(a, b, d, a, d, c);
  }

  return { positions, indices, colors, baseIndex: 0 };
}

function buildBranchMeshData(branches: BranchData[]): {
  positions: Float32Array;
  indices: Uint32Array;
  colors: Float32Array;
} {
  const radialSegments = 8;
  let totalVertices = 0;
  let totalIndices = 0;

  for (const branch of branches) {
    totalVertices += (radialSegments + 1) * 2;
    totalIndices += radialSegments * 6;
  }

  const positions = new Float32Array(totalVertices * 3);
  const colors = new Float32Array(totalVertices * 3);
  const indices = new Uint32Array(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const branch of branches) {
    const result = createCylinderGeometry(branch, radialSegments);
    const vertexCount = result.positions.length / 3;

    for (let i = 0; i < result.positions.length; i++) {
      positions[vertexOffset * 3 + i] = result.positions[i];
      colors[vertexOffset * 3 + i] = result.colors[i];
    }

    for (let i = 0; i < result.indices.length; i++) {
      indices[indexOffset + i] = result.indices[i] + vertexOffset;
    }

    vertexOffset += vertexCount;
    indexOffset += result.indices.length;
  }

  return { positions, indices, colors };
}

function buildLeafMeshData(leaves: LeafData[], light: number): {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
} {
  const saturation = 0.5 + light * 0.3;
  const baseGreen = new THREE.Color().setHSL(0.3, saturation, 0.35);
  const lightGreen = new THREE.Color().setHSL(0.35, saturation, 0.5);

  const totalVertices = leaves.length * 4;
  const totalIndices = leaves.length * 6;

  const positions = new Float32Array(totalVertices * 3);
  const colors = new Float32Array(totalVertices * 3);
  const indices = new Uint32Array(totalIndices);

  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i];
    const vi = i * 4 * 3;
    const ii = i * 6;
    const ci = i * 4 * 3;

    const right = new THREE.Vector3(1, 0, 0);
    if (Math.abs(leaf.normal.dot(right)) > 0.9) {
      right.set(0, 1, 0);
    }
    const tangent = new THREE.Vector3().crossVectors(leaf.normal, right).normalize();
    const bitangent = new THREE.Vector3().crossVectors(leaf.normal, tangent).normalize();

    const halfSize = leaf.size * 0.5;
    const corners = [
      new THREE.Vector3().copy(tangent).multiplyScalar(-halfSize).add(bitangent.clone().multiplyScalar(-halfSize * 0.5)),
      new THREE.Vector3().copy(tangent).multiplyScalar(halfSize).add(bitangent.clone().multiplyScalar(-halfSize * 0.5)),
      new THREE.Vector3().copy(tangent).multiplyScalar(halfSize).add(bitangent.clone().multiplyScalar(halfSize * 0.8)),
      new THREE.Vector3().copy(tangent).multiplyScalar(-halfSize).add(bitangent.clone().multiplyScalar(halfSize * 0.8))
    ];

    for (let j = 0; j < 4; j++) {
      const pos = corners[j].add(leaf.position);
      positions[vi + j * 3] = pos.x;
      positions[vi + j * 3 + 1] = pos.y;
      positions[vi + j * 3 + 2] = pos.z;

      const colorT = j < 2 ? 0 : 1;
      const leafColor = lerpColor(baseGreen, lightGreen, colorT);
      colors[ci + j * 3] = leafColor.r;
      colors[ci + j * 3 + 1] = leafColor.g;
      colors[ci + j * 3 + 2] = leafColor.b;
    }

    const baseIdx = i * 4;
    indices[ii] = baseIdx;
    indices[ii + 1] = baseIdx + 1;
    indices[ii + 2] = baseIdx + 2;
    indices[ii + 3] = baseIdx;
    indices[ii + 4] = baseIdx + 2;
    indices[ii + 5] = baseIdx + 3;
  }

  return { positions, colors, indices };
}

export function createTree(params: TreeParams): TreeMeshData {
  const baseHeight = 5 * params.water;
  const maxDepth = Math.floor(4 + params.light * 1.5);
  const trunkRadius = 0.25 + params.water * 0.1;
  const trunkLength = baseHeight * 0.35;

  const branches: BranchData[] = [];
  const leaves: LeafData[] = [];

  const trunkStart = new THREE.Vector3(0, 0, 0);
  const trunkDirection = new THREE.Vector3(0, 1, 0);

  generateBranchSegments(
    trunkStart,
    trunkDirection,
    trunkLength,
    trunkRadius,
    0,
    params,
    branches,
    leaves,
    maxDepth
  );

  let treeHeight = 0;
  for (const branch of branches) {
    treeHeight = Math.max(treeHeight, branch.end.y);
  }

  const branchData = buildBranchMeshData(branches);
  const leafData = buildLeafMeshData(leaves, params.light);

  return {
    branchPositions: branchData.positions,
    branchIndices: branchData.indices,
    branchColors: branchData.colors,
    leafPositions: leafData.positions,
    leafColors: leafData.colors,
    leafIndices: leafData.indices,
    stats: {
      height: treeHeight,
      branchCount: branches.length,
      leafCount: leaves.length
    },
    branches,
    leaves
  };
}

export function createTreeMesh(data: TreeMeshData, params: TreeParams): TreeObject {
  const group = new THREE.Group();

  const branchGeometry = new THREE.BufferGeometry();
  branchGeometry.setAttribute('position', new THREE.BufferAttribute(data.branchPositions, 3));
  branchGeometry.setAttribute('color', new THREE.BufferAttribute(data.branchColors, 3));
  branchGeometry.setIndex(new THREE.BufferAttribute(data.branchIndices, 1));
  branchGeometry.computeVertexNormals();

  const branchMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0
  });

  const branchMesh = new THREE.Mesh(branchGeometry, branchMaterial);
  branchMesh.castShadow = true;
  branchMesh.receiveShadow = true;
  group.add(branchMesh);

  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute('position', new THREE.BufferAttribute(data.leafPositions, 3));
  leafGeometry.setAttribute('color', new THREE.BufferAttribute(data.leafColors, 3));
  leafGeometry.setIndex(new THREE.BufferAttribute(data.leafIndices, 1));
  leafGeometry.computeVertexNormals();

  const leafMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  const leafMesh = new THREE.Mesh(leafGeometry, leafMaterial);
  leafMesh.castShadow = true;
  leafMesh.receiveShadow = true;
  group.add(leafMesh);

  return { group, branchMesh, leafMesh, data, params };
}

export function interpolateTreeData(
  from: TreeMeshData,
  to: TreeMeshData,
  t: number
): { branchPositions: Float32Array; leafPositions: Float32Array } {
  const branchCount = Math.min(from.branchPositions.length, to.branchPositions.length);
  const leafCount = Math.min(from.leafPositions.length, to.leafPositions.length);

  const branchPositions = new Float32Array(branchCount);
  const leafPositions = new Float32Array(leafCount);

  for (let i = 0; i < branchCount; i++) {
    branchPositions[i] = from.branchPositions[i] + (to.branchPositions[i] - from.branchPositions[i]) * t;
  }

  for (let i = 0; i < leafCount; i++) {
    leafPositions[i] = from.leafPositions[i] + (to.leafPositions[i] - from.leafPositions[i]) * t;
  }

  const maxBranchCount = Math.max(from.branchPositions.length, to.branchPositions.length);
  if (maxBranchCount > branchCount) {
    const extraPositions = t < 0.5 ? from.branchPositions : to.branchPositions;
    const result = new Float32Array(maxBranchCount);
    result.set(branchPositions, 0);
    for (let i = branchCount; i < maxBranchCount; i++) {
      result[i] = extraPositions[i];
    }
    return {
      branchPositions: result,
      leafPositions
    };
  }

  const maxLeafCount = Math.max(from.leafPositions.length, to.leafPositions.length);
  if (maxLeafCount > leafCount) {
    const extraPositions = t < 0.5 ? from.leafPositions : to.leafPositions;
    const result = new Float32Array(maxLeafCount);
    result.set(leafPositions, 0);
    for (let i = leafCount; i < maxLeafCount; i++) {
      result[i] = extraPositions[i];
    }
    return {
      branchPositions,
      leafPositions: result
    };
  }

  return { branchPositions, leafPositions };
}

export function scaleGrowth(
  data: TreeMeshData,
  t: number
): { branchPositions: Float32Array; leafPositions: Float32Array } {
  const branchPositions = new Float32Array(data.branchPositions);
  const leafPositions = new Float32Array(data.leafPositions);

  const easeT = t * t * (3 - 2 * t);

  for (let i = 0; i < branchPositions.length; i += 3) {
    branchPositions[i] *= easeT;
    branchPositions[i + 1] *= easeT;
    branchPositions[i + 2] *= easeT;
  }

  for (let i = 0; i < leafPositions.length; i += 3) {
    leafPositions[i] *= easeT;
    leafPositions[i + 1] *= easeT;
    leafPositions[i + 2] *= easeT;
  }

  return { branchPositions, leafPositions };
}
