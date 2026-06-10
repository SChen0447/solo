import * as THREE from 'three';

export interface FossilInfo {
  name: string;
  era: string;
  size: string;
  description: string;
  detail: string;
}

export interface FossilGroup {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  hotspots: THREE.Mesh[];
  innerSkeleton: THREE.Mesh | null;
  info: FossilInfo;
  baseY: number;
  angularSpeed: number;
  floatPhase: number;
}

const SANDSTONE_COLORS = [0xc4a77d, 0xa68b5f, 0x8a7148, 0x6e5c3e];

function createSandstoneMaterial(colorIndex: number = 0): THREE.MeshStandardMaterial {
  const color = SANDSTONE_COLORS[colorIndex % SANDSTONE_COLORS.length];
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: false
  });
}

function perturbNormals(geometry: THREE.BufferGeometry, intensity: number = 0.02): void {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const count = posAttr.count;
  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    posAttr.setX(i, x + (Math.random() - 0.5) * intensity);
    posAttr.setY(i, y + (Math.random() - 0.5) * intensity);
    posAttr.setZ(i, z + (Math.random() - 0.5) * intensity);
  }
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}

function createAmmonite(): { group: THREE.Group; meshes: THREE.Mesh[] } {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  const points: THREE.Vector2[] = [];
  const segments = 20;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const radius = 0.05 + t * 0.45;
    const y = Math.sin(t * Math.PI * 2) * 0.05;
    points.push(new THREE.Vector2(radius, y));
  }

  const spiralGeo = new THREE.LatheGeometry(points, 48);
  perturbNormals(spiralGeo, 0.015);
  const spiralMat = createSandstoneMaterial(0);
  const spiral = new THREE.Mesh(spiralGeo, spiralMat);
  group.add(spiral);
  meshes.push(spiral);

  const ringCount = 12;
  for (let i = 0; i < ringCount; i++) {
    const t = (i + 1) / (ringCount + 1);
    const ringRadius = 0.05 + t * 0.45;
    const ringGeo = new THREE.TorusGeometry(ringRadius, 0.015, 8, 32);
    const ringMat = createSandstoneMaterial(1);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = Math.sin(t * Math.PI * 2) * 0.05;
    group.add(ring);
    meshes.push(ring);
  }

  const centerGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const centerMat = createSandstoneMaterial(2);
  const center = new THREE.Mesh(centerGeo, centerMat);
  group.add(center);
  meshes.push(center);

  return { group, meshes };
}

function createTrilobite(): { group: THREE.Group; meshes: THREE.Mesh[] } {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  const headGeo = new THREE.BoxGeometry(0.5, 0.12, 0.35);
  perturbNormals(headGeo, 0.012);
  const headMat = createSandstoneMaterial(1);
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 0, -0.35);
  head.scale.set(1, 0.8, 1);
  group.add(head);
  meshes.push(head);

  const eyeGeo = new THREE.SphereGeometry(0.04, 12, 12);
  const eyeMat = createSandstoneMaterial(3);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.18, 0.06, -0.3);
  group.add(leftEye);
  meshes.push(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.18, 0.06, -0.3);
  group.add(rightEye);
  meshes.push(rightEye);

  const thoraxCount = 6;
  for (let i = 0; i < thoraxCount; i++) {
    const segGeo = new THREE.BoxGeometry(0.52, 0.1, 0.1);
    perturbNormals(segGeo, 0.01);
    const segMat = createSandstoneMaterial(i % 2 === 0 ? 0 : 2);
    const seg = new THREE.Mesh(segGeo, segMat);
    seg.position.set(0, 0, -0.1 + i * 0.1);
    group.add(seg);
    meshes.push(seg);
  }

  const axisGeo = new THREE.BoxGeometry(0.12, 0.14, 0.7);
  perturbNormals(axisGeo, 0.01);
  const axisMat = createSandstoneMaterial(3);
  const axis = new THREE.Mesh(axisGeo, axisMat);
  axis.position.set(0, 0.02, 0);
  group.add(axis);
  meshes.push(axis);

  const tailGeo = new THREE.BoxGeometry(0.4, 0.12, 0.3);
  perturbNormals(tailGeo, 0.012);
  const tailMat = createSandstoneMaterial(1);
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(0, 0, 0.4);
  tail.scale.set(1, 0.8, 1);
  group.add(tail);
  meshes.push(tail);

  return { group, meshes };
}

function createOrthoceras(): { group: THREE.Group; meshes: THREE.Mesh[] } {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];

  const coneGeo = new THREE.CylinderGeometry(0.05, 0.25, 1.2, 24, 1, false);
  perturbNormals(coneGeo, 0.015);
  const coneMat = createSandstoneMaterial(0);
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.rotation.x = Math.PI / 2;
  group.add(cone);
  meshes.push(cone);

  const septaCount = 10;
  for (let i = 0; i < septaCount; i++) {
    const t = (i + 1) / (septaCount + 1);
    const radius = 0.05 + t * 0.2;
    const septaGeo = new THREE.TorusGeometry(radius, 0.008, 6, 24);
    const septaMat = createSandstoneMaterial(2);
    const septa = new THREE.Mesh(septaGeo, septaMat);
    septa.rotation.y = Math.PI / 2;
    septa.position.z = -0.6 + t * 1.2;
    group.add(septa);
    meshes.push(septa);
  }

  const tipGeo = new THREE.SphereGeometry(0.05, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const tipMat = createSandstoneMaterial(3);
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -0.6;
  group.add(tip);
  meshes.push(tip);

  const openingGeo = new THREE.RingGeometry(0.18, 0.25, 24);
  const openingMat = createSandstoneMaterial(1);
  const opening = new THREE.Mesh(openingGeo, openingMat);
  opening.rotation.y = Math.PI / 2;
  opening.position.z = 0.6;
  group.add(opening);
  meshes.push(opening);

  return { group, meshes };
}

