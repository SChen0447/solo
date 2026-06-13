import * as THREE from 'three';

interface BuildingData {
  mesh: THREE.Mesh;
  windows: THREE.Mesh[];
  signalLight: THREE.Mesh | null;
  signalColor: THREE.Color;
  originalEmissive: THREE.Color;
  isHighlighted: boolean;
  highlightTimer: number;
}

export class CityBuilder {
  public group: THREE.Group = new THREE.Group();
  public buildings: BuildingData[] = [];
  public ground!: THREE.Mesh;
  public buildingCount: number = 0;
  public signalLightsEnabled: boolean = true;

  private readonly GRID_SIZE = 10;
  private readonly CELL_SIZE = 20;
  private readonly BUILDING_COLORS = [
    new THREE.Color(0x2d1b69),
    new THREE.Color(0x1a237e),
    new THREE.Color(0x4a148c),
  ];
  private readonly WINDOW_COLOR = new THREE.Color(0xffd54f);
  private readonly SIGNAL_RED = new THREE.Color(0xff3333);
  private readonly SIGNAL_BLUE = new THREE.Color(0x3366ff);

  public build(scene: THREE.Scene): Promise<void> {
    return new Promise((resolve) => {
      this.createGround();
      this.createBuildings(() => {
        scene.add(this.group);
        resolve();
      });
    });
  }

