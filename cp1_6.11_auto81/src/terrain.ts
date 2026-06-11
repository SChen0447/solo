import * as THREE from 'three';

function noise2D(x: number, z: number): number {
  const a = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return a - Math.floor(a);
}

function smoothNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const a = noise2D(ix, iz);
  const b = noise2D(ix + 1, iz);
  const c = noise2D(ix, iz + 1);
  const d = noise2D(ix + 1, iz + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x: number, z: number, octaves: number = 5): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, z * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

function generateCrackTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(255,255,255,0)';
  ctx.fillRect(0, 0, size, size);
  const numCracks = 80;
  for (let c = 0; c < numCracks; c++) {
    let x = Math.random() * size;
    let y = Math.random() * size;
    const len = 100 + Math.random() * 400;
    const branches = Math.floor(Math.random() * 3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < len; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.8;
      x += Math.cos(angle) * 2;
      y += Math.sin(angle) * 2;
      if (x < 0 || x > size || y < 0 || y > size) break;
      ctx.lineTo(x, y);
      if (branches > 0 && Math.random() < 0.02) {
        ctx.strokeStyle = `rgba(176,224,230,${0.1 + Math.random() * 0.25})`;
        ctx.lineWidth = 0.5 + Math.random() * 1.0;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    ctx.strokeStyle = `rgba(140,200,220,${0.15 + Math.random() * 0.3})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

interface TerrainResult {
  mesh: THREE.Mesh;
  getHeightAt: (x: number, z: number) => number;
  update: (cameraDistance: number) => void;
}

export function createTerrain(): TerrainResult {
  const size = 400;
  const segments = 200;
  const noiseScale = 0.015;
  const heightMultiplier = 12;

  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  const colorIce = new THREE.Color('#b0e0e6');
  const colorSnow = new THREE.Color('#f0f8ff');

  const heightData: number[][] = [];
  const gridSize = segments + 1;
  for (let i = 0; i < gridSize; i++) {
    heightData[i] = [];
    for (let j = 0; j < gridSize; j++) {
      heightData[i][j] = 0;
    }
  }

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    let height = fbm(x * noiseScale + 100, z * noiseScale + 100, 5);
    height = (height - 0.3) * heightMultiplier;
    if (height < 0) height *= 0.3;
    positions.setY(i, height);

    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    if (row < gridSize && col < gridSize) {
      heightData[row][col] = height;
    }

    const t = Math.min(Math.max((height + 5) / 18, 0), 1);
    const color = colorSnow.clone().lerp(colorIce, 1 - t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const crackTexture = generateCrackTexture();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    roughness: 0.35,
    metalness: 0.15,
    map: crackTexture,
    envMapIntensity: 0.6,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;

  function getHeightAt(x: number, z: number): number {
    const halfSize = size / 2;
    const nx = (x + halfSize) / size;
    const nz = (z + halfSize) / size;
    const col = Math.floor(nx * segments);
    const row = Math.floor(nz * segments);
    const c0 = Math.max(0, Math.min(segments, col));
    const r0 = Math.max(0, Math.min(segments, row));
    const c1 = Math.min(segments, c0 + 1);
    const r1 = Math.min(segments, r0 + 1);
    const fx = (nx * segments) - c0;
    const fz = (nz * segments) - r0;
    const h00 = heightData[r0]?.[c0] ?? 0;
    const h10 = heightData[r0]?.[c1] ?? 0;
    const h01 = heightData[r1]?.[c0] ?? 0;
    const h11 = heightData[r1]?.[c1] ?? 0;
    const h0 = h00 + (h10 - h00) * fx;
    const h1 = h01 + (h11 - h01) * fx;
    return h0 + (h1 - h0) * fz;
  }

  function update(cameraDistance: number): void {
    const detail = Math.max(1, Math.min(4, 4 / cameraDistance));
    crackTexture.repeat.set(4 + detail * 4, 4 + detail * 4);
    material.needsUpdate = false;
  }

  return { mesh, getHeightAt, update };
}
