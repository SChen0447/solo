import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Atom,
  StructureType,
  POLY_PALETTE,
  COLORS
} from './types';

interface AtomMeshData {
  mesh: THREE.Mesh;
  originalScale: number;
  atom: Atom;
}

export class CrystalScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private atomGroup: THREE.Group;
  private latticeGroup: THREE.Group;
  private crystalPlane: THREE.Mesh | null = null;

  private atoms: Atom[] = [];
  private atomMeshData: AtomMeshData[] = [];
  private structureType: StructureType = 'FCC';
  private atomRadiusScale = 1.0;
  private latticeOpacity = 0.7;
  private rotationSpeed = 0;
  private showCrystalPlane = false;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredAtom: AtomMeshData | null = null;

  private animationFrameId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;
  private fpsTime = 0;
  private currentFps = 60;

  private latticeSize = 4;
  private baseAtomGeometry: THREE.SphereGeometry;
  private initialCameraPosition: THREE.Vector3;
  private initialCameraTarget: THREE.Vector3;

  private onFpsUpdate: ((fps: number) => void) | null = null;
  private onAtomHover: ((atom: Atom | null, screenX: number, screenY: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.atomGroup = new THREE.Group();
    this.latticeGroup = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.baseAtomGeometry = new THREE.SphereGeometry(1, 32, 32);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.initialCameraPosition = new THREE.Vector3(8, 6, 10);
    this.initialCameraTarget = new THREE.Vector3(0, 0, 0);
    this.camera.position.copy(this.initialCameraPosition);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.target.copy(this.initialCameraTarget);

    this.setupLights();
    this.scene.add(this.atomGroup);
    this.scene.add(this.latticeGroup);
    this.buildFCCStructure();
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 7);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -3, -5);
    this.scene.add(directionalLight2);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseleave', this.onMouseLeave);
  }

  private onWindowResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onMouseMove = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.checkHover(event.clientX, event.clientY);
  };

  private onMouseLeave = (): void => {
    this.clearHover();
  };

  private checkHover(screenX: number, screenY: number): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.atomMeshData.map(d => d.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const data = this.atomMeshData.find(d => d.mesh === hitMesh);
      if (data && data !== this.hoveredAtom) {
        this.clearHover();
        this.hoveredAtom = data;
        data.mesh.scale.setScalar(data.originalScale * 1.2);
        if (this.onAtomHover) {
          this.onAtomHover(data.atom, screenX, screenY);
        }
      } else if (data === this.hoveredAtom && this.onAtomHover) {
        this.onAtomHover(data.atom, screenX, screenY);
      }
    } else {
      this.clearHover();
    }
  }

  private clearHover(): void {
    if (this.hoveredAtom) {
      this.hoveredAtom.mesh.scale.setScalar(this.hoveredAtom.originalScale);
      this.hoveredAtom = null;
      if (this.onAtomHover) {
        this.onAtomHover(null, 0, 0);
      }
    }
  }

  private clearAtoms(): void {
    this.atomMeshData.forEach(data => {
      this.atomGroup.remove(data.mesh);
      (data.mesh.material as THREE.Material).dispose();
    });
    this.atomMeshData = [];
    this.atoms = [];
  }

  private clearLattice(): void {
    while (this.latticeGroup.children.length > 0) {
      const child = this.latticeGroup.children[0];
      this.latticeGroup.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }

  private createAtomMaterial(color: string): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.3,
      metalness: 0.1
    });
  }

  private addAtom(atom: Atom): void {
    const material = this.createAtomMaterial(atom.color);
    const mesh = new THREE.Mesh(this.baseAtomGeometry, material);
    const scale = atom.radius * this.atomRadiusScale;
    mesh.position.set(atom.position.x, atom.position.y, atom.position.z);
    mesh.scale.setScalar(scale);
    this.atomGroup.add(mesh);
    this.atomMeshData.push({
      mesh,
      originalScale: scale,
      atom
    });
    this.atoms.push(atom);
  }

  private buildLatticeFrame(): void {
    this.clearLattice();
    const s = this.latticeSize;
    const half = s / 2;
    const corners = [
      new THREE.Vector3(-half, -half, -half),
      new THREE.Vector3(half, -half, -half),
      new THREE.Vector3(half, half, -half),
      new THREE.Vector3(-half, half, -half),
      new THREE.Vector3(-half, -half, half),
      new THREE.Vector3(half, -half, half),
      new THREE.Vector3(half, half, half),
      new THREE.Vector3(-half, half, half)
    ];

    const edges: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    const material = new THREE.LineBasicMaterial({
      color: 0xc0c0c0,
      transparent: true,
      opacity: this.latticeOpacity
    });

    edges.forEach(([i, j]) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        corners[i],
        corners[j]
      ]);
      const line = new THREE.Line(geometry, material.clone());
      this.latticeGroup.add(line);
    });
  }

  private buildCrystalPlane(): void {
    if (this.crystalPlane) {
      this.atomGroup.remove(this.crystalPlane);
      this.crystalPlane.geometry.dispose();
      (this.crystalPlane.material as THREE.Material).dispose();
      this.crystalPlane = null;
    }

    if (!this.showCrystalPlane) return;

    const s = this.latticeSize * 1.5;
    const geometry = new THREE.PlaneGeometry(s, s);
    const material = new THREE.MeshBasicMaterial({
      color: 0xb496ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    this.crystalPlane = new THREE.Mesh(geometry, material);

    const normal = new THREE.Vector3(1, 1, 1).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    this.crystalPlane.quaternion.copy(quaternion);

    this.atomGroup.add(this.crystalPlane);
  }

  private buildFCCStructure(): void {
    this.clearAtoms();
    this.structureType = 'FCC';
    const s = this.latticeSize;
    const half = s / 2;

    const cornerPositions = [
      [-half, -half, -half], [half, -half, -half],
      [-half, half, -half], [half, half, -half],
      [-half, -half, half], [half, -half, half],
      [-half, half, half], [half, half, half]
    ];

    cornerPositions.forEach(([x, y, z]) => {
      this.addAtom({
        position: { x, y, z },
        radius: 0.3,
        color: COLORS.FCC_CORNER,
        type: 'corner'
      });
    });

    const facePositions = [
      [0, 0, -half], [0, 0, half],
      [-half, 0, 0], [half, 0, 0],
      [0, -half, 0], [0, half, 0]
    ];

    facePositions.forEach(([x, y, z]) => {
      this.addAtom({
        position: { x, y, z },
        radius: 0.5,
        color: COLORS.FCC_FACE,
        type: 'face'
      });
    });

    this.buildLatticeFrame();
    this.buildCrystalPlane();
  }

  private buildBCCStructure(): void {
    this.clearAtoms();
    this.structureType = 'BCC';
    const s = this.latticeSize;
    const half = s / 2;

    const cornerPositions = [
      [-half, -half, -half], [half, -half, -half],
      [-half, half, -half], [half, half, -half],
      [-half, -half, half], [half, -half, half],
      [-half, half, half], [half, half, half]
    ];

    cornerPositions.forEach(([x, y, z]) => {
      this.addAtom({
        position: { x, y, z },
        radius: 0.3,
        color: COLORS.BCC_CORNER,
        type: 'corner'
      });
    });

    this.addAtom({
      position: { x: 0, y: 0, z: 0 },
      radius: 0.5,
      color: COLORS.BCC_BODY,
      type: 'body'
    });

    this.buildLatticeFrame();
    this.buildCrystalPlane();
  }

  private buildPolyCrystalStructure(): void {
    this.clearAtoms();
    this.structureType = 'POLY';
    const gridSize = 3;
    const cellSize = this.latticeSize / gridSize;
    const offset = -this.latticeSize / 2 + cellSize / 2;

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gy = 0; gy < gridSize; gy++) {
        for (let gz = 0; gz < gridSize; gz++) {
          const grainCenterX = offset + gx * cellSize;
          const grainCenterY = offset + gy * cellSize;
          const grainCenterZ = offset + gz * cellSize;

          const numAtoms = 8 + Math.floor(Math.random() * 7);
          const usedPositions: string[] = [];

          for (let i = 0; i < numAtoms; i++) {
            let x: number, y: number, z: number;
            let key: string;
            let attempts = 0;
            do {
              const rx = (Math.random() - 0.5) * cellSize * 0.85;
              const ry = (Math.random() - 0.5) * cellSize * 0.85;
              const rz = (Math.random() - 0.5) * cellSize * 0.85;
              x = grainCenterX + rx;
              y = grainCenterY + ry;
              z = grainCenterZ + rz;
              key = `${x.toFixed(1)},${y.toFixed(1)},${z.toFixed(1)}`;
              attempts++;
            } while (usedPositions.includes(key) && attempts < 20);

            usedPositions.push(key);
            const color = POLY_PALETTE[Math.floor(Math.random() * POLY_PALETTE.length)];

            this.addAtom({
              position: { x, y, z },
              radius: 0.2 + Math.random() * 0.2,
              color,
              type: 'random'
            });
          }
        }
      }
    }

    this.buildLatticeFrame();
    this.buildCrystalPlane();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.frameCount++;
    this.fpsTime += delta;
    if (this.fpsTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.currentFps);
      }
    }

    if (this.rotationSpeed > 0) {
      this.atomGroup.rotation.y += (this.rotationSpeed * Math.PI / 180) * (delta / 1000);
      this.latticeGroup.rotation.y += (this.rotationSpeed * Math.PI / 180) * (delta / 1000);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  setAtomRadiusScale(scale: number): void {
    this.atomRadiusScale = scale;
    this.atomMeshData.forEach(data => {
      const newScale = data.atom.radius * scale;
      data.originalScale = newScale;
      if (data === this.hoveredAtom) {
        data.mesh.scale.setScalar(newScale * 1.2);
      } else {
        data.mesh.scale.setScalar(newScale);
      }
    });
  }

  setLatticeOpacity(opacity: number): void {
    this.latticeOpacity = opacity;
    this.latticeGroup.children.forEach(child => {
      if (child instanceof THREE.Line) {
        const mat = child.material as THREE.LineBasicMaterial;
        mat.opacity = opacity;
        mat.transparent = true;
      }
    });
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  toggleStructure(): void {
    if (this.structureType === 'FCC') {
      this.buildBCCStructure();
    } else {
      this.buildFCCStructure();
    }
  }

  getCurrentStructure(): StructureType {
    return this.structureType;
  }

  toggleCrystalPlane(): void {
    this.showCrystalPlane = !this.showCrystalPlane;
    this.buildCrystalPlane();
  }

  getCrystalPlaneVisible(): boolean {
    return this.showCrystalPlane;
  }

  resetCamera(): void {
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialCameraTarget);
    this.controls.update();
    this.atomGroup.rotation.set(0, 0, 0);
    this.latticeGroup.rotation.set(0, 0, 0);
  }

  generatePolyCrystal(): void {
    this.buildPolyCrystalStructure();
  }

  getAtomCount(): number {
    return this.atoms.length;
  }

  setOnFpsUpdate(callback: (fps: number) => void): void {
    this.onFpsUpdate = callback;
  }

  setOnAtomHover(callback: (atom: Atom | null, screenX: number, screenY: number) => void): void {
    this.onAtomHover = callback;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('mouseleave', this.onMouseLeave);
    this.clearAtoms();
    this.clearLattice();
    this.baseAtomGeometry.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