function createInnerSkeleton(type: string): THREE.Mesh {
  let geometry: THREE.BufferGeometry;

  switch (type) {
    case 'ammonite':
      geometry = new THREE.SphereGeometry(0.35, 12, 12);
      break;
    case 'trilobite':
      geometry = new THREE.SphereGeometry(0.4, 12, 12);
      geometry.scale(0.8, 0.4, 1.4);
      break;
    case 'orthoceras':
      geometry = new THREE.SphereGeometry(0.3, 12, 12);
      geometry.scale(0.4, 0.4, 2.2);
      break;
    default:
      geometry = new THREE.SphereGeometry(0.3, 12, 12);
  }

  const wireframeGeo = new THREE.WireframeGeometry(geometry);
  const material = new THREE.LineBasicMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.0
  });
  const skeleton = new THREE.LineSegments(wireframeGeo, material);
  skeleton.visible = false;
  return skeleton as unknown as THREE.Mesh;
}

function createHotspotMarkers(
  fossilGroup: THREE.Group,
  meshes: THREE.Mesh[],
  count: number
): THREE.Mesh[] {
  const hotspots: THREE.Mesh[] = [];
  const raycaster = new THREE.Raycaster();
  const tmpBox = new THREE.Box3().setFromObject(fossilGroup);
  const center = new THREE.Vector3();
  tmpBox.getCenter(center);

  let placed = 0;
  let attempts = 0;
  const maxAttempts = count * 20;

  while (placed < count && attempts < maxAttempts) {
    attempts++;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 3;
    const rayOrigin = new THREE.Vector3(
      center.x + r * Math.sin(phi) * Math.cos(theta),
      center.y + r * Math.sin(phi) * Math.sin(theta),
      center.z + r * Math.cos(phi)
    );
    const rayDir = new THREE.Vector3().subVectors(center, rayOrigin).normalize();
    raycaster.set(rayOrigin, rayDir);
    const hits = raycaster.intersectObjects(meshes, false);

    if (hits.length > 0) {
      const hit = hits[0];
      const ringGeo = new THREE.RingGeometry(0.03, 0.04, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(hit.point);
      const normal = hit.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
      normal.transformDirection(hit.object.matrixWorld);
      ring.lookAt(ring.position.clone().add(normal));
      ring.userData = { isHotspot: true };
      fossilGroup.add(ring);
      hotspots.push(ring);
      placed++;
    }
  }

  return hotspots;
}

const FOSSIL_DATA: Array<{
  type: string;
  info: FossilInfo;
  creator: () => { group: THREE.Group; meshes: THREE.Mesh[] };
  hotspotCount: number;
}> = [
  {
    type: 'ammonite',
    info: {
      name: '菊石',
      era: '泥盆纪',
      size: '直径3-8cm',
      description: '螺旋状外壳，表面具显著肋纹，是古生代重要的标准化石。',
      detail: '壳纹细节放大\n肋状突起清晰可见'
    },
    creator: createAmmonite,
    hotspotCount: 10
  },
  {
    type: 'trilobite',
    info: {
      name: '三叶虫',
      era: '寒武纪',
      size: '体长2-15cm',
      description: '背甲纵分为三叶，具复眼结构，为节肢动物远祖。',
      detail: '背甲轴叶纹理\n分节结构明显'
    },
    creator: createTrilobite,
    hotspotCount: 11
  },
  {
    type: 'orthoceras',
    info: {
      name: '直角石',
      era: '奥陶纪',
      size: '壳长10-40cm',
      description: '长锥形直壳，内部具气室隔板，为头足类原始类型。',
      detail: '气室隔板纹理\n壳壁生长纹路'
    },
    creator: createOrthoceras,
    hotspotCount: 9
  }
];

export function createFossils(scene: THREE.Scene): FossilGroup[] {
  const fossils: FossilGroup[] = [];
  const radius = 5;
  const count = FOSSIL_DATA.length;

  FOSSIL_DATA.forEach((data, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const { group, meshes } = data.creator();

    group.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );

    const innerSkeleton = createInnerSkeleton(data.type);
    group.add(innerSkeleton);

    const hotspots = createHotspotMarkers(group, meshes, data.hotspotCount);

    scene.add(group);

    fossils.push({
      group,
      meshes,
      hotspots,
      innerSkeleton,
      info: data.info,
      baseY: group.position.y,
      angularSpeed: 0.005,
      floatPhase: Math.random() * Math.PI * 2
    });
  });

  return fossils;
}
