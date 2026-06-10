import * as THREE from 'three';

export interface TerrainParams {
  width?: number;
  depth?: number;
  segments?: number;
  layerCount?: number;
}

export interface LayerInfo {
  name: string;
  color: string;
  thickness: number;
  topY: number;
  bottomY: number;
}

export class TerrainModel {
  public group: THREE.Group;
  public terrainGroup: THREE.Group;
  public vegetationGroup: THREE.Group;
  public layerMeshes: THREE.Mesh[] = [];
  public layerEdges: THREE.LineSegments[] = [];
  public layerInfos: LayerInfo[] = [];
  public surfaceHeights: Float32Array;
  public allVegetation: THREE.Mesh[] = [];
  public params: Required<TerrainParams>;

  private static readonly LAYER_COLORS = [
    { name: '表土层', color: '#8B4513' },
    { name: '砂岩层', color: '#D2B48C' },
    { name: '页岩层', color: '#708090' },
    { name: '基岩层', color: '#4a4a4a' }
  ];

  constructor(params: TerrainParams = {}) {
    this.params = {
      width: params.width ?? 20,
      depth: params.depth ?? 20,
      segments: params.segments ?? 64,
      layerCount: params.layerCount ?? 4
    };

    this.group = new THREE.Group();
    this.terrainGroup = new THREE.Group();
    this.vegetationGroup = new THREE.Group();
    this.group.add(this.terrainGroup);
    this.group.add(this.vegetationGroup);

    this.surfaceHeights = new Float32Array((this.params.segments + 1) * (this.params.segments + 1));

    this.generateSurfaceHeights();
    this.generateLayers();
    this.generateVegetation();
  }

