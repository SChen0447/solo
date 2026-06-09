import * as THREE from 'three';

export type CrystalPhase = 'nucleus' | 'growth' | 'ripening' | 'polyhedron';
export type Direction = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';

export interface PrismData {
  id: string;
  direction: Direction;
  position: THREE.Vector3;
  size: number;
  targetSize: number;
  layerIndex: number;
  formationTime: number;
  mesh: THREE.Mesh;
  edgeLines: THREE.LineSegments;
  originalColor: THREE.Color;
}

export interface CrystalParams {
  temperature: number;
  supersaturation: number;
  growthRate: number;
}

const DIRECTION_COLORS: Record<Direction, string> = {
  '+x': '#FF6B6B',
  '-x': '#FF6B6B',
  '+y': '#4ECDC4',
  '-y': '#4ECDC4',
  '+z': '#FFE66D',
  '-z': '#FFE66D',
};

const DIRECTION_VECTORS: Record<Direction, THREE.Vector3> = {
  '+x': new THREE.Vector3(1, 0, 0),
  '-x': new THREE.Vector3(-1, 0, 0),
  '+y': new THREE.Vector3(0, 1, 0),
  '-y': new THREE.Vector3(0, -1, 0),
  '+z': new THREE.Vector3(0, 0, 1),
  '-z': new THREE.Vector3(0, 0, -1),
};

const DIRECTION_NAMES: Record<Direction, string> = {
  '+x': '+X',
  '-x': '-X',
  '+y': '+Y',
  '-y': '-Y',
  '+z': '+Z',
  '-z': '-Z',
};

export { DIRECTION_VECTORS, DIRECTION_NAMES };

export class CrystalGrowth {
  public scene: THREE.Scene;
  public params: CrystalParams;
  public phase: CrystalPhase = 'nucleus';
  public nucleusRadius: number = 0.5;
  public targetNucleusRadius: number = 0.5;
  public prisms: PrismData[] = [];
  public nucleusMesh!: THREE.Mesh;
  public polyhedronMesh: THREE.Mesh | null = null;
  public polyhedronEdges: THREE.LineSegments | null = null;
  public growthLayers: number = 0;
  public lastLayerTime: number = 0;
  public isPaused: boolean = false;
  public ripeningProgress: number = 0;
  public startTime: number = 0;
  public elapsedTime: number = 0;

  private layerInterval: number = 500;
  private layerThickness: number = 0.08;
  private layerGap: number = 0.02;
  private minPrismSize: number = 0.1;
  private maxPrismSize: number = 0.5;
  private maxPrisms: number = 150;
  private ripeningThreshold: number = 1.8;
  private idCounter: number = 0;

  constructor(scene: THREE.Scene, params: CrystalParams) {
    this.scene = scene;
    this.params = { ...params };
    this.startTime = performance.now();
    this.createNucleus();
  }

