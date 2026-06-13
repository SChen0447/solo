import * as THREE from 'three';

export interface BuildingData {
  mesh: THREE.Mesh;
  height: number;
  width: number;
  depth: number;
  position: THREE.Vector3;
  footprint: number;
  index: number;
}

export interface SceneBuildResult {
  buildings: BuildingData[];
  ground: THREE.Mesh;
  gridHelper: THREE.GridHelper;
  groundSize: number;
}

export interface BuildingParams {
  buildingCount?: { min: number; max: number };
  heightRange?: { min: number; max: number };
  groundSize?: number;
  spreadRange?: number;
  seed?: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function lerpGray(t: number): THREE.Color {
  const v = Math.floor(180 + t * 60);
  return new THREE.Color(v / 255, v / 255, v / 255);
}

export function buildScene(params: BuildingParams = {}): SceneBuildResult {
  const {
    buildingCount = { min: 8, max: 12 },
    heightRange = { min: 10, max: 60 },
    groundSize = 400,
    spreadRange = 160,
    seed = Date.now()
  } = params;

  const rand = seededRandom(seed);
  const sceneGroup = new THREE.Group();

  // ======================== 地面 - 棋盘格材质 ========================
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const tileSize = 64;
  for (let y = 0; y < canvas.height; y += tileSize) {
    for (let x = 0; x < canvas.width; x += tileSize) {
      const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      ctx.fillStyle = isEven ? '#2a2a42' : '#24243a';
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
  const checkerTexture = new THREE.CanvasTexture(canvas);
  checkerTexture.wrapS = THREE.RepeatWrapping;
  checkerTexture.wrapT = THREE.RepeatWrapping;
  checkerTexture.repeat.set(groundSize / 20, groundSize / 20);

  const groundMaterial = new THREE.MeshStandardMaterial({
    map: checkerTexture,
    color: 0x3a3a52,
    roughness: 0.85,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide
  });

  const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  sceneGroup.add(ground);

  // ======================== 发光网格线 ========================
  const gridHelper = new THREE.GridHelper(groundSize, groundSize / 10, 0x5b6cff, 0x3a4080);
  gridHelper.position.y = 0.02;
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.35;
  sceneGroup.add(gridHelper);

  // ======================== 建筑群 ========================
  const buildings: BuildingData[] = [];
  const count = Math.floor(buildingCount.min + rand() * (buildingCount.max - buildingCount.min + 1));
  const halfSpread = spreadRange / 2;

  const placedRects: { x: number; z: number; w: number; d: number }[] = [];
  const minGap = 8;
  let attempts = 0;
  let index = 0;

  while (index < count && attempts < count * 50) {
    attempts++;

    const width = 10 + rand() * 18;
    const depth = 10 + rand() * 18;
    const x = -halfSpread + rand() * spreadRange;
    const z = -halfSpread + rand() * spreadRange;

    let overlaps = false;
    for (const r of placedRects) {
      const dx = Math.abs(x - r.x);
      const dz = Math.abs(z - r.z);
      if (dx < (width + r.w) / 2 + minGap && dz < (depth + r.d) / 2 + minGap) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    placedRects.push({ x, z, w: width, d: depth });
    const height = heightRange.min + rand() * (heightRange.max - heightRange.min);

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const grayColor = lerpGray(index / count);
    const topGloss = new THREE.MeshStandardMaterial({
      color: grayColor,
      roughness: 0.45,
      metalness: 0.25,
      emissive: new THREE.Color(0xffffff).multiplyScalar(0.03),
      emissiveIntensity: 1.0
    });
    const sideMat = new THREE.MeshStandardMaterial({
      color: grayColor,
      roughness: 0.75,
      metalness: 0.08
    });
    const materials = [sideMat, sideMat, topGloss, sideMat, sideMat, sideMat];

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `building_${index}`;
    mesh.userData.buildingIndex = index;

    sceneGroup.add(mesh);

    buildings.push({
      mesh,
      height,
      width,
      depth,
      position: new THREE.Vector3(x, height / 2, z),
      footprint: width * depth,
      index
    });

    index++;
  }

  return {
    buildings,
    ground,
    gridHelper,
    groundSize
  };
}

export { sceneGroup };
const sceneGroup = new THREE.Group();
