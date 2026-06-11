import * as THREE from 'three';

export type ModelType = 'crane' | 'boat' | 'plane' | 'flower' | 'box' | 'frog';

export interface FoldStep {
  stepNumber: number;
  description: string;
  vertices: number[];
  highlightFaces: number[];
}

export interface OrigamiModelData {
  name: string;
  type: ModelType;
  faceCount: number;
  baseVertices: number[];
  foldSteps: FoldStep[];
  creaseLines: number[][];
}

export class OrigamiModel {
  public mesh: THREE.Mesh;
  public geometry: THREE.BufferGeometry;
  public material: THREE.MeshStandardMaterial;
  public currentStep: number = 0;
  public modelData: OrigamiModelData;
  public creaseLinesMesh: THREE.LineSegments | null = null;
  public highlightMesh: THREE.Mesh | null = null;

  private basePositions: Float32Array;
  private currentPositions: Float32Array;

  constructor(type: ModelType, texture: THREE.Texture) {
    this.modelData = this.generateModelData(type);
    this.geometry = this.createGeometry();
    this.material = this.createMaterial(texture);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.basePositions = new Float32Array(this.modelData.baseVertices);
    this.currentPositions = new Float32Array(this.modelData.baseVertices);

    this.createCreaseLines();
    this.createHighlightOverlay();
  }

  private createGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(this.modelData.baseVertices);
    const faceCount = this.modelData.faceCount;

    const indices: number[] = [];
    for (let i = 0; i < faceCount; i++) {
      indices.push(i * 3, i * 3 + 1, i * 3 + 2);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const uvs: number[] = [];
    for (let i = 0; i < faceCount; i++) {
      for (let j = 0; j < 3; j++) {
        const idx = i * 9 + j * 3;
        const x = (vertices[idx] + 1) / 2;
        const y = (vertices[idx + 1] + 1) / 2;
        uvs.push(x, y);
      }
    }
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    return geometry;
  }