  private createNucleus() {
    const geometry = new THREE.SphereGeometry(this.nucleusRadius, 32, 32);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = (Math.random() - 0.5) * 0.08;
      const len = Math.sqrt(x * x + y * y + z * z);
      const scale = (this.nucleusRadius + noise) / len;
      positions.setXYZ(i, x * scale, y * scale, z * scale);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color('#4FC3F7'),
      transparent: true,
      opacity: 0.7,
      shininess: 100,
      emissive: new THREE.Color('#4FC3F7'),
      emissiveIntensity: 0.15,
    });

    this.nucleusMesh = new THREE.Mesh(geometry, material);
    this.nucleusMesh.userData.isNucleus = true;
    this.nucleusMesh.userData.normal = 'center';
    this.nucleusMesh.userData.size = this.nucleusRadius.toFixed(2);
    this.nucleusMesh.userData.time = '0.0s';
    this.scene.add(this.nucleusMesh);
  }

  public setParams(params: Partial<CrystalParams>) {
    Object.assign(this.params, params);
    if (this.phase === 'nucleus') {
      this.phase = 'growth';
    }
  }

  public togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public reset() {
    for (const prism of this.prisms) {
      this.scene.remove(prism.mesh);
      this.scene.remove(prism.edgeLines);
      prism.mesh.geometry.dispose();
      (prism.mesh.material as THREE.Material).dispose();
      prism.edgeLines.geometry.dispose();
      (prism.edgeLines.material as THREE.Material).dispose();
    }
    this.prisms = [];

    if (this.polyhedronMesh) {
      this.scene.remove(this.polyhedronMesh);
      this.polyhedronMesh.geometry.dispose();
      (this.polyhedronMesh.material as THREE.Material).dispose();
      this.polyhedronMesh = null;
    }
    if (this.polyhedronEdges) {
      this.scene.remove(this.polyhedronEdges);
      this.polyhedronEdges.geometry.dispose();
      (this.polyhedronEdges.material as THREE.Material).dispose();
      this.polyhedronEdges = null;
    }

    this.scene.remove(this.nucleusMesh);
    this.nucleusMesh.geometry.dispose();
    (this.nucleusMesh.material as THREE.Material).dispose();

    this.phase = 'nucleus';
    this.nucleusRadius = 0.5;
    this.targetNucleusRadius = 0.5;
    this.growthLayers = 0;
    this.lastLayerTime = 0;
    this.isPaused = false;
    this.ripeningProgress = 0;
    this.elapsedTime = 0;
    this.startTime = performance.now();
    this.idCounter = 0;

    this.createNucleus();
  }

  private getDirectionPriority(): Direction[] {
    const tempFactor = this.params.temperature / 100;
    const satFactor = (this.params.supersaturation - 1) / 4;

    const weights: Record<Direction, number> = {
      '+x': 0.8 + Math.random() * 0.4 * tempFactor,
      '-x': 0.8 + Math.random() * 0.4 * tempFactor,
      '+y': 1.0 + satFactor * 0.3 + Math.random() * 0.2,
      '-y': 0.6 + Math.random() * 0.3,
      '+z': 0.9 + Math.random() * 0.3,
      '-z': 0.9 + Math.random() * 0.3,
    };

    return (Object.keys(weights) as Direction[])
      .sort((a, b) => weights[b] - weights[a]);
  }

  private createPrism(direction: Direction, layerIndex: number): PrismData {
    const dirVec = DIRECTION_VECTORS[direction];
    const baseRadius = this.nucleusRadius;
    const distance = baseRadius + layerIndex * (this.layerThickness + this.layerGap) + this.layerThickness / 2;

    const position = dirVec.clone().multiplyScalar(distance);
    const targetSize = this.minPrismSize + (this.maxPrismSize - this.minPrismSize) * Math.min(1, layerIndex / 10);

    const size = this.minPrismSize;

    const boxSize = new THREE.Vector3(
      direction === '+x' || direction === '-x' ? this.layerThickness : size,
      direction === '+y' || direction === '-y' ? this.layerThickness : size,
      direction === '+z' || direction === '-z' ? this.layerThickness : size
    );

    const geometry = new THREE.BoxGeometry(boxSize.x, boxSize.y, boxSize.z);
    const color = new THREE.Color(DIRECTION_COLORS[direction]);

    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
      shininess: 120,
      emissive: color,
      emissiveIntensity: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData.isPrism = true;
    mesh.userData.direction = DIRECTION_NAMES[direction];
    mesh.userData.size = targetSize.toFixed(2);
    mesh.userData.time = (this.elapsedTime / 1000).toFixed(1) + 's';

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.31,
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    edgeLines.position.copy(position);

    this.scene.add(mesh);
    this.scene.add(edgeLines);

    this.idCounter++;
    return {
      id: 'prism_' + this.idCounter,
      direction,
      position,
      size,
      targetSize,
      layerIndex,
      formationTime: this.elapsedTime,
      mesh,
      edgeLines,
      originalColor: color.clone(),
    };
  }

  private addGrowthLayer() {
    if (this.prisms.length >= this.maxPrisms) return;
    if (this.nucleusRadius >= 2.0) return;

    this.growthLayers++;
    const directions = this.getDirectionPriority();
    const numDirections = Math.min(
      directions.length,
      Math.ceil(3 + this.params.supersaturation)
    );

    for (let i = 0; i < numDirections && this.prisms.length < this.maxPrisms; i++) {
      const prism = this.createPrism(directions[i], this.growthLayers);
      this.prisms.push(prism);
    }

    this.targetNucleusRadius = Math.min(2.0, 0.5 + this.growthLayers * 0.03);
  }

  private checkRipening(): boolean {
    return this.prisms.length >= this.maxPrisms || this.nucleusRadius >= this.ripeningThreshold;
  }

  private adjustColorForRipening(color: THREE.Color, progress: number): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.s = Math.max(0.2, hsl.s - 0.2 * progress);
    hsl.l = Math.min(0.9, hsl.l + 0.1 * progress);
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  private startRipening() {
    this.phase = 'ripening';
    this.ripeningProgress = 0;
  }

  private createPolyhedron() {
    const faceCount = 8 + Math.floor(Math.random() * 19);

    let geometry: THREE.BufferGeometry;
    if (faceCount <= 12) {
      geometry = new THREE.OctahedronGeometry(this.nucleusRadius + 0.3, 0);
    } else if (faceCount <= 18) {
      geometry = new THREE.DodecahedronGeometry(this.nucleusRadius + 0.3, 0);
    } else {
      geometry = new THREE.IcosahedronGeometry(this.nucleusRadius + 0.3, 0);
    }

    const avgColor = new THREE.Color('#88BBFF');
    if (this.prisms.length > 0) {
      let r = 0, g = 0, b = 0;
      for (const p of this.prisms) {
        r += p.originalColor.r;
        g += p.originalColor.g;
        b += p.originalColor.b;
      }
      r /= this.prisms.length;
      g /= this.prisms.length;
      b /= this.prisms.length;
      avgColor.setRGB(r, g, b);
    }

    const material = new THREE.MeshPhongMaterial({
      color: this.adjustColorForRipening(avgColor, 1),
      shininess: 160,
      transparent: true,
      opacity: 0.9,
      emissive: avgColor,
      emissiveIntensity: 0.15,
    });

    this.polyhedronMesh = new THREE.Mesh(geometry, material);
    this.polyhedronMesh.scale.setScalar(0.01);
    this.polyhedronMesh.userData.isPolyhedron = true;
    this.polyhedronMesh.userData.normal = 'polyhedron';
    this.polyhedronMesh.userData.size = (this.nucleusRadius + 0.3).toFixed(2);
    this.polyhedronMesh.userData.time = (this.elapsedTime / 1000).toFixed(1) + 's';
    this.scene.add(this.polyhedronMesh);

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      linewidth: 1,
    });
    this.polyhedronEdges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    this.polyhedronEdges.scale.setScalar(0.01);
    this.scene.add(this.polyhedronEdges);
  }

  public update(deltaTime: number) {
    if (this.isPaused) return;

    this.elapsedTime += deltaTime;

    if (this.phase === 'growth' || this.phase === 'nucleus') {
      if (this.phase === 'growth') {
        this.lastLayerTime += deltaTime;
        const interval = this.layerInterval / this.params.growthRate;

        if (this.lastLayerTime >= interval) {
          this.lastLayerTime = 0;
          this.addGrowthLayer();

          if (this.checkRipening()) {
            this.startRipening();
          }
        }
      }

      if (this.nucleusRadius < this.targetNucleusRadius) {
        this.nucleusRadius = Math.min(
          this.targetNucleusRadius,
          this.nucleusRadius + deltaTime * 0.001 * this.params.growthRate
        );
        this.nucleusMesh.scale.setScalar(this.nucleusRadius / 0.5);
      }

      for (const prism of this.prisms) {
        if (prism.size < prism.targetSize) {
          prism.size = Math.min(
            prism.targetSize,
            prism.size + deltaTime * 0.002 * this.params.growthRate
          );

          const dir = prism.direction;
          const newScaleX = dir === '+x' || dir === '-x' ? 1 : prism.size / this.minPrismSize;
          const newScaleY = dir === '+y' || dir === '-y' ? 1 : prism.size / this.minPrismSize;
          const newScaleZ = dir === '+z' || dir === '-z' ? 1 : prism.size / this.minPrismSize;

          prism.mesh.scale.set(newScaleX, newScaleY, newScaleZ);
          prism.edgeLines.scale.set(newScaleX, newScaleY, newScaleZ);
          prism.mesh.userData.size = prism.size.toFixed(2);
        }
      }
    } else if (this.phase === 'ripening') {
      this.ripeningProgress = Math.min(1, this.ripeningProgress + deltaTime * 0.0008);

      for (const prism of this.prisms) {
        const shrink = 1 - this.ripeningProgress * 0.95;
        prism.mesh.scale.multiplyScalar(1);
        prism.mesh.scale.set(
          Math.max(0.01, prism.mesh.scale.x * shrink),
          Math.max(0.01, prism.mesh.scale.y * shrink),
          Math.max(0.01, prism.mesh.scale.z * shrink)
        );
        prism.edgeLines.scale.copy(prism.mesh.scale);

        const mat = prism.mesh.material as THREE.MeshPhongMaterial;
        mat.color.copy(this.adjustColorForRipening(prism.originalColor, this.ripeningProgress));
        mat.opacity = Math.max(0, 0.85 - this.ripeningProgress * 0.8);

        const edgeMat = prism.edgeLines.material as THREE.LineBasicMaterial;
        edgeMat.opacity = Math.max(0, 0.31 - this.ripeningProgress * 0.3);
      }

      if (this.ripeningProgress > 0.3 && !this.polyhedronMesh) {
        this.createPolyhedron();
      }

      if (this.polyhedronMesh && this.polyhedronEdges) {
        const scale = Math.min(1, (this.ripeningProgress - 0.3) / 0.7);
        this.polyhedronMesh.scale.setScalar(scale);
        this.polyhedronEdges.scale.setScalar(scale);
      }

      if (this.ripeningProgress >= 1) {
        this.phase = 'polyhedron';
        for (const prism of this.prisms) {
          prism.mesh.visible = false;
          prism.edgeLines.visible = false;
        }
        this.nucleusMesh.visible = false;
      }
    }
  }

  public getInteractiveObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    if (this.nucleusMesh.visible) objects.push(this.nucleusMesh);
    for (const p of this.prisms) {
      if (p.mesh.visible) objects.push(p.mesh);
    }
    if (this.polyhedronMesh) objects.push(this.polyhedronMesh);
    return objects;
  }

  public getPrismCount(): number {
    return this.prisms.length;
  }

  public getPhaseText(): string {
    switch (this.phase) {
      case 'nucleus': return '晶核期';
      case 'growth': return '生长期';
      case 'ripening': return '熟化期';
      case 'polyhedron': return '多面体';
    }
  }
}
