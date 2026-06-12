import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BlockData, BlockPosition, BlockSize, UNIT_SIZE } from './types';

interface AnimationState {
  targetPos: THREE.Vector3;
  targetScale: THREE.Vector3;
  targetRotY: number;
  startPos: THREE.Vector3;
  startScale: THREE.Vector3;
  startRotY: number;
  progress: number;
  duration: number;
  type: 'place' | 'remove' | 'tween';
}

interface BlockMesh extends THREE.Group {
  userData: {
    blockId: string;
    animation?: AnimationState;
    bricks: THREE.Mesh[];
  };
}

export class ThreeScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private ground: THREE.Mesh;
  private blocks: Map<string, BlockMesh> = new Map();
  private selectedBlockId: string | null = null;
  private selectionBox: THREE.Mesh | null = null;
  private ghostBlock: THREE.Group | null = null;
  private container: HTMLElement;
  private isPlacingMode: boolean = false;
  private placingSize: BlockSize = { x: 2, y: 1, z: 2 };
  private placingColor: string = '#e53935';
  private onBlockClick?: (id: string | null, event: MouseEvent) => void;
  private onGroundClick?: (position: BlockPosition) => void;
  private onBlockPlace?: (position: BlockPosition) => void;
  private animationFrameId: number = 0;
  private animatingBlocks: Set<string> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe0e0e0);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 12, 15);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();
    this.setupGround();
    this.setupEvents();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfff5e6, 0x8d8d8d, 0.4);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.bias = -0.0001;
    dirLight.shadow.radius = 4;
    this.scene.add(dirLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0,
      roughness: 0.9,
      metalness: 0,
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const gridHelper = new THREE.GridHelper(40, 40, 0xaaaaaa, 0xcccccc);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('click', this.onClick);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
  }

  private onResize = (): void => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private onClick = (event: MouseEvent): void => {
    if (this.isPlacingMode) {
      const hitPoint = this.getHitPoint(event);
      if (hitPoint) {
        const snappedPos = this.snapToGrid(hitPoint, this.placingSize);
        if (this.onBlockPlace) {
          this.onBlockPlace(snappedPos);
        }
      }
      return;
    }

    const blockId = this.getClickedBlockId(event);
    if (this.onBlockClick) {
      this.onBlockClick(blockId, event);
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    this.updateMouse(event);

    if (this.isPlacingMode) {
      this.updateGhostBlock(event);
      this.updateCursorStyle();
    }
  };

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getHitPoint(event: MouseEvent): THREE.Vector3 | null {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const blockMeshes: THREE.Mesh[] = [];
    this.blocks.forEach((block) => {
      block.userData.bricks.forEach((brick) => {
        blockMeshes.push(brick);
      });
    });

    const targets = [this.ground, ...blockMeshes];
    const intersects = this.raycaster.intersectObjects(targets, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.object === this.ground || hit.object.type === 'Mesh') {
        const point = hit.point.clone();
        if (hit.face) {
          const normal = hit.face.normal.clone();
          if (hit.object !== this.ground) {
            normal.transformDirection(hit.object.matrixWorld);
          }
          point.add(normal.multiplyScalar(0.01));
        }
        return point;
      }
    }
    return null;
  }

  private getClickedBlockId(event: MouseEvent): string | null {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes: THREE.Object3D[] = [];
    this.blocks.forEach((block) => {
      block.userData.bricks.forEach((brick) => {
        meshes.push(brick);
      });
    });

    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData?.blockId) {
        obj = obj.parent;
      }
      if (obj && obj.userData?.blockId) {
        return obj.userData.blockId;
      }
    }
    return null;
  }

  private snapToGrid(point: THREE.Vector3, size: BlockSize): BlockPosition {
    const halfX = (size.x * UNIT_SIZE) / 2;
    const halfZ = (size.z * UNIT_SIZE) / 2;

    let x = Math.round(point.x / UNIT_SIZE) * UNIT_SIZE;
    let z = Math.round(point.z / UNIT_SIZE) * UNIT_SIZE;
    let y = Math.round(point.y / UNIT_SIZE) * UNIT_SIZE;

    if (size.x % 2 === 0) {
      x = Math.round((point.x - halfX) / UNIT_SIZE) * UNIT_SIZE + halfX;
    }
    if (size.z % 2 === 0) {
      z = Math.round((point.z - halfZ) / UNIT_SIZE) * UNIT_SIZE + halfZ;
    }

    if (y < 0) y = 0;

    return { x, y, z };
  }

  private createLegoMesh(size: BlockSize, color: string, isGhost: boolean = false): THREE.Group {
    const group = new THREE.Group() as BlockMesh;
    const bricks: THREE.Mesh[] = [];

    const brickHeight = 1;
    const studHeight = 0.2;
    const studRadius = 0.25;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.3,
      metalness: 0.1,
      transparent: isGhost,
      opacity: isGhost ? 0.5 : 1,
    });

    const brickGeo = new THREE.BoxGeometry(size.x * UNIT_SIZE, brickHeight, size.z * UNIT_SIZE);
    const brick = new THREE.Mesh(brickGeo, material);
    brick.position.y = brickHeight / 2;
    brick.castShadow = !isGhost;
    brick.receiveShadow = !isGhost;
    group.add(brick);
    bricks.push(brick);

    for (let i = 0; i < size.x; i++) {
      for (let j = 0; j < size.z; j++) {
        const studGeo = new THREE.CylinderGeometry(studRadius, studRadius, studHeight, 16);
        const stud = new THREE.Mesh(studGeo, material);
        stud.position.set(
          -size.x * UNIT_SIZE / 2 + 0.5 + i * UNIT_SIZE,
          brickHeight + studHeight / 2,
          -size.z * UNIT_SIZE / 2 + 0.5 + j * UNIT_SIZE
        );
        stud.castShadow = !isGhost;
        stud.receiveShadow = !isGhost;
        group.add(stud);
        bricks.push(stud);
      }
    }

    group.userData = { blockId: '', bricks, isGhost };

    return group;
  }

  private updateGhostBlock(event: MouseEvent): void {
    if (!this.isPlacingMode) {
      if (this.ghostBlock) {
        this.scene.remove(this.ghostBlock);
        this.ghostBlock = null;
      }
      return;
    }

    if (!this.ghostBlock) {
      this.ghostBlock = this.createLegoMesh(this.placingSize, this.placingColor, true);
      this.scene.add(this.ghostBlock);
    }

    const hitPoint = this.getHitPoint(event);
    if (hitPoint) {
      const snappedPos = this.snapToGrid(hitPoint, this.placingSize);
      this.ghostBlock.position.set(snappedPos.x, snappedPos.y, snappedPos.z);
      this.ghostBlock.visible = true;
    } else {
      this.ghostBlock.visible = false;
    }
  }

  private updateCursorStyle(): void {
    const canvas = this.renderer.domElement;
    if (this.isPlacingMode) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = 'default';
    }
  }

  public addBlock(blockData: BlockData, animate: boolean = true): void {
    if (this.blocks.has(blockData.id)) {
      return;
    }

    const group = this.createLegoMesh(blockData.size, blockData.color) as BlockMesh;
    group.userData.blockId = blockData.id;
    group.rotation.y = (blockData.rotation * Math.PI) / 180;

    if (animate) {
      group.position.set(blockData.position.x, blockData.position.y + 5, blockData.position.z);
      group.scale.set(0.8, 0.8, 0.8);
      group.userData.animation = {
        targetPos: new THREE.Vector3(blockData.position.x, blockData.position.y, blockData.position.z),
        targetScale: new THREE.Vector3(1, 1, 1),
        targetRotY: (blockData.rotation * Math.PI) / 180,
        startPos: new THREE.Vector3(blockData.position.x, blockData.position.y + 5, blockData.position.z),
        startScale: new THREE.Vector3(0.8, 0.8, 0.8),
        startRotY: (blockData.rotation * Math.PI) / 180,
        progress: 0,
        duration: 0.3,
        type: 'place',
      };
      this.animatingBlocks.add(blockData.id);
    } else {
      group.position.set(blockData.position.x, blockData.position.y, blockData.position.z);
    }

    this.scene.add(group);
    this.blocks.set(blockData.id, group);
  }

  public removeBlock(blockId: string, animate: boolean = true): BlockData | null {
    const block = this.blocks.get(blockId);
    if (!block) return null;

    const blockData = this.getBlockData(blockId);

    if (animate) {
      block.userData.animation = {
        targetPos: new THREE.Vector3(block.position.x, block.position.y + 3, block.position.z),
        targetScale: new THREE.Vector3(0.1, 0.1, 0.1),
        targetRotY: block.rotation.y,
        startPos: block.position.clone(),
        startScale: block.scale.clone(),
        startRotY: block.rotation.y,
        progress: 0,
        duration: 0.4,
        type: 'remove',
      };
      this.animatingBlocks.add(blockId);

      setTimeout(() => {
        this.cleanupBlock(blockId);
      }, 400);
    } else {
      this.cleanupBlock(blockId);
    }

    return blockData;
  }

  private cleanupBlock(blockId: string): void {
    const block = this.blocks.get(blockId);
    if (block) {
      this.scene.remove(block);
      block.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.blocks.delete(blockId);
      this.animatingBlocks.delete(blockId);
    }
  }

  public moveBlock(blockId: string, position: BlockPosition, animate: boolean = true): void {
    const block = this.blocks.get(blockId);
    if (!block) return;

    if (animate) {
      block.userData.animation = {
        targetPos: new THREE.Vector3(position.x, position.y, position.z),
        targetScale: block.scale.clone(),
        targetRotY: block.rotation.y,
        startPos: block.position.clone(),
        startScale: block.scale.clone(),
        startRotY: block.rotation.y,
        progress: 0,
        duration: 0.2,
        type: 'tween',
      };
      this.animatingBlocks.add(blockId);
    } else {
      block.position.set(position.x, position.y, position.z);
    }
  }

  public changeBlockColor(blockId: string, color: string, animate: boolean = true): void {
    const block = this.blocks.get(blockId);
    if (!block) return;

    const targetColor = new THREE.Color(color);

    block.userData.bricks.forEach((brick) => {
      const mat = brick.material as THREE.MeshStandardMaterial;
      if (animate) {
        const startColor = mat.color.clone();
        const startTime = performance.now();
        const duration = 200;

        const animateColor = () => {
          const elapsed = performance.now() - startTime;
          const t = Math.min(elapsed / duration, 1);
          mat.color.lerpColors(startColor, targetColor, t);
          if (t < 1) {
            requestAnimationFrame(animateColor);
          }
        };
        animateColor();
      } else {
        mat.color.copy(targetColor);
      }
    });
  }

  public rotateBlock(blockId: string, rotation: number, animate: boolean = true): void {
    const block = this.blocks.get(blockId);
    if (!block) return;

    const targetRotY = (rotation * Math.PI) / 180;

    if (animate) {
      block.userData.animation = {
        targetPos: block.position.clone(),
        targetScale: block.scale.clone(),
        targetRotY,
        startPos: block.position.clone(),
        startScale: block.scale.clone(),
        startRotY: block.rotation.y,
        progress: 0,
        duration: 0.2,
        type: 'tween',
      };
      this.animatingBlocks.add(blockId);
    } else {
      block.rotation.y = targetRotY;
    }
  }

  public selectBlock(blockId: string | null): void {
    this.selectedBlockId = blockId;

    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox.geometry.dispose();
      (this.selectionBox.material as THREE.Material).dispose();
      this.selectionBox = null;
    }

    if (blockId) {
      const block = this.blocks.get(blockId);
      if (block) {
        const box = new THREE.Box3().setFromObject(block);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const boxGeo = new THREE.BoxGeometry(size.x * 1.05, size.y * 1.05, size.z * 1.05);
        const boxMat = new THREE.MeshBasicMaterial({
          color: 0xffff00,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        this.selectionBox = new THREE.Mesh(boxGeo, boxMat);
        this.selectionBox.position.copy(center);
        this.scene.add(this.selectionBox);
      }
    }
  }

  public getSelectedBlockId(): string | null {
    return this.selectedBlockId;
  }

  public setPlacingMode(enabled: boolean, size?: BlockSize, color?: string): void {
    this.isPlacingMode = enabled;

    if (size) {
      this.placingSize = size;
    }
    if (color) {
      this.placingColor = color;
    }

    if (!enabled) {
      if (this.ghostBlock) {
        this.scene.remove(this.ghostBlock);
        this.ghostBlock = null;
      }
    }

    this.updateCursorStyle();
    this.controls.enabled = !enabled;
  }

  public setOnBlockClick(callback: (id: string | null, event: MouseEvent) => void): void {
    this.onBlockClick = callback;
  }

  public setOnBlockPlace(callback: (position: BlockPosition) => void): void {
    this.onBlockPlace = callback;
  }

  public getBlockData(blockId: string): BlockData | null {
    const block = this.blocks.get(blockId);
    if (!block) return null;

    const size = this.getBlockSize(block);

    return {
      id: blockId,
      position: {
        x: block.position.x,
        y: block.position.y,
        z: block.position.z,
      },
      size,
      color: this.getBlockColor(block),
      rotation: Math.round((block.rotation.y * 180) / Math.PI),
    };
  }

  private getBlockSize(block: BlockMesh): BlockSize {
    const brick = block.userData.bricks[0];
    if (!brick) return { x: 1, y: 1, z: 1 };

    const geo = brick.geometry as THREE.BoxGeometry;
    return {
      x: geo.parameters.width,
      y: geo.parameters.height,
      z: geo.parameters.depth,
    };
  }

  private getBlockColor(block: BlockMesh): string {
    const brick = block.userData.bricks[0];
    if (!brick) return '#ffffff';

    const mat = brick.material as THREE.MeshStandardMaterial;
    return `#${mat.color.getHexString()}`;
  }

  public getAllBlocks(): BlockData[] {
    const blocks: BlockData[] = [];
    this.blocks.forEach((_, id) => {
      const data = this.getBlockData(id);
      if (data) blocks.push(data);
    });
    return blocks;
  }

  public clearAll(): void {
    const ids = Array.from(this.blocks.keys());
    ids.forEach((id) => this.cleanupBlock(id));
    this.selectBlock(null);
  }

  public loadBlocks(blocks: BlockData[]): void {
    this.clearAll();
    blocks.forEach((block) => this.addBlock(block, false));
  }

  private easeOutElastic(t: number): number {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }

  private easeInBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  }

  private updateAnimation(blockId: string, delta: number): void {
    const block = this.blocks.get(blockId);
    if (!block || !block.userData.animation) return;

    const anim = block.userData.animation;
    anim.progress += delta / anim.duration;

    if (anim.progress >= 1) {
      block.position.copy(anim.targetPos);
      block.scale.copy(anim.targetScale);
      block.rotation.y = anim.targetRotY;
      block.userData.animation = undefined;
      this.animatingBlocks.delete(blockId);
      return;
    }

    let t = anim.progress;

    if (anim.type === 'place') {
      t = this.easeOutElastic(t);
    } else if (anim.type === 'remove') {
      t = this.easeInBack(t);
    } else {
      t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    block.position.lerpVectors(anim.startPos, anim.targetPos, t);
    block.scale.lerpVectors(anim.startScale, anim.targetScale, t);
    block.rotation.y = anim.startRotY + (anim.targetRotY - anim.startRotY) * t;
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    this.animatingBlocks.forEach((id) => {
      this.updateAnimation(id, 1 / 60);
    });

    if (this.selectionBox && this.selectedBlockId) {
      const block = this.blocks.get(this.selectedBlockId);
      if (block) {
        const box = new THREE.Box3().setFromObject(block);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        this.selectionBox.position.copy(center);
        (this.selectionBox.geometry as THREE.BoxGeometry).dispose();
        this.selectionBox.geometry = new THREE.BoxGeometry(size.x * 1.05, size.y * 1.05, size.z * 1.05);
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('click', this.onClick);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);

    this.blocks.forEach((_, id) => this.cleanupBlock(id));

    this.controls.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
