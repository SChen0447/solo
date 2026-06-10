import * as THREE from 'three';
import {
  BlockMesh,
  ShapeType,
  createBlock,
  createHighlightEdges,
  switchBlockMaterial,
  updateHaloPosition,
  setBlockLowQuality,
  animatePlacement,
  animateTransform,
  easeOutCubic
} from './shapes';

export interface SceneConfig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private blocks: BlockMesh[] = [];
  private selectedBlock: BlockMesh | null = null;
  private highlightMesh: THREE.LineSegments | null = null;

  private isNightMode: boolean = false;
  private groundPlane!: THREE.Mesh;
  private dayGroundMaterials: THREE.MeshBasicMaterial[] = [];
  private nightGroundMaterials: THREE.MeshBasicMaterial[] = [];
  private stars: THREE.Points | null = null;

  private dayBgColor1 = new THREE.Color('#f5f0e8');
  private dayBgColor2 = new THREE.Color('#e8e3d8');
  private nightBgColor1 = new THREE.Color('#0b1120');
  private nightBgColor2 = new THREE.Color('#162032');

  private ambientLight!: THREE.AmbientLight;
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;

  private modeTransitionProgress: number = 1;
  private modeTransitionTarget: number = 1;
  private modeTransitionDuration: number = 1.5;
  private isTransitioning: boolean = false;

  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private fps: number = 60;
  private fpsCheckInterval: number = 500;
  private lastFpsCheck: number = performance.now();
  private lowQualityBlocks: Set<string> = new Set();

  constructor(config: SceneConfig) {
    this.scene = config.scene;
    this.camera = config.camera;
    this.renderer = config.renderer;
    this.setupLights();
    this.setupGround();
    this.setupStars();
    this.setupBackground();
  }

  public getGroundPlane(): THREE.Mesh {
    return this.groundPlane;
  }

  public getBlocks(): BlockMesh[] {
    return this.blocks;
  }

  public getSelectedBlock(): BlockMesh | null {
    return this.selectedBlock;
  }

  public addBlock(block: BlockMesh): void {
    this.scene.add(block);
    this.blocks.push(block);
    if (this.isNightMode) {
      switchBlockMaterial(block, true);
    }
    animatePlacement(block);
    this.updateQualityLevels();
  }

  public addBlockAt(shape: ShapeType, color: string, position: THREE.Vector3): BlockMesh {
    const block = createBlock(shape, color, this.isNightMode);
    block.position.copy(position);
    this.scene.add(block);
    this.blocks.push(block);
    animatePlacement(block);
    this.updateQualityLevels();
    return block;
  }

  public removeBlock(block: BlockMesh): void {
    const idx = this.blocks.indexOf(block);
    if (idx === -1) return;
    this.blocks.splice(idx, 1);
    this.lowQualityBlocks.delete(block.userData.blockId);

    if (block.userData.halo) {
      block.userData.halo.parent?.remove(block.userData.halo);
      (block.userData.halo.geometry as THREE.BufferGeometry)?.dispose();
      (block.userData.halo.material as THREE.Material)?.dispose();
    }
    if (block.userData.light) {
      block.remove(block.userData.light);
      block.userData.light.dispose?.();
    }

    this.scene.remove(block);
    (block.geometry as THREE.BufferGeometry).dispose();
    (block.material as THREE.Material).dispose();

    if (this.selectedBlock === block) {
      this.selectBlock(null);
    }
    this.updateQualityLevels();
  }

  public clearAllBlocks(): void {
    const allBlocks = [...this.blocks];
    allBlocks.forEach(b => this.removeBlock(b));
  }

  public selectBlock(block: BlockMesh | null): void {
    if (this.selectedBlock === block) return;
    this.selectedBlock = block;

    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      (this.highlightMesh.geometry as THREE.BufferGeometry).dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }

    if (block) {
      this.highlightMesh = createHighlightEdges();
      this.updateHighlightPosition();
      this.scene.add(this.highlightMesh);
    }
  }

  public rotateSelected(axis: 'x' | 'y' | 'z', radians: number): void {
    if (!this.selectedBlock) return;
    const target = new THREE.Euler().copy(this.selectedBlock.rotation);
    if (axis === 'x') target.x = radians;
    if (axis === 'y') target.y = radians;
    if (axis === 'z') target.z = radians;
    animateTransform(this.selectedBlock, target, this.selectedBlock.scale.clone(), 0.3);
  }

  public scaleSelected(scale: number): void {
    if (!this.selectedBlock) return;
    const targetScale = new THREE.Vector3(scale, scale, scale);
    animateTransform(this.selectedBlock, this.selectedBlock.rotation.clone(), targetScale, 0.3);
  }

  public toggleNightMode(isNight: boolean): void {
    if (this.isNightMode === isNight && !this.isTransitioning) return;
    this.isNightMode = isNight;
    this.modeTransitionTarget = isNight ? 0 : 1;
    this.isTransitioning = true;
    this.blocks.forEach(b => switchBlockMaterial(b, isNight));
  }

  public update(): void {
    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.frameCount++;
    if (now - this.lastFpsCheck >= this.fpsCheckInterval) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsCheck));
      this.frameCount = 0;
      this.lastFpsCheck = now;
      this.handleFpsAdaptation();
    }

    if (this.isTransitioning) {
      this.modeTransitionProgress += delta / this.modeTransitionDuration * (this.modeTransitionTarget < this.modeTransitionProgress ? 1 : -1) > 0
        ? delta / this.modeTransitionDuration
        : -delta / this.modeTransitionDuration;
      this.modeTransitionProgress = Math.max(0, Math.min(1, this.modeTransitionProgress));
      this.updateTransition();
      if (Math.abs(this.modeTransitionProgress - this.modeTransitionTarget) < 0.001) {
        this.modeTransitionProgress = this.modeTransitionTarget;
        this.isTransitioning = false;
        this.updateTransition();
      }
    }

    if (this.highlightMesh && this.selectedBlock) {
      this.updateHighlightPosition();
    }

    this.blocks.forEach(b => updateHaloPosition(b));

    if (this.stars && this.isNightMode) {
      this.stars.rotation.y += delta * 0.01;
    }
  }

  private updateTransition(): void {
    const t = this.modeTransitionProgress;
    const eased = easeOutCubic(t);

    const bgColor1 = new THREE.Color().lerpColors(this.nightBgColor1, this.dayBgColor1, eased);
    const bgColor2 = new THREE.Color().lerpColors(this.nightBgColor2, this.dayBgColor2, eased);
    this.updateBackgroundGradient(bgColor1, bgColor2);

    this.ambientLight.intensity = THREE.MathUtils.lerp(0.2, 0.5, eased);
    this.dirLight.intensity = THREE.MathUtils.lerp(0.1, 0.8, eased);
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.2, 0.6, eased);

    this.updateGroundOpacity(eased);
    this.updateStarsVisibility();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(8, 12, 6);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 50;
    this.dirLight.shadow.camera.left = -20;
    this.dirLight.shadow.camera.right = 20;
    this.dirLight.shadow.camera.top = 20;
    this.dirLight.shadow.camera.bottom = -20;
    this.scene.add(this.dirLight);

    this.hemiLight = new THREE.HemisphereLight(0xf5f0e8, 0xc4bfb4, 0.6);
    this.scene.add(this.hemiLight);
  }

  private setupGround(): void {
    const size = 30;
    const gridSize = 1;
    const geometry = new THREE.PlaneGeometry(size, size, size / gridSize, size / gridSize);
    const colors: number[] = [];
    const dayColor1 = new THREE.Color('#d4cfc4');
    const dayColor2 = new THREE.Color('#c4bfb4');
    const nightColor1 = new THREE.Color('#2a2d3e');
    const nightColor2 = new THREE.Color('#1e2132');

    const positionAttr = geometry.getAttribute('position');
    for (let i = 0; i < positionAttr.count; i++) {
      const x = positionAttr.getX(i);
      const y = positionAttr.getY(i);
      const gx = Math.floor((x + size / 2) / gridSize);
      const gy = Math.floor((y + size / 2) / gridSize);
      const isEven = (gx + gy) % 2 === 0;
      const day = isEven ? dayColor1 : dayColor2;
      const night = isEven ? nightColor1 : nightColor2;
      colors.push(day.r, day.g, day.b);
      const dayMat = new THREE.MeshBasicMaterial({ color: day, transparent: true, opacity: 0.6 });
      const nightMat = new THREE.MeshBasicMaterial({ color: night, transparent: true, opacity: 0.6 });
      this.dayGroundMaterials.push(dayMat);
      this.nightGroundMaterials.push(nightMat);
    }

    const groundGeometry = new THREE.PlaneGeometry(size, size, size / gridSize, size / gridSize);
    const groundColor: number[] = [];
    const colorAttr = new Float32Array(groundGeometry.getAttribute('position').count * 3);
    for (let i = 0; i < groundGeometry.getAttribute('position').count; i++) {
      const x = groundGeometry.getAttribute('position').getX(i);
      const y = groundGeometry.getAttribute('position').getY(i);
      const gx = Math.floor((x + size / 2) / gridSize);
      const gy = Math.floor((y + size / 2) / gridSize);
      const isEven = (gx + gy) % 2 === 0;
      const col = isEven ? dayColor1 : dayColor2;
      colorAttr[i * 3] = col.r;
      colorAttr[i * 3 + 1] = col.g;
      colorAttr[i * 3 + 2] = col.b;
    }
    groundGeometry.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));

    const groundMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      roughness: 0.9,
      metalness: 0
    });

    this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    const gridHelper = new THREE.GridHelper(size, size / gridSize, 0xaaa59a, 0xc4bfb4);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    gridHelper.position.y = 0.001;
    this.scene.add(gridHelper);
  }

  private setupStars(): void {
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 80 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) + 10;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const brightness = 0.7 + Math.random() * 0.3;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * 0.95;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  private setupBackground(): void {
    this.renderer.setClearColor(this.dayBgColor1, 1);
  }

  private updateBackgroundGradient(c1: THREE.Color, c2: THREE.Color): void {
    this.renderer.setClearColor(c1, 1);
    this.scene.background = c1;
  }

  private updateGroundOpacity(eased: number): void {
    const mat = this.groundPlane.material as THREE.MeshStandardMaterial;
    mat.opacity = THREE.MathUtils.lerp(0.6, 0.6, eased);
  }

  private updateStarsVisibility(): void {
    if (!this.stars) return;
    const mat = this.stars.material as THREE.PointsMaterial;
    const targetOpacity = this.isNightMode ? 1 : 0;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.03);
  }

  private updateHighlightPosition(): void {
    if (!this.highlightMesh || !this.selectedBlock) return;
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    this.selectedBlock.updateMatrixWorld(true);
    this.selectedBlock.matrixWorld.decompose(worldPos, worldQuat, worldScale);
    this.highlightMesh.position.copy(worldPos);
    this.highlightMesh.quaternion.copy(worldQuat);
    this.highlightMesh.scale.copy(worldScale).multiplyScalar(1.05);
  }

  private updateQualityLevels(): void {
    if (this.blocks.length <= 50) {
      this.blocks.forEach(b => {
        if (this.lowQualityBlocks.has(b.userData.blockId)) {
          setBlockLowQuality(b, false);
          this.lowQualityBlocks.delete(b.userData.blockId);
        }
      });
      return;
    }

    const sorted = [...this.blocks].sort((a, b) => {
      const da = a.position.distanceTo(this.camera.position);
      const db = b.position.distanceTo(this.camera.position);
      return db - da;
    });

    const reduceCount = sorted.length - 50;
    this.lowQualityBlocks.clear();
    for (let i = 0; i < reduceCount; i++) {
      const b = sorted[i];
      setBlockLowQuality(b, true);
      this.lowQualityBlocks.add(b.userData.blockId);
    }
    for (let i = reduceCount; i < sorted.length; i++) {
      setBlockLowQuality(sorted[i], false);
    }
  }

  private handleFpsAdaptation(): void {
    const mat = this.groundPlane.material as THREE.MeshStandardMaterial;
    if (this.fps < 55 && mat.opacity > 0.3) {
      mat.opacity = Math.max(0.3, mat.opacity - 0.05);
    } else if (this.fps >= 58 && mat.opacity < 0.6 && !this.isTransitioning) {
      mat.opacity = Math.min(0.6, mat.opacity + 0.02);
    }
  }
}
