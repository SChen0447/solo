import * as THREE from 'three';

export interface BranchData {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  length: number;
  radius: number;
  depth: number;
  maxDepth: number;
  isLeaf: boolean;
  parentId: string | null;
  children: string[];
  mesh?: THREE.Mesh;
  originalEnd?: THREE.Vector3;
  swayOffset?: number;
}

export interface TreeConfig {
  maxDepth: number;
  branchAngle: number;
  initialHeight: number;
  lengthRatio: number;
  initialRadius: number;
  radiusRatio: number;
}

export const DEFAULT_CONFIG: TreeConfig = {
  maxDepth: 6,
  branchAngle: 30,
  initialHeight: 1.5,
  lengthRatio: 0.65,
  initialRadius: 0.08,
  radiusRatio: 0.7,
};

let branchIdCounter = 0;

function generateBranchId(): string {
  return `branch_${++branchIdCounter}`;
}

function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t);
}

const BARK_BROWN = new THREE.Color(0x8B4513);
const LEAF_GREEN = new THREE.Color(0x3CB371);

function createBarkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#6B3810');
  gradient.addColorStop(0.5, '#8B4513');
  gradient.addColorStop(1, '#5C2E0A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 256);
  
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 256;
    const w = Math.random() * 3 + 1;
    const h = Math.random() * 8 + 2;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(139,90,43,0.3)';
    ctx.fillRect(x, y, w, h);
  }
  
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 64, 0);
    for (let y = 0; y < 256; y += 10) {
      ctx.lineTo(Math.random() * 64, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

let barkTexture: THREE.CanvasTexture | null = null;

export function getBarkTexture(): THREE.CanvasTexture {
  if (!barkTexture) {
    barkTexture = createBarkTexture();
  }
  return barkTexture;
}

function createBranchMesh(branch: BranchData): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(branch.end, branch.start);
  const length = direction.length();
  
  const geometry = new THREE.CylinderGeometry(
    branch.radius * 0.6,
    branch.radius,
    length,
    8
  );
  
  const depthRatio = branch.depth / branch.maxDepth;
  const color = lerpColor(BARK_BROWN, LEAF_GREEN, depthRatio);
  
  const materialParams: THREE.MeshLambertMaterialParameters = {
    color: color,
  };
  if (branch.depth < 3) {
    materialParams.map = getBarkTexture();
  }
  const material = new THREE.MeshLambertMaterial(materialParams);
  
  const mesh = new THREE.Mesh(geometry, material);
  
  const midpoint = new THREE.Vector3().addVectors(branch.start, branch.end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  
  const up = new THREE.Vector3(0, 1, 0);
  direction.normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
  mesh.quaternion.copy(quaternion);
  
  mesh.userData = { branchId: branch.id, branch: branch };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  return mesh;
}

function recursiveGenerate(
  start: THREE.Vector3,
  direction: THREE.Vector3,
  length: number,
  radius: number,
  depth: number,
  config: TreeConfig,
  parentId: string | null,
  branches: Map<string, BranchData>
): string[] {
  if (depth > config.maxDepth || length < 0.02) {
    return [];
  }

  const end = new THREE.Vector3().addVectors(
    start,
    direction.clone().multiplyScalar(length)
  );

  const branchId = generateBranchId();
  const branch: BranchData = {
    id: branchId,
    start: start.clone(),
    end: end.clone(),
    originalEnd: end.clone(),
    length,
    radius,
    depth,
    maxDepth: config.maxDepth,
    isLeaf: depth === config.maxDepth,
    parentId,
    children: [],
    swayOffset: Math.random() * Math.PI * 2,
  };

  branches.set(branchId, branch);

  if (depth < config.maxDepth) {
    const angleRad = (config.branchAngle * Math.PI) / 180;
    const childCount = depth === 0 ? 3 : 2;

    for (let i = 0; i < childCount; i++) {
      const randomAngleOffset = (Math.random() - 0.5) * angleRad * 0.5;
      const branchAngle = angleRad + randomAngleOffset;
      
      const twistAngle = (i / childCount) * Math.PI * 2 + Math.random() * 0.5;
      
      const childDirection = direction.clone();
      
      const perpendicular = new THREE.Vector3(
        direction.z !== 0 || direction.x !== 0
          ? direction.y
          : 1,
        direction.z !== 0 || direction.x !== 0
          ? -direction.x
          : 0,
        direction.z !== 0 || direction.x !== 0
          ? 0
          : 0
      ).normalize();
      
      if (perpendicular.length() < 0.1) {
        perpendicular.set(1, 0, 0);
      }

      const quat1 = new THREE.Quaternion().setFromAxisAngle(perpendicular, branchAngle);
      const quat2 = new THREE.Quaternion().setFromAxisAngle(direction, twistAngle);
      childDirection.applyQuaternion(quat1);
      childDirection.applyQuaternion(quat2);
      childDirection.normalize();

      const childLength = length * config.lengthRatio;
      const childRadius = radius * config.radiusRatio;

      const childIds = recursiveGenerate(
        end,
        childDirection,
        childLength,
        childRadius,
        depth + 1,
        config,
        branchId,
        branches
      );
      branch.children.push(...childIds);
    }
  }

  return [branchId];
}

export interface TreeResult {
  branches: Map<string, BranchData>;
  meshes: Map<string, THREE.Mesh>;
  group: THREE.Group;
  branchCount: number;
}

export function generateTree(config: Partial<TreeConfig> = {}): TreeResult {
  const fullConfig: TreeConfig = { ...DEFAULT_CONFIG, ...config };
  branchIdCounter = 0;

  const branches = new Map<string, BranchData>();
  const meshes = new Map<string, THREE.Mesh>();
  const group = new THREE.Group();
  group.name = 'fractalTree';

  const start = new THREE.Vector3(0, 0, 0);
  const direction = new THREE.Vector3(0, 1, 0);

  recursiveGenerate(
    start,
    direction,
    fullConfig.initialHeight,
    fullConfig.initialRadius,
    0,
    fullConfig,
    null,
    branches
  );

  branches.forEach((branch) => {
    const mesh = createBranchMesh(branch);
    branch.mesh = mesh;
    meshes.set(branch.id, mesh);
    group.add(mesh);
  });

  return {
    branches,
    meshes,
    group,
    branchCount: branches.size,
  };
}

export function regrowFromNode(
  parentBranch: BranchData,
  breakPoint: THREE.Vector3,
  config: Partial<TreeConfig> = {},
  existingBranches: Map<string, BranchData>,
  treeGroup: THREE.Group
): { newBranches: string[]; newMeshes: THREE.Mesh[] } {
  const fullConfig: TreeConfig = { ...DEFAULT_CONFIG, ...config };
  const newBranches: string[] = [];
  const newMeshes: THREE.Mesh[] = [];

  const parentDirection = new THREE.Vector3().subVectors(parentBranch.end, parentBranch.start).normalize();
  
  const newStart = breakPoint.clone();
  const newLength = parentBranch.length * fullConfig.lengthRatio * 0.8;
  const newRadius = parentBranch.radius * fullConfig.radiusRatio;
  const newDepth = Math.min(parentBranch.depth + 1, fullConfig.maxDepth);

  const angleRad = (fullConfig.branchAngle * Math.PI) / 180;

  for (let i = 0; i < 2; i++) {
    const childDirection = parentDirection.clone();
    const branchAngle = angleRad + (Math.random() - 0.5) * angleRad * 0.3;
    
    const perpendicular = new THREE.Vector3(
      parentDirection.z !== 0 || parentDirection.x !== 0 ? parentDirection.y : 1,
      parentDirection.z !== 0 || parentDirection.x !== 0 ? -parentDirection.x : 0,
      parentDirection.z !== 0 || parentDirection.x !== 0 ? 0 : 0
    ).normalize();

    if (perpendicular.length() < 0.1) {
      perpendicular.set(1, 0, 0);
    }

    const twistAngle = (i / 2) * Math.PI * 2 + Math.random() * 0.5;
    const quat1 = new THREE.Quaternion().setFromAxisAngle(perpendicular, branchAngle);
    const quat2 = new THREE.Quaternion().setFromAxisAngle(parentDirection, twistAngle);
    childDirection.applyQuaternion(quat1);
    childDirection.applyQuaternion(quat2);
    childDirection.normalize();

    const newEnd = newStart.clone().add(childDirection.multiplyScalar(newLength));

    const branchId = generateBranchId();
    const branch: BranchData = {
      id: branchId,
      start: newStart.clone(),
      end: newEnd.clone(),
      originalEnd: newEnd.clone(),
      length: newLength,
      radius: newRadius,
      depth: newDepth,
      maxDepth: fullConfig.maxDepth,
      isLeaf: true,
      parentId: parentBranch.id,
      children: [],
      swayOffset: Math.random() * Math.PI * 2,
    };

    existingBranches.set(branchId, branch);
    parentBranch.children.push(branchId);

    const mesh = createBranchMesh(branch);
    mesh.scale.set(0, 0, 0);
    branch.mesh = mesh;
    treeGroup.add(mesh);

    newBranches.push(branchId);
    newMeshes.push(mesh);
  }

  return { newBranches, newMeshes };
}