  private createGround(): void {
    const totalSize = this.GRID_SIZE * this.CELL_SIZE;
    const geometry = new THREE.PlaneGeometry(totalSize, totalSize);
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.9,
      shininess: 20,
      specular: new THREE.Color(0x2a0a4a),
    });
    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.group.add(this.ground);

    const gridHelper = new THREE.GridHelper(
      totalSize,
      this.GRID_SIZE,
      new THREE.Color(0x9d4edd),
      new THREE.Color(0x3d1b6e)
    );
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    this.group.add(gridHelper);
  }

  private createBuildings(onProgress: (progress: number) => void): void {
    const halfGrid = (this.GRID_SIZE * this.CELL_SIZE) / 2;
    const cell = this.CELL_SIZE;

    for (let gx = 0; gx < this.GRID_SIZE; gx++) {
      for (let gz = 0; gz < this.GRID_SIZE; gz++) {
        const cellX = -halfGrid + gx * cell + cell / 2;
        const cellZ = -halfGrid + gz * cell + cell / 2;

        const width = 8 + Math.random() * 12;
        const depth = 8 + Math.random() * 12;
        const height = 10 + Math.random() * 70;

        const colorIdx = Math.floor(Math.random() * this.BUILDING_COLORS.length);
        const baseColor = this.BUILDING_COLORS[colorIdx].clone();

        const bldGeo = new THREE.BoxGeometry(width, height, depth);
        const bldMat = new THREE.MeshPhongMaterial({
          color: baseColor,
          emissive: baseColor.clone().multiplyScalar(0.15),
          shininess: 60,
          specular: new THREE.Color(0x4a2a8a),
        });
        const bldMesh = new THREE.Mesh(bldGeo, bldMat);
        bldMesh.position.set(cellX, height / 2, cellZ);
        bldMesh.castShadow = true;
        bldMesh.receiveShadow = true;
        this.group.add(bldMesh);

        const windows: THREE.Mesh[] = this.createWindows(
          width,
          height,
          depth,
          cellX,
          height / 2,
          cellZ
        );

        const signalLight = this.createSignalLight(
          cellX,
          height,
          cellZ,
          width,
          depth
        );
        const signalColor =
          Math.random() > 0.5
            ? this.SIGNAL_RED.clone()
            : this.SIGNAL_BLUE.clone();

        this.buildings.push({
          mesh: bldMesh,
          windows,
          signalLight,
          signalColor,
          originalEmissive: baseColor.clone().multiplyScalar(0.15),
          isHighlighted: false,
          highlightTimer: 0,
        });
        this.buildingCount++;
      }
      const progress = ((gx + 1) / this.GRID_SIZE) * 100;
      onProgress(progress);
    }
  }

  private createWindows(
    width: number,
    height: number,
    depth: number,
    px: number,
    py: number,
    pz: number
  ): THREE.Mesh[] {
    const windows: THREE.Mesh[] = [];
    const cols = 3;
    const rows = 5;
    const winW = (width * 0.55) / cols;
    const winH = (height * 0.65) / rows;
    const startX = -width * 0.22;
    const startY = -height * 0.28;
    const gapX = (width * 0.55 - cols * winW) / (cols - 1 || 1);
    const gapY = (height * 0.65 - rows * winH) / (rows - 1 || 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.35) continue;

        const winGeo = new THREE.PlaneGeometry(winW * 0.85, winH * 0.75);
        const winMat = new THREE.MeshBasicMaterial({
          color: this.WINDOW_COLOR,
          transparent: true,
          opacity: 0,
        });

        const faces = [
          {
            rx: 0,
            ry: 0,
            rz: 0,
            ox: px,
            oy: py + startY + r * (winH + gapY) + winH / 2,
            oz: pz + depth / 2 + 0.02,
          },
          {
            rx: 0,
            ry: Math.PI,
            rz: 0,
            ox: px,
            oy: py + startY + r * (winH + gapY) + winH / 2,
            oz: pz - depth / 2 - 0.02,
          },
          {
            rx: 0,
            ry: -Math.PI / 2,
            rz: 0,
            ox: px - width / 2 - 0.02,
            oy: py + startY + r * (winH + gapY) + winH / 2,
            oz: pz + startX + c * (winW + gapX) + winW / 2,
          },
          {
            rx: 0,
            ry: Math.PI / 2,
            rz: 0,
            ox: px + width / 2 + 0.02,
            oy: py + startY + r * (winH + gapY) + winH / 2,
            oz: pz + startX + c * (winW + gapX) + winW / 2,
          },
        ];

        const face = faces[Math.floor(Math.random() * faces.length)];
        const win = new THREE.Mesh(winGeo, winMat);
        win.rotation.set(face.rx, face.ry, face.rz);
        win.position.set(face.ox, face.oy, face.oz);
        this.group.add(win);
        windows.push(win);
      }
    }

    return windows;
  }

  private createSignalLight(
    px: number,
    height: number,
    pz: number,
    width: number,
    depth: number
  ): THREE.Mesh | null {
    if (Math.random() < 0.5) return null;

    const size = 1 + Math.random() * 1.2;
    const geo = new THREE.BoxGeometry(size, size, size);
    const color = Math.random() > 0.5 ? this.SIGNAL_RED : this.SIGNAL_BLUE;
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const offsetX = (Math.random() - 0.5) * width * 0.4;
    const offsetZ = (Math.random() - 0.5) * depth * 0.4;
    mesh.position.set(px + offsetX, height + size, pz + offsetZ);
    this.group.add(mesh);
    return mesh;
  }

  public update(time: number, deltaTime: number): void {
    const nightFactor = this.calcNightFactor(time);

    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];

      b.windows.forEach((w) => {
        const mat = w.material as THREE.MeshBasicMaterial;
        mat.opacity = nightFactor * 0.95;
      });

      if (b.signalLight && this.signalLightsEnabled) {
        const phase = (performance.now() / 500 + i * 0.3) % 2;
        const blink = phase < 1 ? 1 : 0.2;
        const mat = b.signalLight.material as THREE.MeshBasicMaterial;
        mat.opacity = blink * Math.max(0.4, nightFactor);
      }

      if (b.isHighlighted) {
        b.highlightTimer -= deltaTime;
        const t = Math.max(0, b.highlightTimer);
        const mat = b.mesh.material as THREE.MeshPhongMaterial;
        const glow = t * 0.6;
        mat.emissive.copy(b.originalEmissive).addScalar(glow);
        if (b.highlightTimer <= 0) {
          b.isHighlighted = false;
          mat.emissive.copy(b.originalEmissive);
        }
      } else {
        const mat = b.mesh.material as THREE.MeshPhongMaterial;
        mat.emissive.copy(b.originalEmissive).multiplyScalar(0.6 + nightFactor * 0.8);
      }
    }
  }

  private calcNightFactor(t: number): number {
    if (t < 0.2) return 0;
    if (t < 0.35) return (t - 0.2) / 0.15;
    if (t < 0.45) return 1;
    if (t < 0.55) return 1 - (t - 0.45) / 0.1;
    if (t < 0.7) return 0;
    if (t < 0.85) return (t - 0.7) / 0.15;
    return 1;
  }

  public highlightBuilding(mesh: THREE.Mesh): void {
    const b = this.buildings.find((x) => x.mesh === mesh);
    if (b) {
      b.isHighlighted = true;
      b.highlightTimer = 1.0;
    }
  }

  public getBuildingMeshes(): THREE.Mesh[] {
    return this.buildings.map((b) => b.mesh);
  }

  public playRoofWaveAnimation(): Promise<void> {
    return new Promise((resolve) => {
      const duration = 2000;
      const startTime = performance.now();
      const sorted = [...this.buildings].sort((a, b) => a.mesh.position.x - b.mesh.position.x);

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        sorted.forEach((b, idx) => {
          const wavePos = (idx / sorted.length) * 0.8;
          const localProgress = Math.max(0, Math.min(1, (progress - wavePos) / 0.3));
          if (localProgress > 0 && b.signalLight) {
            const mat = b.signalLight.material as THREE.MeshBasicMaterial;
            mat.opacity = localProgress * 0.9;
          }
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      animate();
    });
  }
}
