import * as THREE from 'three';

export function createCave(scene: THREE.Scene): THREE.Mesh {
  const caveRadius = 6;

  const geometry = new THREE.SphereGeometry(caveRadius, 128, 128);

  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const noiseScale = 2.5;
  const noiseStrength = 0.15;

  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const noise = simplex3(
      vertex.x * noiseScale,
      vertex.y * noiseScale,
      vertex.z * noiseScale
    );
    const displacement = noise * noiseStrength;
    vertex.multiplyScalar(1 + displacement);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const baseGradient = ctx.createLinearGradient(0, 0, 0, 1024);
  baseGradient.addColorStop(0, '#2a2a3a');
  baseGradient.addColorStop(0.5, '#333344');
  baseGradient.addColorStop(1, '#3a3a4a');
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, 1024, 1024);

  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 1024;
  noiseCanvas.height = 1024;
  const noiseCtx = noiseCanvas.getContext('2d')!;
  const noiseImageData = noiseCtx.createImageData(1024, 1024);
  const data = noiseImageData.data;

  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const idx = (y * 1024 + x) * 4;
      const n = fbm(x * 0.008, y * 0.008);
      const brightness = Math.floor(128 + n * 127);
      data[idx] = brightness;
      data[idx + 1] = brightness;
      data[idx + 2] = brightness;
      data[idx + 3] = 255;
    }
  }
  noiseCtx.putImageData(noiseImageData, 0, 0);

  ctx.globalAlpha = 0.35;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(noiseCanvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  const bumpImageData = bumpCtx.createImageData(512, 512);
  const bumpData = bumpImageData.data;

  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const n = fbm(x * 0.02, y * 0.02);
      const val = Math.floor(128 + n * 127);
      bumpData[idx] = val;
      bumpData[idx + 1] = val;
      bumpData[idx + 2] = val;
      bumpData[idx + 3] = 255;
    }
  }
  bumpCtx.putImageData(bumpImageData, 0, 0);

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.RepeatWrapping;

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    bumpMap: bumpTexture,
    bumpScale: 0.3,
    side: THREE.BackSide,
    color: 0x404055,
    roughness: 0.9,
    metalness: 0.1
  });

  const cave = new THREE.Mesh(geometry, material);
  cave.position.y = -1;
  scene.add(cave);

  return cave;
}

function simplex3(x: number, y: number, z: number): number {
  return fbm3(x, y, z);
}

function fbm3(x: number, y: number, z: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < 4; i++) {
    value += noise3(x * frequency, y * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

function noise3(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const hash = (n: number) => {
    const p = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
      247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
      74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
      60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
      65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
      200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
      52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
      207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
      129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
      218, 236, 205, 93, 235, 138, 238, 97, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 135, 180, 228, 162,
      251, 222, 107, 29, 78, 242, 193, 210, 144, 12, 191, 179, 81, 160, 249, 195,
      239, 241, 243, 141, 94, 156, 72, 151, 145, 142, 246, 237, 177, 71, 220
    ];
    return p[(n + p[(n + p[Z]) & 255]) & 255];
  };

  const A = hash(X + Y + Z);
  const B = hash(X + 1 + Y + Z);
  const C = hash(X + Y + 1 + Z);
  const D = hash(X + 1 + Y + 1 + Z);
  const E = hash(X + Y + Z + 1);
  const F = hash(X + 1 + Y + Z + 1);
  const G = hash(X + Y + 1 + Z + 1);
  const H = hash(X + 1 + Y + 1 + Z + 1);

  return lerp(
    lerp(
      lerp(grad(A, x, y, z), grad(B, x - 1, y, z), u),
      lerp(grad(C, x, y - 1, z), grad(D, x - 1, y - 1, z), u),
      v
    ),
    lerp(
      lerp(grad(E, x, y, z - 1), grad(F, x - 1, y, z - 1), u),
      lerp(grad(G, x, y - 1, z - 1), grad(H, x - 1, y - 1, z - 1), u),
      v
    ),
    w
  );
}

function fbm(x: number, y: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < 5; i++) {
    value += noise2(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

function noise2(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x);
  const v = fade(y);

  const p = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
    140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
    247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
    57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
    60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
    65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
    200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
    52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
    207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
    119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
    218, 236, 205, 93, 235, 138, 238, 97, 49, 192, 214, 31, 181, 199, 106, 157,
    184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 135, 180, 228, 162,
    251, 222, 107, 29, 78, 242, 193, 210, 144, 12, 191, 179, 81, 160, 249, 195,
    239, 241, 243, 141, 94, 156, 72, 151, 145, 142, 246, 237, 177, 71, 220
  ];

  const hash = (n: number) => p[n % 256];

  const A = hash(X + hash(Y));
  const B = hash(X + 1 + hash(Y));
  const C = hash(X + hash(Y + 1));
  const D = hash(X + 1 + hash(Y + 1));

  return lerp(
    lerp(grad2(A, x, y), grad2(B, x - 1, y), u),
    lerp(grad2(C, x, y - 1), grad2(D, x - 1, y - 1), u),
    v
  );
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function grad2(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}
