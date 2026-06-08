import * as THREE from 'three';

export interface LeafOptions {
  size?: number;
  length?: number;
  width?: number;
  rotation?: THREE.Euler;
  position?: THREE.Vector3;
  isCotyledon?: boolean;
}

export interface EnvironmentParams {
  light: number;
  water: number;
  temperature: number;
}

class Leaf {
  public mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshPhysicalMaterial;
  private basePositions: Float32Array;
  private baseNormals: Float32Array;
  private size: number;
  private length: number;
  private width: number;
  private curlAmount: number = 0;
  private targetCurlAmount: number = 0;
  private yellowAmount: number = 0;
  private targetYellowAmount: number = 0;
  private greenIntensity: number = 0.7;
  private targetGreenIntensity: number = 0.7;
  private swayOffset: number;
  private swaySpeed: number;
  private swayAmount: number;
  private time: number = 0;
  private baseRotation: THREE.Euler;
  private unfoldProgress: number = 0;
  private targetUnfoldProgress: number = 1;
  private unfoldDuration: number = 0.5;
  private isCotyledon: boolean;
  private leafColors: { tip: THREE.Color; middle: THREE.Color; base: THREE.Color };

  constructor(options: LeafOptions = {}) {
    this.size = options.size || 1;
    this.length = (options.length || 1.2) * this.size;
    this.width = (options.width || 0.6) * this.size;
    this.isCotyledon = options.isCotyledon || false;
    this.swayOffset = Math.random() * Math.PI * 2;
    this.swaySpeed = 1.5 + Math.random() * 0.5;
    this.swayAmount = this.isCotyledon ? 0.08 : 0.05;
    this.baseRotation = options.rotation ? options.rotation.clone() : new THREE.Euler();

    this.leafColors = {
      tip: new THREE.Color(0x8bc34a),
      middle: new THREE.Color(0x4caf50),
      base: new THREE.Color(0x388e3c)
    };

    this.geometry = this.createLeafGeometry();
    this.material = new THREE.MeshPhysicalMaterial({
      color: 0x4caf50,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.05,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.98
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    if (options.position) {
      this.mesh.position.copy(options.position);
    }
    this.mesh.rotation.copy(this.baseRotation);

    const posAttr = this.geometry.getAttribute('position');
    this.basePositions = new Float32Array(posAttr.array as Float32Array);
    const normAttr = this.geometry.getAttribute('normal');
    this.baseNormals = new Float32Array(normAttr.array as Float32Array);

    if (this.isCotyledon) {
      this.unfoldProgress = 0;
      this.targetUnfoldProgress = 1;
    }
  }

  private createLeafGeometry(): THREE.BufferGeometry {
    const segmentsLength = 20;
    const segmentsWidth = 12;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segmentsWidth; i++) {
      for (let j = 0; j <= segmentsLength; j++) {
        const u = j / segmentsLength;
        const v = i / segmentsWidth;

        const { x, y, z } = this.calculateLeafPoint(u, v, 0);

        positions.push(x, y, z);

        const normal = this.calculateNormal(u, v);
        normals.push(normal.x, normal.y, normal.z);

        uvs.push(u, v);

        const color = this.getLeafColor(u);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let i = 0; i < segmentsWidth; i++) {
      for (let j = 0; j < segmentsLength; j++) {
        const a = i * (segmentsLength + 1) + j;
        const b = a + segmentsLength + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  private bezier3(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  }

  private bezierV3(
    p0: THREE.Vector3,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3,
    t: number
  ): THREE.Vector3 {
    const mt = 1 - t;
    return new THREE.Vector3(
      mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
      mt * mt * mt * p0.z + 3 * mt * mt * t * p1.z + 3 * mt * t * t * p2.z + t * t * t * p3.z
    );
  }

  private calculateLeafPoint(u: number, v: number, curl: number): { x: number; y: number; z: number } {
    const halfWidth = this.width / 2;

    const tipPos = new THREE.Vector3(0, this.length * 0.9, 0);
    const midPos = new THREE.Vector3(0, this.length * 0.5, 0);
    const basePos = new THREE.Vector3(0, 0, 0);

    const midControl = new THREE.Vector3(0, this.length * 0.5, this.length * 0.05);
    const tipControl = new THREE.Vector3(0, this.length * 0.75, this.length * 0.02);

    const veinPoint = this.bezierV3(basePos, midControl, tipControl, tipPos, u);

    const widthFactor = Math.sin(u * Math.PI);
    const edgeOffset = halfWidth * widthFactor * (v - 0.5) * 2;

    const curlAngle = curl * widthFactor * (v - 0.5) * 2;
    const curlOffset = Math.sin(curlAngle) * halfWidth * widthFactor * Math.abs(v - 0.5) * 2;

    let x = edgeOffset;
    let y = veinPoint.y;
    let z = veinPoint.z + curlOffset;

    if (u < 0.15) {
      const petioleFactor = u / 0.15;
      x *= petioleFactor;
      z *= petioleFactor;
    }

    const arch = Math.sin(u * Math.PI) * 0.1 * this.length;
    y += arch * (v - 0.5) * (v - 0.5) * 4;

    return { x, y, z };
  }

  private calculateNormal(u: number, v: number): THREE.Vector3 {
    const eps = 0.001;
    const p0 = this.calculateLeafPoint(u, v, 0);
    const pU = this.calculateLeafPoint(Math.min(u + eps, 1), v, 0);
    const pV = this.calculateLeafPoint(u, Math.min(v + eps, 1), 0);

    const v1 = new THREE.Vector3(pU.x - p0.x, pU.y - p0.y, pU.z - p0.z);
    const v2 = new THREE.Vector3(pV.x - p0.x, pV.y - p0.y, pV.z - p0.z);

    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
    return normal;
  }

  private getLeafColor(u: number, yellowAmt: number = 0, greenInt: number = 0.7): THREE.Color {
    const tipColor = new THREE.Color(0x8bc34a);
    const midColor = new THREE.Color(0x4caf50);
    const baseColor = new THREE.Color(0x2e7d32);

    const darkTip = new THREE.Color(0x558b2f);
    const darkMid = new THREE.Color(0x33691e);
    const darkBase = new THREE.Color(0x1b5e20);

    const lightTip = new THREE.Color(0xc5e1a5);
    const lightMid = new THREE.Color(0xaed581);
    const lightBase = new THREE.Color(0x9ccc65);

    let tCol, mCol, bCol;
    if (greenInt > 0.5) {
      const factor = (greenInt - 0.5) * 2;
      tCol = tipColor.clone().lerp(darkTip, factor);
      mCol = midColor.clone().lerp(darkMid, factor);
      bCol = baseColor.clone().lerp(darkBase, factor);
    } else {
      const factor = (0.5 - greenInt) * 2;
      tCol = tipColor.clone().lerp(lightTip, factor);
      mCol = midColor.clone().lerp(lightMid, factor);
      bCol = baseColor.clone().lerp(lightBase, factor);
    }

    let color;
    if (u < 0.3) {
      const t = u / 0.3;
      color = bCol.clone().lerp(mCol, t);
    } else if (u < 0.7) {
      const t = (u - 0.3) / 0.4;
      color = mCol.clone().lerp(tCol, t);
    } else {
      const t = (u - 0.7) / 0.3;
      color = tCol.clone().lerp(new THREE.Color(0x7cb342), t);
    }

    if (yellowAmt > 0) {
      const yellowZone = 1 - u;
      const yellowEffect = Math.max(0, (yellowZone - (1 - yellowAmt)) / Math.max(0.001, yellowAmt));
      const yellowColor = new THREE.Color(0xffeb3b);
      color.lerp(yellowColor, yellowEffect * 0.7);
    }

    return color;
  }

  public updateEnvironment(env: EnvironmentParams): void {
    this.targetGreenIntensity = 0.3 + env.light * 0.7;

    this.targetYellowAmount = Math.max(0, 1 - env.water * 1.5);
    this.targetYellowAmount = Math.min(1, this.targetYellowAmount);

    const heatStress = Math.max(0, (env.temperature - 0.7) / 0.3);
    this.targetCurlAmount = heatStress * (Math.PI / 9);
  }

  public update(delta: number, time: number): void {
    this.time = time;

    this.curlAmount += (this.targetCurlAmount - this.curlAmount) * delta * 2;
    this.yellowAmount += (this.targetYellowAmount - this.yellowAmount) * delta * 0.8;
    this.greenIntensity += (this.targetGreenIntensity - this.greenIntensity) * delta * 1.5;

    if (this.unfoldProgress < this.targetUnfoldProgress) {
      this.unfoldProgress = Math.min(1, this.unfoldProgress + delta / this.unfoldDuration);
    }

    this.updateGeometry();
    this.updateColors();
    this.updateSway();
  }

  private updateGeometry(): void {
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;

    const segmentsLength = 20;
    const segmentsWidth = 12;

    let idx = 0;
    for (let i = 0; i <= segmentsWidth; i++) {
      for (let j = 0; j <= segmentsLength; j++) {
        const u = j / segmentsLength;
        const v = i / segmentsWidth;

        let curl = this.curlAmount;
        let scale = 1;

        if (this.unfoldProgress < 1) {
          scale = 0.3 + this.unfoldProgress * 0.7;
          curl += (1 - this.unfoldProgress) * Math.PI * 0.5;
        }

        const point = this.calculateLeafPoint(u, v, curl);

        posArray[idx] = point.x * scale;
        posArray[idx + 1] = point.y * scale;
        posArray[idx + 2] = point.z * scale;

        idx += 3;
      }
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private updateColors(): void {
    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const colorArray = colors.array as Float32Array;

    const segmentsLength = 20;
    const segmentsWidth = 12;

    let idx = 0;
    for (let i = 0; i <= segmentsWidth; i++) {
      for (let j = 0; j <= segmentsLength; j++) {
        const u = j / segmentsLength;
        const color = this.getLeafColor(u, this.yellowAmount, this.greenIntensity);

        colorArray[idx] = color.r;
        colorArray[idx + 1] = color.g;
        colorArray[idx + 2] = color.b;

        idx += 3;
      }
    }

    colors.needsUpdate = true;
  }

  private updateSway(): void {
    const sway = Math.sin(this.time * this.swaySpeed + this.swayOffset) * this.swayAmount;
    const swayZ = Math.cos(this.time * this.swaySpeed * 0.7 + this.swayOffset) * this.swayAmount * 0.5;

    this.mesh.rotation.x = this.baseRotation.x + sway * 0.5;
    this.mesh.rotation.y = this.baseRotation.y + sway;
    this.mesh.rotation.z = this.baseRotation.z + swayZ;
  }

  public setUnfoldTarget(value: number): void {
    this.targetUnfoldProgress = value;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class LeafSystem {
  private leaves: Leaf[] = [];
  private scene: THREE.Scene;
  private parent: THREE.Group;
  private environment: EnvironmentParams = {
    light: 0.7,
    water: 0.7,
    temperature: 0.5
  };

  constructor(scene: THREE.Scene, parent?: THREE.Group) {
    this.scene = scene;
    this.parent = parent || new THREE.Group();
    if (!parent) {
      this.scene.add(this.parent);
    }
  }

  public addLeaf(options: LeafOptions = {}): Leaf {
    const leaf = new Leaf(options);
    this.parent.add(leaf.mesh);
    this.leaves.push(leaf);
    leaf.updateEnvironment(this.environment);
    return leaf;
  }

  public removeLeaf(leaf: Leaf): void {
    const index = this.leaves.indexOf(leaf);
    if (index > -1) {
      this.parent.remove(leaf.mesh);
      leaf.dispose();
      this.leaves.splice(index, 1);
    }
  }

  public clear(): void {
    for (const leaf of this.leaves) {
      this.parent.remove(leaf.mesh);
      leaf.dispose();
    }
    this.leaves = [];
  }

  public setEnvironment(env: EnvironmentParams): void {
    this.environment = { ...env };
    for (const leaf of this.leaves) {
      leaf.updateEnvironment(this.environment);
    }
  }

  public getEnvironment(): EnvironmentParams {
    return { ...this.environment };
  }

  public update(delta: number, time: number): void {
    for (const leaf of this.leaves) {
      leaf.update(delta, time);
    }
  }

  public getGroup(): THREE.Group {
    return this.parent;
  }

  public getLeaves(): Leaf[] {
    return this.leaves;
  }

  public dispose(): void {
    this.clear();
  }
}
