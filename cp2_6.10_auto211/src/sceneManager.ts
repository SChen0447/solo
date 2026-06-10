import * as THREE from 'three';
import { debounce } from 'lodash';
import {
  PlantParams,
  PlantMeshData,
  generatePlantMesh,
  generatePartialMesh,
  generateBranches,
  BranchSegment
} from './plantGen';

export type GrowthState = 'idle' | 'growing' | 'paused';

export interface SceneStats {
  fps: number;
  branchCount: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private plantMesh: THREE.Mesh | null = null;
  private plantMaterial: THREE.MeshStandardMaterial;
  private groundMesh: THREE.Mesh | null = null;

  private currentParams: PlantParams;
  private fullSegments: BranchSegment[][] = [];

  private animationId: number | null = null;
  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 60;

  private growthState: GrowthState = 'idle';
  private currentGrowthDepth: number = 0;
  private growthTimer: number | null = null;
  private growthTargetDepth: number = 0;

  private onStatsChange?: (stats: SceneStats) => void;

  constructor(container: HTMLElement, initialParams: PlantParams) {
    this.container = container;
    this.currentParams = { ...initialParams };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1b2838);
    this.scene.fog = new THREE.Fog(0x1b2838, 15, 40);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(8, 6, 10);
    this.camera.lookAt(0, 3, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.plantMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b8e4e,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: false
    });

    this.setupLights();
    this.setupGround();
    this.buildPlant(this.currentParams);
    this.setupResize();
    this.startAnimationLoop();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x4a5568, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1.0);
    directional.position.set(10, 15, 8);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 50;
    directional.shadow.camera.left = -15;
    directional.shadow.camera.right = 15;
    directional.shadow.camera.top = 15;
    directional.shadow.camera.bottom = -15;
    this.scene.add(directional);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-8, 5, -5);
    this.scene.add(fillLight);
  }

  private setupGround(): void {
    const groundGeo = new THREE.CircleGeometry(15, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      roughness: 0.95,
      metalness: 0.0
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.01;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
  }

  private buildPlant(params: PlantParams): void {
    const meshData = generatePlantMesh(params);
    this.fullSegments = meshData.segmentsByDepth;
    this.createMeshFromData(meshData);
    this.updateBranchCount(meshData.branchCount);
    this.currentGrowthDepth = params.branchDepth;
  }

  private buildPlantPartial(params: PlantParams, maxDepth: number): void {
    const meshData = generatePartialMesh(params, maxDepth);
    this.createMeshFromData(meshData);
    this.updateBranchCount(meshData.branchCount);
  }

  private createMeshFromData(meshData: PlantMeshData): void {
    if (this.plantMesh) {
      this.scene.remove(this.plantMesh);
      this.plantMesh.geometry.dispose();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    geometry.computeVertexNormals();

    this.plantMesh = new THREE.Mesh(geometry, this.plantMaterial);
    this.plantMesh.castShadow = true;
    this.plantMesh.receiveShadow = true;
    this.scene.add(this.plantMesh);

    this.animatePlantAppear();
  }

  private animatePlantAppear(): void {
    if (!this.plantMesh) return;
    this.plantMesh.scale.set(0.01, 0.01, 0.01);
    this.plantMaterial.transparent = true;
    this.plantMaterial.opacity = 0;

    const startTime = performance.now();
    const duration = 300;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      if (this.plantMesh) {
        const scale = easeOut;
        this.plantMesh.scale.set(scale, scale, scale);
        this.plantMaterial.opacity = easeOut;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.plantMaterial.transparent = false;
        this.plantMaterial.opacity = 1;
      }
    };

    requestAnimationFrame(animate);
  }

  private debouncedUpdate = debounce((params: PlantParams) => {
    if (this.growthState === 'growing') {
      this.stopGrowthAnimation();
    }
    this.currentParams = { ...params };
    this.buildPlant(params);
  }, 150, { leading: false, trailing: true });

  public updateParams(params: PlantParams): void {
    this.currentParams = { ...params };
    this.debouncedUpdate(params);
  }

  public getParams(): PlantParams {
    return { ...this.currentParams };
  }

  public startGrowthAnimation(): void {
    if (this.growthState === 'growing') return;

    this.stopGrowthAnimation();
    this.resetPlant();
    this.growthState = 'growing';
    this.growthTargetDepth = this.currentParams.branchDepth;
    this.currentGrowthDepth = -1;
    this.fullSegments = generateBranches(this.currentParams);

    const growNext = () => {
      this.currentGrowthDepth++;

      if (this.currentGrowthDepth <= this.growthTargetDepth) {
        this.buildPlantPartial(this.currentParams, this.currentGrowthDepth);
        this.growthTimer = window.setTimeout(growNext, 200);
      } else {
        this.growthState = 'idle';
        this.growthTimer = null;
      }
    };

    growNext();
  }

  public pauseGrowthAnimation(): void {
    if (this.growthState === 'growing' && this.growthTimer !== null) {
      clearTimeout(this.growthTimer);
      this.growthTimer = null;
      this.growthState = 'paused';
    }
  }

  public resumeGrowthAnimation(): void {
    if (this.growthState !== 'paused') return;

    this.growthState = 'growing';
    const growNext = () => {
      this.currentGrowthDepth++;

      if (this.currentGrowthDepth <= this.growthTargetDepth) {
        this.buildPlantPartial(this.currentParams, this.currentGrowthDepth);
        this.growthTimer = window.setTimeout(growNext, 200);
      } else {
        this.growthState = 'idle';
        this.growthTimer = null;
      }
    };

    this.growthTimer = window.setTimeout(growNext, 200);
  }

  public stopGrowthAnimation(): void {
    if (this.growthTimer !== null) {
      clearTimeout(this.growthTimer);
      this.growthTimer = null;
    }
    this.growthState = 'idle';
  }

  public getGrowthState(): GrowthState {
    return this.growthState;
  }

  public resetPlant(): void {
    this.stopGrowthAnimation();
    this.currentGrowthDepth = 0;
    this.buildPlant(this.currentParams);
  }

  public exportOBJ(): string {
    if (!this.plantMesh) return '';

    const geometry = this.plantMesh.geometry;
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
    const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
    const index = geometry.getIndex();

    let obj = '# Fractal Plant OBJ Export\n';
    obj += `# Generated by Fractal Plant Generator\n`;
    obj += `# Vertices: ${positions.count}\n`;
    obj += `# Faces: ${index ? index.count / 3 : positions.count / 3}\n\n`;

    for (let i = 0; i < positions.count; i++) {
      obj += `v ${positions.getX(i).toFixed(6)} ${positions.getY(i).toFixed(6)} ${positions.getZ(i).toFixed(6)}\n`;
    }

    obj += '\n';

    if (normals) {
      for (let i = 0; i < normals.count; i++) {
        obj += `vn ${normals.getX(i).toFixed(6)} ${normals.getY(i).toFixed(6)} ${normals.getZ(i).toFixed(6)}\n`;
      }
      obj += '\n';
    }

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i) + 1;
        const b = index.getX(i + 1) + 1;
        const c = index.getX(i + 2) + 1;
        if (normals) {
          obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
        } else {
          obj += `f ${a} ${b} ${c}\n`;
        }
      }
    } else {
      for (let i = 0; i < positions.count; i += 3) {
        const a = i + 1;
        const b = i + 2;
        const c = i + 3;
        if (normals) {
          obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
        } else {
          obj += `f ${a} ${b} ${c}\n`;
        }
      }
    }

    return obj;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public setOnStatsChange(callback: (stats: SceneStats) => void): void {
    this.onStatsChange = callback;
  }

  private updateBranchCount(count: number): void {
    if (this.onStatsChange) {
      this.onStatsChange({ fps: this.currentFps, branchCount: count });
    }
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const now = performance.now();
      this.frameCount++;

      if (now - this.fpsUpdateTime >= 500) {
        this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
        this.frameCount = 0;
        this.fpsUpdateTime = now;

        if (this.onStatsChange && this.plantMesh) {
          const geo = this.plantMesh.geometry;
          const pos = geo.getAttribute('position');
          const branchEstimate = pos ? Math.floor(pos.count / 18) : 0;
          this.onStatsChange({ fps: this.currentFps, branchCount: branchEstimate });
        }
      }

      this.lastFrameTime = now;
      this.renderer.render(this.scene, this.camera);
    };

    this.fpsUpdateTime = performance.now();
    animate();
  }

  public dispose(): void {
    this.stopGrowthAnimation();

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.plantMesh) {
      this.plantMesh.geometry.dispose();
    }
    this.plantMaterial.dispose();

    if (this.groundMesh) {
      this.groundMesh.geometry.dispose();
      (this.groundMesh.material as THREE.Material).dispose();
    }

    this.renderer.dispose();
  }
}
