import * as THREE from 'three';

export interface TreeResult {
  treeGroup: THREE.Group;
  orbGroup: THREE.Group;
  orbs: THREE.Mesh[];
  orbGlows: THREE.Mesh[];
  branchSegments: { start: THREE.Vector3; end: THREE.Vector3; mesh: THREE.Mesh }[];
}

const ORB_COLORS = [
  0xff2233, 0xff8800, 0xffdd00, 0x44ff44,
  0x33ddff, 0x8866ff, 0xff44aa, 0xffaa88
];

export function generateTree(scene: THREE.Scene): TreeResult {
  const treeGroup = new THREE.Group();
  const orbGroup = new THREE.Group();
  const orbs: THREE.Mesh[] = [];
  const orbGlows: THREE.Mesh[] = [];
  const branchSegments: { start: THREE.Vector3; end: THREE.Vector3; mesh: THREE.Mesh }[] = [];

  const endPoints: THREE.Vector3[] = [];

  function createBranch(
    start: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    thickness: number,
    depth: number,
    maxDepth: number,
    colorProgress: number
  ) {
    if (depth > maxDepth) {
      endPoints.push(start.clone());
      return;
    }

    const end = start.clone().add(direction.clone().multiplyScalar(length));

    const startColor = new THREE.Color(0x3a2a1a);
    const endColor = new THREE.Color(0x2a3a4a);
    const branchColor = startColor.clone().lerp(endColor, colorProgress);

    const geometry = new THREE.CylinderGeometry(thickness * 0.6, thickness, length, 8);
    const material = new THREE.MeshStandardMaterial({
      color: branchColor,
      transparent: true,
      opacity: 0.75,
      roughness: 0.6,
      metalness: 0.2,
      emissive: branchColor,
      emissiveIntensity: 0.05
    });

    const mesh = new THREE.Mesh(geometry, material);

    const midPoint = start.clone().add(end).multiplyScalar(0.5);
    mesh.position.copy(midPoint);

    const up = new THREE.Vector3(0, 1, 0);
    const dir = direction.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
    mesh.quaternion.copy(quaternion);

    treeGroup.add(mesh);
    branchSegments.push({ start: start.clone(), end: end.clone(), mesh });

    const branchCount = depth === 0 ? 3 : (depth < maxDepth - 1 ? 2 + Math.floor(Math.random() * 2) : 2);

    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const spread = 0.4 + Math.random() * 0.3;

      const newDir = direction.clone().normalize();
      const tangent = new THREE.Vector3(
        Math.cos(angle) * spread,
        (Math.random() - 0.3) * 0.5,
        Math.sin(angle) * spread
      ).normalize();

      const finalDir = newDir.clone().add(tangent).normalize();

      const newLength = length * (0.65 + Math.random() * 0.15);
      const newThickness = Math.max(0.1, thickness * 0.7);

      createBranch(
        end,
        finalDir,
        newLength,
        newThickness,
        depth + 1,
        maxDepth,
        Math.min(1, colorProgress + 0.15)
      );
    }
  }

  const trunkStart = new THREE.Vector3(0, -2, 0);
  const trunkDir = new THREE.Vector3(0, 1, 0);
  createBranch(trunkStart, trunkDir, 3.0, 0.3, 0, 4, 0);

  const selectedEndPoints = selectSpreadPoints(endPoints, 8);

  selectedEndPoints.forEach((point, index) => {
    const orbGeometry = new THREE.SphereGeometry(0.15, 24, 24);
    const orbMaterial = new THREE.MeshBasicMaterial({
      color: ORB_COLORS[index],
      transparent: true,
      opacity: 0.95
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.copy(point);
    orb.userData = {
      noteIndex: index,
      color: ORB_COLORS[index],
      basePosition: point.clone(),
      isMoving: false,
      glowIntensity: 1
    };

    const glowGeometry = new THREE.SphereGeometry(0.22, 24, 24);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: ORB_COLORS[index],
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    orb.add(glow);

    orbGroup.add(orb);
    orbs.push(orb);
    orbGlows.push(glow);
  });

  scene.add(treeGroup);
  scene.add(orbGroup);

  return { treeGroup, orbGroup, orbs, orbGlows, branchSegments };
}

function selectSpreadPoints(points: THREE.Vector3[], count: number): THREE.Vector3[] {
  if (points.length <= count) return points;

  const selected: THREE.Vector3[] = [];
  const remaining = [...points];

  const sortedByY = [...points].sort((a, b) => b.y - a.y);
  if (sortedByY.length > 0) {
    selected.push(sortedByY[0]);
    const idx = remaining.indexOf(sortedByY[0]);
    if (idx > -1) remaining.splice(idx, 1);
  }

  while (selected.length < count && remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = -1;

    for (let i = 0; i < remaining.length; i++) {
      let minDist = Infinity;
      for (const sel of selected) {
        const dist = remaining[i].distanceTo(sel);
        minDist = Math.min(minDist, dist);
      }
      if (minDist > bestDist) {
        bestDist = minDist;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
}

export function findPathBetweenOrbs(
  from: THREE.Vector3,
  to: THREE.Vector3,
  branchSegments: { start: THREE.Vector3; end: THREE.Vector3 }[]
): THREE.Vector3[] {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const upOffset = new THREE.Vector3(0, 0.8 + Math.random() * 0.4, 0);
  const controlPoint = mid.clone().add(upOffset);

  const randomOffset = new THREE.Vector3(
    (Math.random() - 0.5) * 0.6,
    0,
    (Math.random() - 0.5) * 0.6
  );
  controlPoint.add(randomOffset);

  return [from.clone(), controlPoint, to.clone()];
}

export function getRandomPointOnBranches(
  branchSegments: { start: THREE.Vector3; end: THREE.Vector3 }[]
): THREE.Vector3 {
  const segment = branchSegments[Math.floor(Math.random() * branchSegments.length)];
  const t = 0.2 + Math.random() * 0.6;
  return segment.start.clone().lerp(segment.end, t);
}
