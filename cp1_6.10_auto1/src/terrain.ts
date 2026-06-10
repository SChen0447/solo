import * as THREE from 'three';

export interface CoffeeRegion {
  id: number;
  name: string;
  nameEn: string;
  bean: string;
  center: THREE.Vector2;
  radius: number;
  color: THREE.Color;
  colorHex: string;
  flavor: {
    acidity: number;
    sweetness: number;
    body: number;
    aroma: number;
    aftertaste: number;
    balance: number;
  };
  description: string;
}

export interface TerrainData {
  mesh: THREE.Mesh;
  highlightMesh: THREE.LineSegments;
  regions: CoffeeRegion[];
  getRegionAt: (worldX: number, worldZ: number) => CoffeeRegion | null;
  getTriangleCount: () => number;
}

const SEGMENTS = 180;
const TERRAIN_SIZE = 40;
const MAX_HEIGHT = 5;

function noise2D(x: number, y: number, seed: number = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const a = noise2D(ix, iy, seed);
  const b = noise2D(ix + 1, iy, seed);
  const c = noise2D(ix, iy + 1, seed);
  const d = noise2D(ix + 1, iy + 1, seed);

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}

function fbm(x: number, y: number, octaves: number = 4, seed: number = 0): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency, seed + i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

function createRegions(): CoffeeRegion[] {
  return [
    {
      id: 0,
      name: '埃塞俄比亚 耶加雪菲',
      nameEn: 'Yirgacheffe, Ethiopia',
      bean: 'Arabica Heirloom',
      center: new THREE.Vector2(-10, -8),
      radius: 7,
      color: new THREE.Color(0xff6b6b),
      colorHex: '#ff6b6b',
      flavor: {
        acidity: 92,
        sweetness: 85,
        body: 60,
        aroma: 95,
        aftertaste: 88,
        balance: 82
      },
      description: '以花香和柑橘风味闻名，带有茉莉花、柠檬和佛手柑的精致香气，口感明亮活泼，是精品咖啡的代表产区之一。'
    },
    {
      id: 1,
      name: '哥伦比亚 慧兰',
      nameEn: 'Huila, Colombia',
      bean: 'Castillo / Caturra',
      center: new THREE.Vector2(10, -6),
      radius: 6.5,
      color: new THREE.Color(0xffd93d),
      colorHex: '#ffd93d',
      flavor: {
        acidity: 75,
        sweetness: 88,
        body: 78,
        aroma: 80,
        aftertaste: 76,
        balance: 90
      },
      description: '醇厚平衡的经典风味，带有焦糖、坚果和黑巧克力的香气，酸甜适中，口感圆润顺滑，适合各种冲煮方式。'
    },
    {
      id: 2,
      name: '危地马拉 安提瓜',
      nameEn: 'Antigua, Guatemala',
      bean: 'Bourbon / Typica',
      center: new THREE.Vector2(-8, 10),
      radius: 6,
      color: new THREE.Color(0x4ecdc4),
      colorHex: '#4ecdc4',
      flavor: {
        acidity: 82,
        sweetness: 78,
        body: 85,
        aroma: 86,
        aftertaste: 80,
        balance: 88
      },
      description: '火山土壤赋予独特风味，带有可可、烟熏和香料气息，醇厚度高，余韵绵长，是中美洲咖啡的标杆。'
    },
    {
      id: 3,
      name: '肯尼亚 AA',
      nameEn: 'Kenya AA',
      bean: 'SL28 / SL34',
      center: new THREE.Vector2(8, 8),
      radius: 6.5,
      color: new THREE.Color(0x6bcb77),
      colorHex: '#6bcb77',
      flavor: {
        acidity: 95,
        sweetness: 80,
        body: 72,
        aroma: 88,
        aftertaste: 85,
        balance: 80
      },
      description: '强烈的黑醋栗和番茄酸质，带有浆果、葡萄柚和红酒般的复杂风味，层次感丰富，是非洲咖啡的极致代表。'
    }
  ];
}

export function createTerrain(): TerrainData {
  const regions = createRegions();
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const baseColor = new THREE.Color(0x2d2d44);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);

    let height = 0;

    const noiseVal = fbm(x * 0.15, z * 0.15, 5, 42);
    height += (noiseVal - 0.3) * 2.5;

    const sinVal = Math.sin(x * 0.3) * Math.cos(z * 0.25) * 0.8;
    height += sinVal;

    for (const region of regions) {
      const dx = x - region.center.x;
      const dz = z - region.center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < region.radius * 1.5) {
        const falloff = Math.max(0, 1 - dist / (region.radius * 1.5));
        const mountain = falloff * falloff * (3 - 2 * falloff);
        height += mountain * MAX_HEIGHT * (0.7 + noiseVal * 0.3);
      }
    }

    height = Math.max(0, height);
    positions.setY(i, height);

    const color = baseColor.clone();
    for (const region of regions) {
      const dx = x - region.center.x;
      const dz = z - region.center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < region.radius * 1.2) {
        const influence = Math.max(0, 1 - dist / (region.radius * 1.2));
        const blend = influence * influence * (3 - 2 * influence);
        color.lerp(region.color, blend * 0.85);
      }
    }

    const heightFactor = Math.min(height / MAX_HEIGHT, 1);
    if (heightFactor > 0.5) {
      const snowBlend = (heightFactor - 0.5) * 2;
      color.lerp(new THREE.Color(0xd4c5a9), snowBlend * 0.4);
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: false,
    roughness: 0.9,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  const edgesGeometry = new THREE.EdgesGeometry(geometry, 20);
  const edgesMaterial = new THREE.LineBasicMaterial({
    color: 0xc9a66b,
    transparent: true,
    opacity: 0
  });
  const highlightMesh = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  highlightMesh.position.copy(mesh.position);

  function getRegionAt(worldX: number, worldZ: number): CoffeeRegion | null {
    for (const region of regions) {
      const dx = worldX - region.center.x;
      const dz = worldZ - region.center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < region.radius) {
        return region;
      }
    }
    return null;
  }

  function getTriangleCount(): number {
    return SEGMENTS * SEGMENTS * 2;
  }

  return {
    mesh,
    highlightMesh,
    regions,
    getRegionAt,
    getTriangleCount
  };
}
