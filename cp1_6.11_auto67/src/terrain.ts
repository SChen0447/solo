import * as THREE from 'three';

export interface TerrainData {
  mesh: THREE.Mesh;
  treePositions: THREE.Vector3[];
  heightField: number[][];
  size: number;
  segments: number;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothNoise(x: number, y: number, rand: () => number, grid: number[][]): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const w = grid.length;
  const h = grid[0].length;
  const a = grid[((ix % w) + w) % w][((iy % h) + h) % h];
  const b = grid[(((ix + 1) % w) + w) % w][((iy % h) + h) % h];
  const c = grid[((ix % w) + w) % w][(((iy + 1) % h) + h) % h];
  const d = grid[(((ix + 1) % w) + w) % w][(((iy + 1) % h) + h) % h];
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const ab = a * (1 - ux) + b * ux;
  const cd = c * (1 - ux) + d * ux;
  return ab * (1 - uy) + cd * uy;
}

function fbm(x: number, y: number, rand: () => number, grid: number[][], octaves: number = 5): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency, rand, grid);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

export function generateTerrain(seed: number = 42, size: number = 200, segments: number = 128): TerrainData {
  const rand = mulberry32(seed);
  const noiseGridSize = 32;
  const noiseGrid: number[][] = [];
  for (let i = 0; i < noiseGridSize; i++) {
    noiseGrid[i] = [];
    for (let j = 0; j < noiseGridSize; j++) {
      noiseGrid[i][j] = rand() * 2 - 1;
    }
  }

  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const heightField: number[][] = [];
  const colors: number[] = [];
  const halfSize = size / 2;
  const segStep = size / segments;

  for (let i = 0; i <= segments; i++) {
    heightField[i] = [];
    for (let j = 0; j <= segments; j++) {
      const idx = i * (segments + 1) + j;
      const nx = (j / segments) * noiseGridSize * 2;
      const ny = (i / segments) * noiseGridSize * 2;
      let h = fbm(nx, ny, rand, noiseGrid, 5);
      h = Math.pow(h, 1.5) * 30 + 5;
      positions.setY(idx, h);
      heightField[i][j] = h;

      const normalizedH = (h - 5) / 30;
      let color: THREE.Color;
      if (normalizedH < 0.15) {
        const t = normalizedH / 0.15;
        color = new THREE.Color().lerpColors(
          new THREE.Color(0x8fbc8f),
          new THREE.Color(0x3cb371),
          t
        );
      } else if (normalizedH < 0.5) {
        const t = (normalizedH - 0.15) / 0.35;
        color = new THREE.Color().lerpColors(
          new THREE.Color(0x3cb371),
          new THREE.Color(0x228b22),
          t
        );
      } else if (normalizedH < 0.75) {
        const t = (normalizedH - 0.5) / 0.25;
        color = new THREE.Color().lerpColors(
          new THREE.Color(0x228b22),
          new THREE.Color(0x6b8e23),
          t
        );
      } else {
        const t = (normalizedH - 0.75) / 0.25;
        color = new THREE.Color().lerpColors(
          new THREE.Color(0x6b8e23),
          new THREE.Color(0xb8860b),
          t
        );
      }
      colors.push(color.r, color.g, color.b);
    }
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: false,
    roughness: 0.85,
    metalness: 0.05
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;

  const treePositions: THREE.Vector3[] = [];
  const treeGridStep = 4;
  const treeDensityRand = mulberry32(seed + 1000);

  for (let i = 0; i <= segments; i += treeGridStep) {
    for (let j = 0; j <= segments; j += treeGridStep) {
      const h = heightField[i][j];
      const normalizedH = (h - 5) / 30;
      let density = 0;
      if (normalizedH < 0.15) {
        density = 0.3;
      } else if (normalizedH < 0.5) {
        density = 0.9;
      } else if (normalizedH < 0.75) {
        density = 0.6;
      } else {
        density = 0.15;
      }

      for (let si = 0; si < treeGridStep; si++) {
        for (let sj = 0; sj < treeGridStep; sj++) {
          const gi = Math.min(i + si, segments);
          const gj = Math.min(j + sj, segments);
          if (treeDensityRand() < density * 0.25) {
            const x = -halfSize + gj * segStep + (treeDensityRand() - 0.5) * segStep;
            const z = -halfSize + gi * segStep + (treeDensityRand() - 0.5) * segStep;
            const gh = heightField[gi][gj];
            const treeHeight = 1.5 + treeDensityRand() * 2.5;
            treePositions.push(new THREE.Vector3(x, gh, z));
          }
        }
      }
    }
  }

  return { mesh, treePositions, heightField, size, segments };
}

export function createTrees(treePositions: THREE.Vector3[]): THREE.InstancedMesh {
  const boxGeo = new THREE.BoxGeometry(0.6, 2.0, 0.6);
  const treeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e7d32,
    roughness: 0.9,
    metalness: 0.0
  });
  const instancedMesh = new THREE.InstancedMesh(boxGeo, treeMaterial, treePositions.length);
  const dummy = new THREE.Object3D();
  const rand = mulberry32(777);

  for (let i = 0; i < treePositions.length; i++) {
    const pos = treePositions[i];
    const scaleY = 0.7 + rand() * 1.3;
    dummy.position.set(pos.x, pos.y + scaleY, pos.z);
    dummy.scale.set(0.7 + rand() * 0.6, scaleY, 0.7 + rand() * 0.6);
    dummy.rotation.y = rand() * Math.PI * 2;
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  instancedMesh.castShadow = true;
  return instancedMesh;
}

export function getHeightAt(x: number, z: number, terrainData: TerrainData): number {
  const { size, segments, heightField } = terrainData;
  const halfSize = size / 2;
  const segStep = size / segments;
  const gx = (x + halfSize) / segStep;
  const gz = (z + halfSize) / segStep;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = gx - ix;
  const fz = gz - iz;
  const clampedIx = Math.max(0, Math.min(segments, ix));
  const clampedIz = Math.max(0, Math.min(segments, iz));
  const clampedIx1 = Math.max(0, Math.min(segments, ix + 1));
  const clampedIz1 = Math.max(0, Math.min(segments, iz + 1));
  const h00 = heightField[clampedIz][clampedIx];
  const h10 = heightField[clampedIz][clampedIx1];
  const h01 = heightField[clampedIz1][clampedIx];
  const h11 = heightField[clampedIz1][clampedIx1];
  const h0 = h00 * (1 - fx) + h10 * fx;
  const h1 = h01 * (1 - fx) + h11 * fx;
  return h0 * (1 - fz) + h1 * fz;
}
