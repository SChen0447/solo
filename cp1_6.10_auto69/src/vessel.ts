import * as THREE from 'three';

export interface VesselData {
  group: THREE.Group;
  mainPath: THREE.CatmullRomCurve3;
  branchPath1: THREE.CatmullRomCurve3;
  branchPath2: THREE.CatmullRomCurve3;
  aneurysmCenter: THREE.Vector3;
  aneurysmRadius: number;
  slowZoneRadius: number;
  mesh: THREE.Mesh;
}

const MAIN_VESSEL_RADIUS = 2.5;
const BRANCH_VESSEL_RADIUS = 1.8;
const ANEURYSM_RADIUS = 1.5;
const BIFURCATION_ANGLE = Math.PI / 4;
const SLOW_ZONE_RADIUS = 4.5;

export function createVessel(): VesselData {
  const group = new THREE.Group();

  const mainStart = new THREE.Vector3(-10, 0, 0);
  const mainMid1 = new THREE.Vector3(-4, 0, 0);
  const mainBifurcation = new THREE.Vector3(0, 0, 0);
  const mainMid2 = new THREE.Vector3(3, 0, 0);
  const mainEnd = new THREE.Vector3(8, 0, 0);

  const mainPath = new THREE.CatmullRomCurve3([
    mainStart,
    mainMid1,
    mainBifurcation,
    mainMid2,
    mainEnd,
  ]);

  const branch1Start = mainBifurcation.clone();
  const branch1Mid = new THREE.Vector3(
    3 * Math.cos(BIFURCATION_ANGLE),
    3 * Math.sin(BIFURCATION_ANGLE),
    0
  );
  const branch1End = new THREE.Vector3(
    8 * Math.cos(BIFURCATION_ANGLE),
    8 * Math.sin(BIFURCATION_ANGLE),
    0
  );
  const branchPath1 = new THREE.CatmullRomCurve3([branch1Start, branch1Mid, branch1End]);

  const branch2Start = mainBifurcation.clone();
  const branch2Mid = new THREE.Vector3(
    3 * Math.cos(-BIFURCATION_ANGLE),
    3 * Math.sin(-BIFURCATION_ANGLE),
    0
  );
  const branch2End = new THREE.Vector3(
    8 * Math.cos(-BIFURCATION_ANGLE),
    8 * Math.sin(-BIFURCATION_ANGLE),
    0
  );
  const branchPath2 = new THREE.CatmullRomCurve3([branch2Start, branch2Mid, branch2End]);

  const mainGeometry = new THREE.TubeGeometry(mainPath, 128, MAIN_VESSEL_RADIUS, 32, false);
  const branch1Geometry = new THREE.TubeGeometry(branchPath1, 80, BRANCH_VESSEL_RADIUS, 32, false);
  const branch2Geometry = new THREE.TubeGeometry(branchPath2, 80, BRANCH_VESSEL_RADIUS, 32, false);

  const mergedGeometry = mergeGeometries([mainGeometry, branch1Geometry, branch2Geometry]);

  const vesselMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe74c3c,
    transparent: true,
    opacity: 0.3,
    roughness: 0.3,
    metalness: 0.1,
    transmission: 0.6,
    thickness: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const vesselMesh = new THREE.Mesh(mergedGeometry, vesselMaterial);
  vesselMesh.name = 'vessel';
  group.add(vesselMesh);

  const aneurysmCenter = mainBifurcation.clone().add(new THREE.Vector3(0, -ANEURYSM_RADIUS * 0.5, 0));
  const aneurysmShape = new THREE.Shape();
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI;
    const x = Math.cos(angle) * ANEURYSM_RADIUS;
    const y = Math.sin(angle) * ANEURYSM_RADIUS - ANEURYSM_RADIUS * 0.5;
    if (i === 0) {
      aneurysmShape.moveTo(x, y);
    } else {
      aneurysmShape.lineTo(x, y);
    }
  }
  aneurysmShape.closePath();

  const aneurysmGeometry = new THREE.LatheGeometry(aneurysmShape.getPoints(64), 48);
  aneurysmGeometry.translate(aneurysmCenter.x, aneurysmCenter.y, aneurysmCenter.z);

  const aneurysmMesh = new THREE.Mesh(aneurysmGeometry, vesselMaterial);
  aneurysmMesh.name = 'aneurysm';
  group.add(aneurysmMesh);

  const frameGeometry = new THREE.EdgesGeometry(aneurysmGeometry, 20);
  const frameMaterial = new THREE.LineBasicMaterial({
    color: 0xff6b6b,
    transparent: true,
    opacity: 0.5,
  });
  const frameLines = new THREE.LineSegments(frameGeometry, frameMaterial);
  group.add(frameLines);

  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const highlightMesh = new THREE.Mesh(aneurysmGeometry, highlightMaterial);
  highlightMesh.name = 'aneurysmHighlight';
  group.add(highlightMesh);

  return {
    group,
    mainPath,
    branchPath1,
    branchPath2,
    aneurysmCenter,
    aneurysmRadius: ANEURYSM_RADIUS,
    slowZoneRadius: SLOW_ZONE_RADIUS,
    mesh: vesselMesh,
  };
}

function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const mergedGeometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let indexOffset = 0;

  for (const geometry of geometries) {
    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    const idx = geometry.index;

    if (!pos) continue;

    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (norm) {
        normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      }
      if (uv) {
        uvs.push(uv.getX(i), uv.getY(i));
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + indexOffset);
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices.push(i + indexOffset);
      }
    }

    indexOffset += pos.count;
  }

  mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length > 0) {
    mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }
  if (uvs.length > 0) {
    mergedGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }
  mergedGeometry.setIndex(indices);

  return mergedGeometry;
}

export function getPathAt(pathIndex: number, vesselData: VesselData): THREE.CatmullRomCurve3 {
  switch (pathIndex) {
    case 1:
      return vesselData.branchPath1;
    case 2:
      return vesselData.branchPath2;
    default:
      return vesselData.mainPath;
  }
}

export function getPathLength(vesselData: VesselData, pathIndex: number): number {
  const path = getPathAt(pathIndex, vesselData);
  return path.getLength();
}

export function isInSlowZone(position: THREE.Vector3, vesselData: VesselData): boolean {
  return position.distanceTo(vesselData.aneurysmCenter) < vesselData.slowZoneRadius;
}

export function isInAneurysmZone(position: THREE.Vector3, vesselData: VesselData): boolean {
  const dx = position.x - vesselData.aneurysmCenter.x;
  const dy = position.y - vesselData.aneurysmCenter.y;
  const dz = position.z - vesselData.aneurysmCenter.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return dist < vesselData.aneurysmRadius * 1.3;
}

export function getVortexOffset(
  position: THREE.Vector3,
  vesselData: VesselData,
  time: number
): THREE.Vector3 {
  const offset = new THREE.Vector3();
  if (!isInAneurysmZone(position, vesselData)) return offset;

  const localPos = position.clone().sub(vesselData.aneurysmCenter);
  const dist = localPos.length();
  const intensity = Math.max(0, 1 - dist / (vesselData.aneurysmRadius * 1.5));

  const angle = time * 2.5 + Math.atan2(localPos.y, localPos.x);
  const radius = Math.sqrt(localPos.x * localPos.x + localPos.y * localPos.y) * 0.15;

  offset.x = Math.cos(angle) * radius * intensity;
  offset.y = Math.sin(angle) * radius * intensity;
  offset.z = Math.sin(time * 3 + dist) * 0.15 * intensity;

  return offset;
}
