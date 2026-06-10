import * as THREE from 'three';

export function createTerrain(seed: number = 42): { terrain: THREE.Mesh; grid: THREE.LineSegments } {
  const size = 20;
  const segments = 20;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const random = seededRandom(seed);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const height = (random() - 0.5) * 2 + Math.sin(x * 0.5) * 0.5 + Math.cos(z * 0.5) * 0.5;
    positions.setY(i, height);
  }

  geometry.computeVertexNormals();

  const colorStart = new THREE.Color('#2E7D32');
  const colorEnd = new THREE.Color('#81C784');
  const colors = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    const t = random();
    const color = colorStart.clone().lerp(colorEnd, t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });

  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;

  const gridHelper = new THREE.GridHelper(size, segments, 0xcccccc, 0xcccccc);
  gridHelper.position.y = 0.01;
  const gridGeometry = gridHelper.geometry;
  gridGeometry.computeBoundingBox();
  const lineSegments = new THREE.LineSegments(
    gridGeometry,
    new THREE.LineDashedMaterial({
      color: 0xcccccc,
      dashSize: 0.3,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.4,
    })
  );
  lineSegments.position.copy(gridHelper.position);
  lineSegments.computeLineDistances();

  return { terrain, grid: lineSegments };
}

export function getTerrainHeightAt(terrain: THREE.Mesh, x: number, z: number): number {
  const geometry = terrain.geometry as THREE.PlaneGeometry;
  const size = geometry.parameters.width;
  const segments = geometry.parameters.widthSegments;
  const halfSize = size / 2;
  const cellSize = size / segments;

  const gridX = Math.floor((x + halfSize) / cellSize);
  const gridZ = Math.floor((z + halfSize) / cellSize);

  if (gridX < 0 || gridX >= segments || gridZ < 0 || gridZ >= segments) {
    return 0;
  }

  const positions = geometry.attributes.position;
  const getHeight = (gx: number, gz: number) => {
    const index = gz * (segments + 1) + gx;
    return positions.getY(index);
  };

  const h00 = getHeight(gridX, gridZ);
  const h10 = getHeight(gridX + 1, gridZ);
  const h01 = getHeight(gridX, gridZ + 1);
  const h11 = getHeight(gridX + 1, gridZ + 1);

  const localX = ((x + halfSize) % cellSize) / cellSize;
  const localZ = ((z + halfSize) % cellSize) / cellSize;

  const h1 = h00 + (h10 - h00) * localX;
  const h2 = h01 + (h11 - h01) * localX;

  return h1 + (h2 - h1) * localZ;
}

function seededRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