  private createMaterial(texture: THREE.Texture): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 1.0,
    });
  }

  private createCreaseLines(): void {
    if (this.modelData.creaseLines.length === 0) return;

    const points: THREE.Vector3[] = [];
    for (const line of this.modelData.creaseLines) {
      points.push(new THREE.Vector3(line[0], line[1], line[2]));
      points.push(new THREE.Vector3(line[3], line[4], line[5]));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xcccccc,
      linewidth: 1,
      dashSize: 0.05,
      gapSize: 0.03,
      transparent: true,
      opacity: 0.4,
    });

    this.creaseLinesMesh = new THREE.LineSegments(geometry, material);
    this.creaseLinesMesh.computeLineDistances();
    this.creaseLinesMesh.visible = false;
  }

  private createHighlightOverlay(): void {
    const highlightGeometry = this.geometry.clone();
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a9eff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });

    this.highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    this.highlightMesh.visible = false;
  }

  private generateModelData(type: ModelType): OrigamiModelData {
    switch (type) {
      case 'crane':
        return this.generateCraneData();
      case 'boat':
        return this.generateBoatData();
      case 'plane':
        return this.generatePlaneData();
      case 'flower':
        return this.generateFlowerData();
      case 'box':
        return this.generateBoxData();
      case 'frog':
        return this.generateFrogData();
      default:
        return this.generateCraneData();
    }
  }

  private generateSquareBase(): number[] {
    const s = 0.7;
    return [
      -s, 0, -s,   s, 0, -s,  -s, 0,  s,
       s, 0, -s,   s, 0,  s,  -s, 0,  s,
      -s, 0,  s,   s, 0,  s,   0, s * 0.7, 0,
    ];
  }

  private generateCraneData(): OrigamiModelData {
    const s = 0.7;
    const h = 0.3;

    const step0Vertices = [
      -s, 0, -s,   s, 0, -s,  -s, 0,  s,
       s, 0, -s,   s, 0,  s,  -s, 0,  s,
      -s, 0,  s,   s, 0,  s,   0, h, 0,
      -s, 0, -s,  -s, 0,  s,   0, h, 0,
       s, 0, -s,  -s, 0, -s,   0, h, 0,
       s, 0,  s,   s, 0, -s,   0, h, 0,
      -s, 0,  s,   s, 0,  s,   0, h, 0,
    ];

    const step1Vertices = [
      -s, 0, -s,   0, 0, -s,  -s * 0.5, h, -s * 0.5,
       0, 0, -s,   s, 0, -s,   s * 0.5, h, -s * 0.5,
      -s, 0,  s,   0, 0,  s,  -s * 0.5, h,  s * 0.5,
       0, 0,  s,   s, 0,  s,   s * 0.5, h,  s * 0.5,
      -s * 0.5, h, -s * 0.5,  s * 0.5, h, -s * 0.5,  0, h * 2, 0,
       s * 0.5, h, -s * 0.5,  s * 0.5, h,  s * 0.5,  0, h * 2, 0,
       s * 0.5, h,  s * 0.5,  -s * 0.5, h,  s * 0.5,  0, h * 2, 0,
      -s * 0.5, h,  s * 0.5,  -s * 0.5, h, -s * 0.5,  0, h * 2, 0,
    ];

    const step2Vertices = [
      -s * 0.3, h * 2.5, 0,   s * 0.3, h * 2.5, 0,  -s * 0.5, h, -s * 0.5,
       s * 0.3, h * 2.5, 0,   s * 0.5, h, -s * 0.5,  -s * 0.5, h, -s * 0.5,
      -s * 0.5, h,  s * 0.5,  -s * 0.3, h * 1.8,  s * 0.8,  -s * 0.2, h * 1.5,  s * 0.3,
       s * 0.5, h,  s * 0.5,   s * 0.3, h * 1.8,  s * 0.8,   s * 0.2, h * 1.5,  s * 0.3,
      -s * 0.2, h * 1.5,  s * 0.3,  s * 0.2, h * 1.5,  s * 0.3,  0, h, 0,
      -s * 0.5, h, -s * 0.5,  s * 0.5, h, -s * 0.5,  0, h * 1.2, -s * 0.3,
    ];

    const creaseLines: number[][] = [
      [-s, 0, 0, s, 0, 0],
      [0, 0, -s, 0, 0, s],
      [-s * 0.7, 0, -s * 0.7, s * 0.7, 0, s * 0.7],
      [s * 0.7, 0, -s * 0.7, -s * 0.7, 0, s * 0.7],
    ];

    return {
      name: '纸鹤',
      type: 'crane',
      faceCount: 18,
      baseVertices: step0Vertices,
      creaseLines,
      foldSteps: [
        { stepNumber: 1, description: '准备一张正方形的纸', vertices: step0Vertices, highlightFaces: [0, 1] },
        { stepNumber: 2, description: '沿对角线对折，形成三角形', vertices: step0Vertices, highlightFaces: [2, 3] },
        { stepNumber: 3, description: '展开后沿另一对角线对折', vertices: step1Vertices, highlightFaces: [0, 1, 2, 3] },
        { stepNumber: 4, description: '将四个角向中心折叠', vertices: step1Vertices, highlightFaces: [4, 5, 6, 7] },
        { stepNumber: 5, description: '拉起头部和尾部，形成鹤的雏形', vertices: step2Vertices, highlightFaces: [0, 1] },
        { stepNumber: 6, description: '折叠出翅膀和身体细节', vertices: step2Vertices, highlightFaces: [2, 3, 4, 5] },
        { stepNumber: 7, description: '纸鹤完成！', vertices: step2Vertices, highlightFaces: [] },
      ],
    };
  }

  private generateBoatData(): OrigamiModelData {
    const s = 0.7;
    const h = 0.15;

    const step0 = this.generateSquareBase();

    const step1 = [
      -s, 0, -s,   s, 0, -s,  -s, 0,  s,
       s, 0, -s,   s, 0,  s,  -s, 0,  s,
      -s, 0,  s,   s, 0,  s,   0, h * 2,  s * 0.3,
      -s, 0, -s,  -s, 0,  s,   0, h * 2,  s * 0.3,
       s, 0, -s,  -s, 0, -s,   0, h * 2, -s * 0.3,
       s, 0,  s,   s, 0, -s,   0, h * 2, -s * 0.3,
    ];

    const step2 = [
      -s * 0.7, h, 0,   s * 0.7, h, 0,  -s * 0.5, h * 2,  s * 0.6,
       s * 0.7, h, 0,   s * 0.5, h * 2,  s * 0.6,  -s * 0.5, h * 2,  s * 0.6,
      -s * 0.7, h, 0,  -s * 0.5, h * 2,  s * 0.6,  -s * 0.5, h * 2, -s * 0.6,
      -s * 0.7, h, 0,  -s * 0.5, h * 2, -s * 0.6,   s * 0.7, h, 0,
       s * 0.7, h, 0,  -s * 0.5, h * 2, -s * 0.6,   s * 0.5, h * 2, -s * 0.6,
       s * 0.7, h, 0,   s * 0.5, h * 2, -s * 0.6,   s * 0.5, h * 2,  s * 0.6,
      -s * 0.5, h * 2, -s * 0.6,  s * 0.5, h * 2, -s * 0.6,  0, h * 2.5, 0,
    ];

    const creaseLines: number[][] = [
      [-s, 0, 0, s, 0, 0],
      [0, 0, -s, 0, 0, s],
    ];

    return {
      name: '纸船',
      type: 'boat',
      faceCount: 21,
      baseVertices: [...step0, ...step0.slice(0, 18)],
      creaseLines,
      foldSteps: [
        { stepNumber: 1, description: '准备一张正方形的纸', vertices: step0, highlightFaces: [0, 1] },
        { stepNumber: 2, description: '沿中线对折', vertices: step0, highlightFaces: [0, 1, 2] },
        { stepNumber: 3, description: '将底部两角向上折叠', vertices: step1, highlightFaces: [2, 3] },
        { stepNumber: 4, description: '撑开中间形成船体', vertices: step1, highlightFaces: [4, 5] },
        { stepNumber: 5, description: '折叠出船身两侧', vertices: step2, highlightFaces: [0, 1, 2, 3] },
        { stepNumber: 6, description: '纸船完成！', vertices: step2, highlightFaces: [] },
      ],
    };
  }

  private generatePlaneData(): OrigamiModelData {
    const s = 0.8;
    const h = 0.05;

    const step0 = this.generateSquareBase();

    const step1 = [
      -s * 0.2, h,  s,  -s * 0.2, h, -s,   s, h, 0,
      -s * 0.2, h,  s,   s, h, 0,  -s * 0.2, h,  s,
       0, h,  s * 0.3,   0, h, -s * 0.3,   s * 0.8, h, 0,
       0, h,  s * 0.3,   s * 0.8, h, 0,   0, h * 3,  s * 0.1,
       0, h, -s * 0.3,   s * 0.8, h, 0,   0, h * 3, -s * 0.1,
    ];

    const step2 = [
      -s * 0.15, h * 2,  s,  -s * 0.15, h * 2, -s,   s * 0.9, h, 0,
       0, h * 4,  s * 0.05,  0, h * 4, -s * 0.05,  s * 0.9, h, 0,
      -s * 0.15, h * 2,  s,   0, h * 4,  s * 0.05,  s * 0.7, h * 2,  s * 0.3,
      -s * 0.15, h * 2, -s,   0, h * 4, -s * 0.05,  s * 0.7, h * 2, -s * 0.3,
       s * 0.7, h * 2,  s * 0.3,   s * 0.7, h * 2, -s * 0.3,   s * 0.9, h, 0,
    ];

    const creaseLines: number[][] = [
      [0, 0, -s, 0, 0, s],
      [-s * 0.5, 0, 0, s, 0, 0],
    ];

    return {
      name: '纸飞机',
      type: 'plane',
      faceCount: 15,
      baseVertices: step0,
      creaseLines,
      foldSteps: [
        { stepNumber: 1, description: '准备一张长方形的纸', vertices: step0, highlightFaces: [0, 1] },
        { stepNumber: 2, description: '沿纵向中线对折', vertices: step0, highlightFaces: [0, 1] },
        { stepNumber: 3, description: '将顶部两角向中心折叠', vertices: step1, highlightFaces: [0, 1] },
        { stepNumber: 4, description: '再次对折形成机身', vertices: step1, highlightFaces: [2, 3, 4] },
        { stepNumber: 5, description: '向下折叠出机翼', vertices: step2, highlightFaces: [2, 3] },
        { stepNumber: 6, description: '调整机翼角度', vertices: step2, highlightFaces: [0, 1, 4] },
        { stepNumber: 7, description: '纸飞机完成！', vertices: step2, highlightFaces: [] },
      ],
    };
  }

  private generateFlowerData(): OrigamiModelData {
    const s = 0.7;
    const h = 0.1;

    const step0 = this.generateSquareBase();

    const petalVertices: number[] = [];
    const petalCount = 6;
    for (let i = 0; i < petalCount; i++) {
      const angle1 = (i / petalCount) * Math.PI * 2;
      const angle2 = ((i + 0.5) / petalCount) * Math.PI * 2;
      const angle3 = ((i + 1) / petalCount) * Math.PI * 2;
      const r1 = s * 0.3;
      const r2 = s * 0.8;

      petalVertices.push(
        Math.cos(angle1) * r1, h, Math.sin(angle1) * r1,
        Math.cos(angle2) * r2, h * 3, Math.sin(angle2) * r2,
        Math.cos(angle3) * r1, h, Math.sin(angle3) * r1
      );
    }

    const centerVertices = [
      -s * 0.2, h * 0.5, -s * 0.2,   s * 0.2, h * 0.5, -s * 0.2,  0, h * 4, 0,
       s * 0.2, h * 0.5, -s * 0.2,   s * 0.2, h * 0.5,  s * 0.2,  0, h * 4, 0,
       s * 0.2, h * 0.5,  s * 0.2,  -s * 0.2, h * 0.5,  s * 0.2,  0, h * 4, 0,
      -s * 0.2, h * 0.5,  s * 0.2,  -s * 0.2, h * 0.5, -s * 0.2,  0, h * 4, 0,
    ];

    const creaseLines: number[][] = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      creaseLines.push([0, 0, 0, Math.cos(angle) * s, 0, Math.sin(angle) * s]);
    }

    return {
      name: '纸花',
      type: 'flower',
      faceCount: 22,
      baseVertices: step0,
      creaseLines,
      foldSteps: [
        { stepNumber: 1, description: '准备一张正方形的纸', vertices: step0, highlightFaces: [0, 1] },
        { stepNumber: 2, description: '沿两条对角线对折', vertices: step0, highlightFaces: [0, 1, 2] },
        { stepNumber: 3, description: '将四个角向中心折叠', vertices: step0, highlightFaces: [0, 1, 2] },
        { stepNumber: 4, description: '翻折背面形成花瓣基础', vertices: [...petalVertices.slice(0, 54)], highlightFaces: [0, 1, 2, 3, 4, 5] },
        { stepNumber: 5, description: '折叠出六片花瓣', vertices: petalVertices, highlightFaces: [0, 1, 2, 3, 4, 5] },
        { stepNumber: 6, description: '整理花瓣造型，形成花朵', vertices: [...petalVertices, ...centerVertices], highlightFaces: [6, 7, 8, 9] },
        { stepNumber: 7, description: '纸花完成！', vertices: [...petalVertices, ...centerVertices], highlightFaces: [] },
      ],
    };
  }

  private generateBoxData(): OrigamiModelData {
    const s = 0.6;
    const h = 0.4;

    const step0 = this.generateSquareBase();

    const step1 = [
      -s, 0, -s,   s, 0, -s,  -s, 0,  s,
       s, 0, -s,   s, 0,  s,  -s, 0,  s,
      -s * 0.8, 0, -s * 0.8,   s * 0.8, 0, -s * 0.8,  -s * 0.8, 0,  s * 0.8,
       s * 0.8, 0, -s * 0.8,   s * 0.8, 0,  s * 0.8,  -s * 0.8, 0,  s * 0.8,
    ];

    const boxVertices = [
      -s, 0, -s,   s, 0, -s,  -s, 0,  s,
       s, 0, -s,   s, 0,  s,  -s, 0,  s,
      -s, 0, -s,  -s, h, -s,  -s, 0,  s,
      -s, h, -s,  -s, h,  s,  -s, 0,  s,
       s, 0, -s,   s, h, -s,   s, 0,  s,
       s, h, -s,   s, h,  s,   s, 0,  s,
      -s, 0, -s,   s, 0, -s,  -s, h, -s,
       s, 0, -s,   s, h, -s,  -s, h, -s,
      -s, 0,  s,   s, 0,  s,  -s, h,  s,
       s, 0,  s,   s, h,  s,  -s, h,  s,
      -s, h, -s,   s, h, -s,  -s, h,  s,
       s, h, -s,   s, h,  s,  -s, h,  s,
    ];

    const creaseLines: number[][] = [
      [-s, 0, 0, s, 0, 0],
      [0, 0, -s, 0, 0, s],
      [-s * 0.8, 0, -s * 0.8, s * 0.8, 0, -s * 0.8],
      [-s * 0.8, 0, s * 0.8, s * 0.8, 0, s * 0.8],
      [-s * 0.8, 0, -s * 0.8, -s * 0.8, 0, s * 0.8],
      [s * 0.8, 0, -s * 0.8, s * 0.8, 0, s * 0.8],
    ];

    return {
      name: '纸盒',
      type: 'box',
      faceCount: 24,
      baseVertices: step0,
      creaseLines,
      foldSteps: [
        { stepNumber: 1, description: '准备一张正方形的纸', vertices: step0, highlightFaces: [0, 1] },
        { stepNumber: 2, description: '沿中线对折后展开', vertices: step0, highlightFaces: [0, 1] },
        { stepNumber: 3, description: '四角向中心折叠', vertices: step1, highlightFaces: [2, 3] },
        { stepNumber: 4, description: '上下边向中心折叠', vertices: step1, highlightFaces: [0, 1] },
        { stepNumber: 5, description: '撑开四边立起盒壁', vertices: boxVertices, highlightFaces: [2, 3, 4, 5] },
        { stepNumber: 6, description: '折叠固定边角', vertices: boxVertices, highlightFaces: [6, 7, 8, 9] },
        { stepNumber: 7, description: '整理盒形完成', vertices: boxVertices, highlightFaces: [10, 11] },
        { stepNumber: 8, description: '纸盒完成！', vertices: boxVertices, highlightFaces: [] },
      ],
    };
  }

  private generateFrogData(): OrigamiModelData {
    const s = 0.6;
    const h = 0.1;

    const step0 = this.generateSquareBase();

    const step1 = [
      -s, 0, -s,   0, 0, -s,  -s * 0.5, h * 2, -s * 0.5,
       0, 0, -s,   s, 0, -s,   s * 0.5, h * 2, -s * 0.5,
      -s, 0,  s,   0, 0,  s,  -s * 0.5, h * 2,  s * 0.5,
       0, 0,  s,   s, 0,  s,   s * 0.5, h * 2,  s * 0.5,
      -s * 0.5, h * 2, -s * 0.5,  s * 0.5, h * 2, -s * 0.5,  0, h * 3, 0,
       s * 0.5, h * 2, -s * 0.5,  s * 0.5, h * 2,  s * 0.5,  0, h * 3, 0,
       s * 0.5, h * 2,  s * 0.5,  -s * 0.5, h * 2,  s * 0.5,  0, h * 3, 0,
      -s * 0.5, h * 2,  s * 0.5,  -s * 0.5, h * 2, -s * 0.5,  0, h * 3, 0,
    ];

    const frogVertices = [
      -s * 0.3, h * 2,  s * 0.8,  -s * 0.1, h * 2.5,  s * 0.6,  -s * 0.4, h * 1.5,  s * 0.5,
       s * 0.3, h * 2,  s * 0.8,   s * 0.1, h * 2.5,  s * 0.6,   s * 0.4, h * 1.5,  s * 0.5,
      -s * 0.6, h,  s * 0.3,  -s * 0.4, h * 1.5,  s * 0.5,  -s * 0.8, h * 0.5, 0,
       s * 0.6, h,  s * 0.3,   s * 0.4, h * 1.5,  s * 0.5,   s * 0.8, h * 0.5, 0,
      -s * 0.8, h * 0.5, 0,  -s * 0.5, h * 1.5, 0,  -s * 0.7, h * 0.5, -s * 0.5,
       s * 0.8, h * 0.5, 0,   s * 0.5, h * 1.5, 0,   s * 0.7, h * 0.5, -s * 0.5,
      -s * 0.5, h * 1.5, 0,   s * 0.5, h * 1.5, 0,   0, h * 2, -s * 0.3,
      -s * 0.7, h * 0.5, -s * 0.5,   s * 0.7, h * 0.5, -s * 0.5,   0, h * 1.5, -s * 0.7,
    ];

    const creaseLines: number[][] = [
      [-s, 0, 0, s, 0, 0],
      [0, 0, -s, 0, 0, s],
      [-s * 0.7, 0, -s * 0.7, s * 0.7, 0, s * 0.7],
      [s * 0.7, 0, -s * 0.7, -s * 0.7, 0, s * 0.7],
    ];

    return {
      name: '纸青蛙',
      type: 'frog',
      faceCount: 24,
      baseVertices: step0,
      creaseLines,
      foldSteps: [
        { stepNumber: 1, description: '准备一张正方形的纸', vertices: step0, highlightFaces: [0, 1] },
        { stepNumber: 2, description: '沿两条对角线对折', vertices: step0, highlightFaces: [0, 1, 2] },
        { stepNumber: 3, description: '折叠形成双三角形基础', vertices: step1, highlightFaces: [0, 1, 2, 3] },
        { stepNumber: 4, description: '将底部两角向上折叠', vertices: step1, highlightFaces: [4, 5, 6, 7] },
        { stepNumber: 5, description: '折叠出前腿和后腿', vertices: frogVertices, highlightFaces: [0, 1, 2, 3] },
        { stepNumber: 6, description: '捏出头部造型', vertices: frogVertices, highlightFaces: [0, 1] },
        { stepNumber: 7, description: '折叠弹跳弹簧结构', vertices: frogVertices, highlightFaces: [4, 5, 6, 7] },
        { stepNumber: 8, description: '纸青蛙完成！按下后腿可以弹跳', vertices: frogVertices, highlightFaces: [] },
      ],
    };
  }

  public loadModel(type: ModelType): void {
    this.modelData = this.generateModelData(type);
    this.currentStep = 0;

    this.basePositions = new Float32Array(this.modelData.baseVertices);
    this.currentPositions = new Float32Array(this.modelData.baseVertices);

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttr.array = this.currentPositions;
    positionAttr.needsUpdate = true;

    const faceCount = this.modelData.faceCount;
    const indices: number[] = [];
    for (let i = 0; i < faceCount; i++) {
      indices.push(i * 3, i * 3 + 1, i * 3 + 2);
    }
    this.geometry.setIndex(indices);

    const uvs: number[] = [];
    for (let i = 0; i < faceCount; i++) {
      for (let j = 0; j < 3; j++) {
        const idx = i * 9 + j * 3;
        const x = (this.currentPositions[idx] + 1) / 2;
        const y = (this.currentPositions[idx + 1] + 1) / 2;
        uvs.push(x, y);
      }
    }
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    this.geometry.computeVertexNormals();

    if (this.highlightMesh) {
      this.highlightMesh.geometry.dispose();
      this.highlightMesh.geometry = this.geometry.clone();
    }

    this.createCreaseLines();
  }

  public reset(): void {
    this.currentStep = 0;
    this.currentPositions.set(this.basePositions);
    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    if (this.highlightMesh) {
      this.highlightMesh.visible = false;
    }
    if (this.creaseLinesMesh) {
      this.creaseLinesMesh.visible = false;
    }
  }

  public getTotalSteps(): number {
    return this.modelData.foldSteps.length;
  }

  public getStepDescription(step: number): string {
    if (step >= 0 && step < this.modelData.foldSteps.length) {
      return this.modelData.foldSteps[step].description;
    }
    return '';
  }

  public getHighlightFaces(step: number): number[] {
    if (step >= 0 && step < this.modelData.foldSteps.length) {
      return this.modelData.foldSteps[step].highlightFaces;
    }
    return [];
  }

  public getStepVertices(step: number): number[] {
    if (step >= 0 && step < this.modelData.foldSteps.length) {
      return this.modelData.foldSteps[step].vertices;
    }
    return this.modelData.baseVertices;
  }

  public updateVertices(vertices: number[]): void {
    if (vertices.length !== this.currentPositions.length) {
      const newPositions = new Float32Array(vertices.length);
      newPositions.set(vertices);
      this.currentPositions = newPositions;
    } else {
      this.currentPositions.set(vertices);
    }

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    if (positionAttr.array.length !== this.currentPositions.length) {
      this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    } else {
      positionAttr.array = this.currentPositions;
      positionAttr.needsUpdate = true;
    }

    this.geometry.computeVertexNormals();

    if (this.highlightMesh) {
      const highlightPosAttr = this.highlightMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      if (highlightPosAttr.array.length !== this.currentPositions.length) {
        this.highlightMesh.geometry.dispose();
        this.highlightMesh.geometry = this.geometry.clone();
      } else {
        highlightPosAttr.array = this.currentPositions;
        highlightPosAttr.needsUpdate = true;
        this.highlightMesh.geometry.computeVertexNormals();
      }
    }
  }

  public showCreaseLines(show: boolean): void {
    if (this.creaseLinesMesh) {
      this.creaseLinesMesh.visible = show;
    }
  }

  public updateHighlight(step: number, opacity: number = 0.3): void {
    if (!this.highlightMesh) return;

    const highlightFaces = this.getHighlightFaces(step);
    if (highlightFaces.length === 0) {
      this.highlightMesh.visible = false;
      return;
    }

    this.highlightMesh.visible = true;
    const material = this.highlightMesh.material as THREE.MeshBasicMaterial;
    material.opacity = opacity;

    const geometry = this.highlightMesh.geometry;
    const indices = geometry.getIndex();
    if (indices) {
      const newIndices: number[] = [];
      for (const faceIdx of highlightFaces) {
        const start = faceIdx * 3;
        newIndices.push(indices.getX(start), indices.getX(start + 1), indices.getX(start + 2));
      }
      geometry.setIndex(newIndices);
    }
  }

  public setTexture(texture: THREE.Texture): void {
    if (this.material) {
      this.material.map = texture;
      this.material.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.creaseLinesMesh) {
      this.creaseLinesMesh.geometry.dispose();
      (this.creaseLinesMesh.material as THREE.Material).dispose();
    }
    if (this.highlightMesh) {
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
    }
  }
}
