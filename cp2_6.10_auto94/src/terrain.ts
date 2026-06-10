import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export interface TerrainData {
  mesh: THREE.Mesh;
  contours: THREE.LineSegments;
  getHeightAt: (x: number, z: number) => number;
  size: number;
  segments: number;
  minHeight: number;
  maxHeight: number;
}

const TERRAIN_SIZE = 15;
const TERRAIN_SEGMENTS = 128;
const MIN_HEIGHT = -2;
const MAX_HEIGHT = 4;
const CONTOUR_INTERVAL = 0.5;

function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t);
}

function getTerrainColor(height: number, minH: number, maxH: number): THREE.Color {
  const t = Math.max(0, Math.min(1, (height - minH) / (maxH - minH)));
  
  const darkGreen = new THREE.Color(0x2d5016);
  const midGreen = new THREE.Color(0x4a7c23);
  const lightGreen = new THREE.Color(0x7cb342);
  const yellowBrown = new THREE.Color(0xc9a961);
  const brown = new THREE.Color(0x8b6914);
  
  if (t < 0.2) {
    return lerpColor(darkGreen, midGreen, t / 0.2);
  } else if (t < 0.5) {
    return lerpColor(midGreen, lightGreen, (t - 0.2) / 0.3);
  } else if (t < 0.75) {
    return lerpColor(lightGreen, yellowBrown, (t - 0.5) / 0.25);
  } else {
    return lerpColor(yellowBrown, brown, (t - 0.75) / 0.25);
  }
}

export function createTerrain(): TerrainData {
  const noise2D = createNoise2D();
  const size = TERRAIN_SIZE;
  const segments = TERRAIN_SEGMENTS;
  const minHeight = MIN_HEIGHT;
  const maxHeight = MAX_HEIGHT;

  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors: number[] = [];

  const heightMap: number[][] = [];
  const gridSize = segments + 1;

  for (let i = 0; i < gridSize; i++) {
    heightMap[i] = [];
    for (let j = 0; j < gridSize; j++) {
      const x = (i / segments - 0.5) * size;
      const z = (j / segments - 0.5) * size;

      let height = 0;
      let amplitude = 1;
      let frequency = 1;
      const octaves = 4;

      for (let o = 0; o < octaves; o++) {
        height += noise2D(x * frequency * 0.3, z * frequency * 0.3) * amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      height = height * 0.5 + 0.5;
      height = height * (maxHeight - minHeight) + minHeight;

      heightMap[i][j] = height;

      const idx = (i * gridSize + j) * 3;
      positions.setY(idx / 3, height);

      const color = getTerrainColor(height, minHeight, maxHeight);
      colors.push(color.r, color.g, color.b);
    }
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: false,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'terrain';

  const contours = createContours(heightMap, size, segments, minHeight, maxHeight);

  const getHeightAt = (x: number, z: number): number => {
    const halfSize = size / 2;
    const nx = (x + halfSize) / size;
    const nz = (z + halfSize) / size;

    if (nx < 0 || nx > 1 || nz < 0 || nz > 1) return 0;

    const fx = nx * segments;
    const fz = nz * segments;

    const i0 = Math.floor(fx);
    const j0 = Math.floor(fz);
    const i1 = Math.min(i0 + 1, segments);
    const j1 = Math.min(j0 + 1, segments);

    const tx = fx - i0;
    const tz = fz - j0;

    const h00 = heightMap[i0][j0];
    const h10 = heightMap[i1][j0];
    const h01 = heightMap[i0][j1];
    const h11 = heightMap[i1][j1];

    const h0 = h00 * (1 - tx) + h10 * tx;
    const h1 = h01 * (1 - tx) + h11 * tx;
    const height = h0 * (1 - tz) + h1 * tz;

    return height;
  };

  return { mesh, contours, getHeightAt, size, segments, minHeight, maxHeight };
}

function createContours(
  heightMap: number[][],
  size: number,
  segments: number,
  minHeight: number,
  maxHeight: number
): THREE.LineSegments {
  const positions: number[] = [];
  const halfSize = size / 2;
  const gridSize = segments + 1;

  for (let level = Math.ceil(minHeight / CONTOUR_INTERVAL) * CONTOUR_INTERVAL; 
       level <= maxHeight; 
       level += CONTOUR_INTERVAL) {
    
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const x0 = (i / segments - 0.5) * size;
        const x1 = ((i + 1) / segments - 0.5) * size;
        const z0 = (j / segments - 0.5) * size;
        const z1 = ((j + 1) / segments - 0.5) * size;

        const h00 = heightMap[i][j];
        const h10 = heightMap[i + 1][j];
        const h01 = heightMap[i][j + 1];
        const h11 = heightMap[i + 1][j + 1];

        const crossings: { x: number; z: number }[] = [];

        if ((h00 - level) * (h10 - level) < 0) {
          const t = (level - h00) / (h10 - h00);
          crossings.push({ x: x0 + (x1 - x0) * t, z: z0 });
        }

        if ((h10 - level) * (h11 - level) < 0) {
          const t = (level - h10) / (h11 - h10);
          crossings.push({ x: x1, z: z0 + (z1 - z0) * t });
        }

        if ((h01 - level) * (h11 - level) < 0) {
          const t = (level - h01) / (h11 - h01);
          crossings.push({ x: x0 + (x1 - x0) * t, z: z1 });
        }

        if ((h00 - level) * (h01 - level) < 0) {
          const t = (level - h00) / (h01 - h00);
          crossings.push({ x: x0, z: z0 + (z1 - z0) * t });
        }

        if (crossings.length === 2) {
          const avgY = level;
          positions.push(
            crossings[0].x, avgY, crossings[0].z,
            crossings[1].x, avgY, crossings[1].z
          );
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.4,
    depthWrite: false
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'contours';

  return lines;
}

export function exportSceneAsPNG(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width = 1920,
  height = 1080
): void {
  const originalSize = renderer.getSize(new THREE.Vector2());
  
  renderer.setSize(width, height, false);
  renderer.render(scene, camera);
  
  const dataURL = renderer.domElement.toDataURL('image/png');
  
  renderer.setSize(originalSize.x, originalSize.y, false);
  
  const timestamp = Date.now();
  const link = document.createElement('a');
  link.download = `profile_${timestamp}.png`;
  link.href = dataURL;
  link.click();
}
