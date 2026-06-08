import * as THREE from 'three';

const RESOLUTION = 32;
const MAX_HEIGHT = 50;
const TERRAIN_SIZE = 100;

export class TerrainGenerator {
  private scene: THREE.Scene;
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private resolution: number;
  private maxHeight: number;
  private size: number;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.resolution = RESOLUTION;
    this.maxHeight = MAX_HEIGHT;
    this.size = TERRAIN_SIZE;

    this.geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshStandardMaterial({
      color: 0x7a8fa6,
      metalness: 0.3,
      roughness: 0.7,
      flatShading: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    this.createFlatTerrain();
  }

  private createFlatTerrain(): void {
    const heights: number[][] = [];
    for (let i = 0; i < this.resolution; i++) {
      heights[i] = [];
      for (let j = 0; j < this.resolution; j++) {
        heights[i][j] = 0;
      }
    }
    this.updateGeometry(heights);
  }

  public generateFromCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const heights: number[][] = [];
    const stepX = canvas.width / (this.resolution - 1);
    const stepY = canvas.height / (this.resolution - 1);

    for (let i = 0; i < this.resolution; i++) {
      heights[i] = [];
      for (let j = 0; j < this.resolution; j++) {
        const x = Math.floor(j * stepX);
        const y = Math.floor(i * stepY);
        const clampedX = Math.min(Math.max(x, 0), canvas.width - 1);
        const clampedY = Math.min(Math.max(y, 0), canvas.height - 1);
        const index = (clampedY * canvas.width + clampedX) * 4;

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const gray = (r + g + b) / 3;

        heights[i][j] = (gray / 255) * this.maxHeight;
      }
    }

    const smoothedHeights = this.applyGaussianBlur(heights);
    this.updateGeometry(smoothedHeights);
  }

  private applyGaussianBlur(heights: number[][]): number[][] {
    const kernel = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1]
    ];
    const kernelSum = 16;

    const result: number[][] = [];
    const size = this.resolution;

    for (let i = 0; i < size; i++) {
      result[i] = [];
      for (let j = 0; j < size; j++) {
        let sum = 0;
        for (let ki = -1; ki <= 1; ki++) {
          for (let kj = -1; kj <= 1; kj++) {
            const ni = i + ki;
            const nj = j + kj;
            const clampedNi = Math.min(Math.max(ni, 0), size - 1);
            const clampedNj = Math.min(Math.max(nj, 0), size - 1);
            sum += heights[clampedNi][clampedNj] * kernel[ki + 1][kj + 1];
          }
        }
        result[i][j] = sum / kernelSum;
      }
    }

    return result;
  }

  public updateGeometry(heights: number[][]): void {
    const vertexCount = this.resolution * this.resolution;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    const halfSize = this.size / 2;
    const stepX = this.size / (this.resolution - 1);
    const stepZ = this.size / (this.resolution - 1);

    let index = 0;
    for (let i = 0; i < this.resolution; i++) {
      for (let j = 0; j < this.resolution; j++) {
        const x = -halfSize + j * stepX;
        const z = -halfSize + i * stepZ;
        const y = heights[i][j];

        positions[index * 3] = x;
        positions[index * 3 + 1] = y;
        positions[index * 3 + 2] = z;

        uvs[index * 2] = j / (this.resolution - 1);
        uvs[index * 2 + 1] = i / (this.resolution - 1);

        index++;
      }
    }

    const faceCount = (this.resolution - 1) * (this.resolution - 1) * 2;
    const indices = new Uint32Array(faceCount * 3);

    let idx = 0;
    for (let i = 0; i < this.resolution - 1; i++) {
      for (let j = 0; j < this.resolution - 1; j++) {
        const a = i * this.resolution + j;
        const b = a + 1;
        const c = a + this.resolution;
        const d = c + 1;

        indices[idx++] = a;
        indices[idx++] = c;
        indices[idx++] = b;

        indices[idx++] = b;
        indices[idx++] = c;
        indices[idx++] = d;
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();

    this.mesh.position.y = 0;
  }

  public exportOBJ(): string {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const normals = this.geometry.attributes.normal.array as Float32Array;
    const indices = this.geometry.index?.array as Uint32Array;

    if (!indices) return '';

    let objContent = '# Terrain OBJ Export\n';
    objContent += `# Vertices: ${positions.length / 3}\n`;
    objContent += `# Faces: ${indices.length / 3}\n\n`;

    for (let i = 0; i < positions.length; i += 3) {
      objContent += `v ${positions[i].toFixed(4)} ${positions[i + 1].toFixed(4)} ${positions[i + 2].toFixed(4)}\n`;
    }

    objContent += '\n';

    for (let i = 0; i < normals.length; i += 3) {
      objContent += `vn ${normals[i].toFixed(4)} ${normals[i + 1].toFixed(4)} ${normals[i + 2].toFixed(4)}\n`;
    }

    objContent += '\n';

    for (let i = 0; i < indices.length; i += 3) {
      const v1 = indices[i] + 1;
      const v2 = indices[i + 1] + 1;
      const v3 = indices[i + 2] + 1;
      objContent += `f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}\n`;
    }

    return objContent;
  }

  public reset(): void {
    this.createFlatTerrain();
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.scene.remove(this.mesh);
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }
}