  private generateSurfaceHeights(): void {
    const { segments } = this.params;
    const size = segments + 1;

    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const x = (i / segments - 0.5) * this.params.width;
        const z = (j / segments - 0.5) * this.params.depth;

        let height = 0;
        height += Math.sin(x * 0.4) * Math.cos(z * 0.4) * 1.2;
        height += Math.sin(x * 0.8 + 1.3) * Math.cos(z * 0.6 + 0.7) * 0.5;
        height += Math.sin(x * 1.5) * Math.cos(z * 1.2) * 0.25;

        const noise = (
          Math.sin(x * 3.7 + z * 2.1) * 0.5 +
          Math.sin(x * 7.3 - z * 4.5) * 0.25 +
          Math.sin(x * 11.1 + z * 8.9) * 0.125
        ) * 0.3;
        height += noise;

        height = Math.max(-2, Math.min(2, height));
        this.surfaceHeights[j * size + i] = height;
      }
    }
  }

  private getSurfaceHeight(x: number, z: number): number {
    const { width, depth, segments } = this.params;
    const nx = (x / width + 0.5) * segments;
    const nz = (z / depth + 0.5) * segments;
    const ix = Math.floor(nx);
    const iz = Math.floor(nz);
    const fx = nx - ix;
    const fz = nz - iz;

    const size = segments + 1;
    const h00 = this.surfaceHeights[Math.min(iz, segments) * size + Math.min(ix, segments)];
    const h10 = this.surfaceHeights[Math.min(iz, segments) * size + Math.min(ix + 1, segments)];
    const h01 = this.surfaceHeights[Math.min(iz + 1, segments) * size + Math.min(ix, segments)];
    const h11 = this.surfaceHeights[Math.min(iz + 1, segments) * size + Math.min(ix + 1, segments)];

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    return h0 * (1 - fz) + h1 * fz;
  }

  private generateLayerGeometry(layerIndex: number, topHeightFunc: (x: number, z: number) => number, bottomHeightFunc: (x: number, z: number) => number): THREE.BufferGeometry {
    const { width, depth, segments } = this.params;
    const geometry = new THREE.BufferGeometry();
    const halfW = width / 2;
    const halfD = depth / 2;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    const addVertex = (x: number, y: number, z: number, u: number, v: number) => {
      positions.push(x, y, z);
      normals.push(0, 1, 0);
      uvs.push(u, v);
    };

    const addQuad = (x1: number, z1: number, x2: number, z2: number, x3: number, z3: number, x4: number, z4: number, heightFunc: (x: number, z: number) => number, isTop: boolean) => {
      const y1 = heightFunc(x1, z1);
      const y2 = heightFunc(x2, z2);
      const y3 = heightFunc(x3, z3);
      const y4 = heightFunc(x4, z4);

      const u1 = (x1 + halfW) / width;
      const v1 = (z1 + halfD) / depth;
      const u2 = (x2 + halfW) / width;
      const v2 = (z2 + halfD) / depth;
      const u3 = (x3 + halfW) / width;
      const v3 = (z3 + halfD) / depth;
      const u4 = (x4 + halfW) / width;
      const v4 = (z4 + halfD) / depth;

      if (isTop) {
        addVertex(x1, y1, z1, u1, v1);
        addVertex(x2, y2, z2, u2, v2);
        addVertex(x4, y4, z4, u4, v4);
        addVertex(x2, y2, z2, u2, v2);
        addVertex(x3, y3, z3, u3, v3);
        addVertex(x4, y4, z4, u4, v4);
      } else {
        addVertex(x1, y1, z1, u1, v1);
        addVertex(x4, y4, z4, u4, v4);
        addVertex(x2, y2, z2, u2, v2);
        addVertex(x2, y2, z2, u2, v2);
        addVertex(x4, y4, z4, u4, v4);
        addVertex(x3, y3, z3, u3, v3);
      }
    };

    for (let j = 0; j < segments; j++) {
      for (let i = 0; i < segments; i++) {
        const x1 = -halfW + (i / segments) * width;
        const x2 = -halfW + ((i + 1) / segments) * width;
        const z1 = -halfD + (j / segments) * depth;
        const z2 = -halfD + ((j + 1) / segments) * depth;

        addQuad(x1, z1, x2, z1, x2, z2, x1, z2, topHeightFunc, true);
        addQuad(x1, z1, x2, z1, x2, z2, x1, z2, bottomHeightFunc, false);
      }
    }

    for (let i = 0; i < segments; i++) {
      const x1 = -halfW + (i / segments) * width;
      const x2 = -halfW + ((i + 1) / segments) * width;
      const zFront = -halfD;
      const zBack = halfD;

      const yt1 = topHeightFunc(x1, zFront);
      const yt2 = topHeightFunc(x2, zFront);
      const yb1 = bottomHeightFunc(x1, zFront);
      const yb2 = bottomHeightFunc(x2, zFront);

      positions.push(x1, yb1, zFront, x2, yb2, zFront, x1, yt1, zFront);
      positions.push(x2, yb2, zFront, x2, yt2, zFront, x1, yt1, zFront);
      normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
      uvs.push(0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1);

      const yt3 = topHeightFunc(x1, zBack);
      const yt4 = topHeightFunc(x2, zBack);
      const yb3 = bottomHeightFunc(x1, zBack);
      const yb4 = bottomHeightFunc(x2, zBack);

      positions.push(x1, yb1, zBack, x1, yt3, zBack, x2, yb4, zBack);
      positions.push(x2, yb4, zBack, x1, yt3, zBack, x2, yt4, zBack);
      normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
      uvs.push(0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1);
    }

    for (let j = 0; j < segments; j++) {
      const z1 = -halfD + (j / segments) * depth;
      const z2 = -halfD + ((j + 1) / segments) * depth;
      const xLeft = -halfW;
      const xRight = halfW;

      const yt1 = topHeightFunc(xLeft, z1);
      const yt2 = topHeightFunc(xLeft, z2);
      const yb1 = bottomHeightFunc(xLeft, z1);
      const yb2 = bottomHeightFunc(xLeft, z2);

      positions.push(xLeft, yb1, z1, xLeft, yb2, z2, xLeft, yt1, z1);
      positions.push(xLeft, yb2, z2, xLeft, yt2, z2, xLeft, yt1, z1);
      normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);
      uvs.push(0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1);

      const yt3 = topHeightFunc(xRight, z1);
      const yt4 = topHeightFunc(xRight, z2);
      const yb3 = bottomHeightFunc(xRight, z1);
      const yb4 = bottomHeightFunc(xRight, z2);

      positions.push(xRight, yb3, z1, xRight, yt3, z1, xRight, yb4, z2);
      positions.push(xRight, yb4, z2, xRight, yt3, z1, xRight, yt4, z2);
      normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
      uvs.push(0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
  }

  private generateLayers(): void {
    const { layerCount, width, depth } = this.params;
    const halfW = width / 2;
    const halfD = depth / 2;

    let currentBottom = -6;
    const layerConfigs: { thickness: number; topFunc: (x: number, z: number) => number; bottomFunc: (x: number, z: number) => number }[] = [];

    for (let i = 0; i < layerCount; i++) {
      const thickness = 0.5 + Math.random() * 1.5;
      const isTopLayer = i === layerCount - 1;

      let layerTopFunc: (x: number, z: number) => number;

      if (isTopLayer) {
        layerTopFunc = (x: number, z: number) => this.getSurfaceHeight(x, z);
      } else {
        const offset = currentBottom + thickness;
        const waveScale = 0.3 + i * 0.1;
        const waveAmp = 0.2 + i * 0.1;
        layerTopFunc = (x: number, z: number) => {
          return offset +
            Math.sin(x * waveScale + z * waveScale * 0.7) * waveAmp +
            Math.sin(x * waveScale * 2.1 - z * waveScale * 1.3) * waveAmp * 0.5;
        };
      }

      const layerBottomFunc = (x: number, z: number) => {
        if (i === 0) return currentBottom;
        return layerConfigs[i - 1].topFunc(x, z);
      };

      layerConfigs.push({
        thickness,
        topFunc: layerTopFunc,
        bottomFunc: layerBottomFunc
      });

      currentBottom += thickness;
    }

    for (let i = 0; i < layerCount; i++) {
      const config = layerConfigs[i];
      const layerColor = TerrainModel.LAYER_COLORS[i] ?? { name: `层${i + 1}`, color: '#ffffff' };

      const geometry = this.generateLayerGeometry(i, config.topFunc, config.bottomFunc);

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(layerColor.color),
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0.05
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.terrainGroup.add(mesh);
      this.layerMeshes.push(mesh);

      this.layerInfos.push({
        name: layerColor.name,
        color: layerColor.color,
        thickness: config.thickness,
        topY: config.topFunc(0, 0),
        bottomY: config.bottomFunc(0, 0)
      });

      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
      });

      const topGridPoints: THREE.Vector3[] = [];
      const gridStep = 4;
      for (let gx = -halfW; gx <= halfW; gx += gridStep) {
        for (let gz = -halfD; gz <= halfD; gz += 0.5) {
          topGridPoints.push(new THREE.Vector3(gx, config.topFunc(gx, gz), gz));
        }
      }
      for (let gz = -halfD; gz <= halfD; gz += gridStep) {
        for (let gx = -halfW; gx <= halfW; gx += 0.5) {
          topGridPoints.push(new THREE.Vector3(gx, config.topFunc(gx, gz), gz));
        }
      }

      const edgeGeometry = new THREE.BufferGeometry().setFromPoints(topGridPoints);
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      this.terrainGroup.add(edges);
      this.layerEdges.push(edges);
    }

    const borderPoints: THREE.Vector3[] = [];
    const borderStep = 0.5;

    for (let x = -halfW; x <= halfW; x += borderStep) {
      for (let i = 0; i < layerCount; i++) {
        const y1 = layerConfigs[i].topFunc(x, -halfD);
        const y2 = layerConfigs[i].topFunc(x + borderStep, -halfD);
        borderPoints.push(new THREE.Vector3(x, y1, -halfD));
        borderPoints.push(new THREE.Vector3(x + borderStep, y2, -halfD));

        const y3 = layerConfigs[i].topFunc(x, halfD);
        const y4 = layerConfigs[i].topFunc(x + borderStep, halfD);
        borderPoints.push(new THREE.Vector3(x, y3, halfD));
        borderPoints.push(new THREE.Vector3(x + borderStep, y4, halfD));
      }
    }

    for (let z = -halfD; z <= halfD; z += borderStep) {
      for (let i = 0; i < layerCount; i++) {
        const y1 = layerConfigs[i].topFunc(-halfW, z);
        const y2 = layerConfigs[i].topFunc(-halfW, z + borderStep);
        borderPoints.push(new THREE.Vector3(-halfW, y1, z));
        borderPoints.push(new THREE.Vector3(-halfW, y2, z + borderStep));

        const y3 = layerConfigs[i].topFunc(halfW, z);
        const y4 = layerConfigs[i].topFunc(halfW, z + borderStep);
        borderPoints.push(new THREE.Vector3(halfW, y3, z));
        borderPoints.push(new THREE.Vector3(halfW, y4, z + borderStep));
      }
    }

    const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      linewidth: 1
    });
    const borderLines = new THREE.LineSegments(borderGeometry, borderMaterial);
    this.terrainGroup.add(borderLines);
  }

  private generateVegetation(): void {
    const { width, depth } = this.params;
    const halfW = width / 2;
    const halfD = depth / 2;

    const count = 30 + Math.floor(Math.random() * 21);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * (width - 2);
      const z = (Math.random() - 0.5) * (depth - 2);
      const y = this.getSurfaceHeight(x, z);

      if (y < -1) continue;

      const height = 0.2 + Math.random() * 0.3;
      const radius = 0.1 + Math.random() * 0.1;

      const geometry = new THREE.ConeGeometry(radius, height, 6);
      geometry.translate(0, height / 2, 0);

      const heightFactor = Math.max(0, Math.min(1, (y + 2) / 4));
      const lowColor = new THREE.Color('#7cb342');
      const highColor = new THREE.Color('#388e3c');
      const treeColor = lowColor.clone().lerp(highColor, heightFactor);

      const material = new THREE.MeshStandardMaterial({
        color: treeColor,
        roughness: 0.8,
        flatShading: true
      });

      const cone = new THREE.Mesh(geometry, material);
      cone.position.set(x, y, z);
      cone.rotation.x = (Math.random() - 0.5) * (Math.PI / 12);
      cone.rotation.z = (Math.random() - 0.5) * (Math.PI / 12);
      cone.rotation.y = Math.random() * Math.PI * 2;

      this.vegetationGroup.add(cone);
      this.allVegetation.push(cone);
    }
  }

  public setVegetationLOD(distance: number): void {
    const showRatio = distance > 10 ? 0.5 : 1.0;
    const visibleCount = Math.floor(this.allVegetation.length * showRatio);

    this.allVegetation.forEach((mesh, index) => {
      mesh.visible = index < visibleCount;
    });
  }

  public dispose(): void {
    this.layerMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.layerEdges.forEach(edge => {
      edge.geometry.dispose();
      (edge.material as THREE.Material).dispose();
    });
    this.allVegetation.forEach(veg => {
      veg.geometry.dispose();
      (veg.material as THREE.Material).dispose();
    });
  }
}
