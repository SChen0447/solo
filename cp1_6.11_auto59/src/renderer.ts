import * as THREE from 'three';
import { Atom, Bond, MoleculeData, ATOM_PROPERTIES, AtomType } from './data';

interface AtomMeshData {
  mesh: THREE.Mesh;
  atom: Atom;
  isHydrogen: boolean;
  originalColor: THREE.Color;
}

interface BondMeshData {
  mesh: THREE.Mesh;
  bond: Bond;
  atom1Mesh: THREE.Mesh;
  atom2Mesh: THREE.Mesh;
  isHydrogenBond: boolean;
}

interface HighlightState {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  originalEmissive: THREE.Color;
}

export interface AtomInfo {
  type: AtomType;
  typeName: string;
  x: number;
  y: number;
  z: number;
  bondCount: number;
  valenceElectrons: number;
}

type CallbackAtomInfo = (info: AtomInfo, screenX: number, screenY: number) => void;

export class MoleculeRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private moleculeGroup: THREE.Group;
  private atomMeshes: Map<number, AtomMeshData> = new Map();
  private bondMeshes: BondMeshData[] = [];
  private hydrogenAtoms: AtomMeshData[] = [];
  private hydrogenBonds: BondMeshData[] = [];

  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private rotationVelocity = { x: 0, y: 0 };
  private readonly INERTIA = 0.75;

  private targetZoom = 1;
  private currentZoom = 1;
  private readonly MIN_ZOOM = 0.5;
  private readonly MAX_ZOOM = 3;
  private readonly ZOOM_EASE = 0.1;

  private initialCameraPosition = new THREE.Vector3(0, 0, 10);
  private initialRotation = new THREE.Euler(0, 0, 0);
  private resetAnimationStart = -1;
  private resetAnimationDuration = 800;
  private startCameraPosition = new THREE.Vector3();
  private startRotation = new THREE.Euler();

  private highlights: HighlightState[] = [];
  private hydrogenVisible = true;
  private hydrogenAnimationStart = -1;
  private hydrogenAnimationDuration = 300;
  private hydrogenAnimationDirection = 1;

  private raycaster = new THREE.Raycaster();
  private mouseVector = new THREE.Vector2();
  private onAtomClick: CallbackAtomInfo | null = null;

  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsUpdateTime = 0;
  private currentFps = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.copy(this.initialCameraPosition);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupEventListeners();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 8, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.5);
    fillLight.position.set(-6, -3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffddaa, 0.4);
    rimLight.position.set(0, -8, 8);
    this.scene.add(rimLight);

    const topLight = new THREE.PointLight(0xffffff, 0.6, 30);
    topLight.position.set(0, 10, 5);
    this.scene.add(topLight);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
      this.rotationVelocity.x = 0;
      this.rotationVelocity.y = 0;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMouse.x;
        const deltaY = e.clientY - this.previousMouse.y;
        const sensitivity = 0.008;
        this.moleculeGroup.rotation.y += deltaX * sensitivity;
        this.moleculeGroup.rotation.x += deltaY * sensitivity;
        this.rotationVelocity.x = deltaY * sensitivity;
        this.rotationVelocity.y = deltaX * sensitivity;
        this.previousMouse.x = e.clientX;
        this.previousMouse.y = e.clientY;
        this.resetAnimationStart = -1;
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.targetZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.targetZoom * delta));
    }, { passive: false });

    canvas.addEventListener('dblclick', (e) => {
      this.handleDoubleClick(e);
    });

    window.addEventListener('resize', () => {
      this.onResize();
    });
  }

  private handleDoubleClick(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseVector, this.camera);

    const meshes: THREE.Mesh[] = [];
    this.atomMeshes.forEach((data) => {
      if (!data.isHydrogen || this.hydrogenVisible) {
        meshes.push(data.mesh);
      }
    });

    const intersects = this.raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      this.highlightAtom(hitMesh);
      this.showAtomInfo(hitMesh, e.clientX, e.clientY);
    }
  }

  private highlightAtom(mesh: THREE.Mesh): void {
    const material = mesh.material as THREE.MeshStandardMaterial;
    const existingHighlight = this.highlights.find(h => h.mesh === mesh);
    if (existingHighlight) {
      existingHighlight.startTime = performance.now();
      return;
    }
    this.highlights.push({
      mesh,
      startTime: performance.now(),
      duration: 500,
      originalEmissive: material.emissive.clone()
    });
  }

  private showAtomInfo(mesh: THREE.Mesh, screenX: number, screenY: number): void {
    let atomData: AtomMeshData | undefined;
    this.atomMeshes.forEach((data) => {
      if (data.mesh === mesh) atomData = data;
    });
    if (!atomData || !this.onAtomClick) return;

    const atom = atomData.atom;
    const props = ATOM_PROPERTIES[atom.type];
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);

    this.onAtomClick({
      type: atom.type,
      typeName: props.name,
      x: parseFloat(worldPos.x.toFixed(3)),
      y: parseFloat(worldPos.y.toFixed(3)),
      z: parseFloat(worldPos.z.toFixed(3)),
      bondCount: atom.bondCount,
      valenceElectrons: props.valenceElectrons
    }, screenX, screenY);
  }

  public setOnAtomClick(callback: CallbackAtomInfo): void {
    this.onAtomClick = callback;
  }

  public loadMolecule(data: MoleculeData): void {
    this.clearMolecule();
    this.createAtoms(data.atoms);
    this.createBonds(data.bonds, data.atoms);
    this.centerMolecule();
  }

  private clearMolecule(): void {
    this.atomMeshes.forEach((data) => {
      this.moleculeGroup.remove(data.mesh);
      data.mesh.geometry.dispose();
      (data.mesh.material as THREE.Material).dispose();
    });
    this.bondMeshes.forEach((data) => {
      this.moleculeGroup.remove(data.mesh);
      data.mesh.geometry.dispose();
      (data.mesh.material as THREE.Material).dispose();
    });
    this.atomMeshes.clear();
    this.bondMeshes = [];
    this.hydrogenAtoms = [];
    this.hydrogenBonds = [];
  }

  private createAtoms(atoms: Atom[]): void {
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 24);

    atoms.forEach((atom) => {
      const props = ATOM_PROPERTIES[atom.type];
      const adjustedRadius = props.radius * (1 + (atom.bondCount - 1) * 0.05);
      const material = new THREE.MeshStandardMaterial({
        color: props.color,
        metalness: 0.3,
        roughness: 0.25,
        emissive: 0x000000
      });
      const mesh = new THREE.Mesh(sphereGeometry.clone(), material);
      mesh.scale.setScalar(adjustedRadius);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.moleculeGroup.add(mesh);

      const atomData: AtomMeshData = {
        mesh,
        atom,
        isHydrogen: atom.type === 'H',
        originalColor: new THREE.Color(props.color)
      };
      this.atomMeshes.set(atom.id, atomData);
      if (atom.type === 'H') {
        this.hydrogenAtoms.push(atomData);
      }
    });
  }

  private createBonds(bonds: Bond[], atoms: Atom[]): void {
    const atomMap = new Map<number, Atom>();
    atoms.forEach(a => atomMap.set(a.id, a));
    const cylinderGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1, 16, 1);

    bonds.forEach((bond) => {
      const a1 = atomMap.get(bond.atom1);
      const a2 = atomMap.get(bond.atom2);
      if (!a1 || !a2) return;

      const mesh1 = this.atomMeshes.get(bond.atom1)?.mesh;
      const mesh2 = this.atomMeshes.get(bond.atom2)?.mesh;
      if (!mesh1 || !mesh2) return;

      const start = new THREE.Vector3(a1.x, a1.y, a1.z);
      const end = new THREE.Vector3(a2.x, a2.y, a2.z);
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

      const color1 = ATOM_PROPERTIES[a1.type].color;
      const color2 = ATOM_PROPERTIES[a2.type].color;
      const avgColor = new THREE.Color(color1).lerp(new THREE.Color(color2), 0.5);

      const material = new THREE.MeshStandardMaterial({
        color: avgColor,
        metalness: 0.2,
        roughness: 0.4
      });

      const mesh = new THREE.Mesh(cylinderGeometry.clone(), material);
      mesh.scale.y = length;
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.moleculeGroup.add(mesh);

      const bondData: BondMeshData = {
        mesh,
        bond,
        atom1Mesh: mesh1,
        atom2Mesh: mesh2,
        isHydrogenBond: a1.type === 'H' || a2.type === 'H'
      };
      this.bondMeshes.push(bondData);
      if (bondData.isHydrogenBond) {
        this.hydrogenBonds.push(bondData);
      }
    });
  }

  private centerMolecule(): void {
    const box = new THREE.Box3().setFromObject(this.moleculeGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.moleculeGroup.position.sub(center);
  }

  public resetView(): void {
    this.startCameraPosition.copy(this.camera.position);
    this.startRotation.copy(this.moleculeGroup.rotation);
    this.rotationVelocity.x = 0;
    this.rotationVelocity.y = 0;
    this.targetZoom = 1;
    this.resetAnimationStart = performance.now();
  }

  public toggleHydrogen(visible: boolean): void {
    if (visible === this.hydrogenVisible) return;
    this.hydrogenVisible = visible;
    this.hydrogenAnimationStart = performance.now();
    this.hydrogenAnimationDirection = visible ? 1 : -1;
  }

  public isHydrogenVisible(): boolean {
    return this.hydrogenVisible;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  public animate(): void {
    const now = performance.now();

    if (!this.isDragging && (Math.abs(this.rotationVelocity.x) > 0.0001 || Math.abs(this.rotationVelocity.y) > 0.0001)) {
      this.moleculeGroup.rotation.x += this.rotationVelocity.x;
      this.moleculeGroup.rotation.y += this.rotationVelocity.y;
      this.rotationVelocity.x *= this.INERTIA;
      this.rotationVelocity.y *= this.INERTIA;
    }

    if (Math.abs(this.currentZoom - this.targetZoom) > 0.001) {
      this.currentZoom += (this.targetZoom - this.currentZoom) * this.ZOOM_EASE;
      this.camera.position.copy(this.initialCameraPosition).multiplyScalar(1 / this.currentZoom);
      this.camera.lookAt(0, 0, 0);
    }

    if (this.resetAnimationStart >= 0) {
      const progress = Math.min(1, (now - this.resetAnimationStart) / this.resetAnimationDuration);
      const eased = this.easeInOut(progress);
      this.camera.position.lerpVectors(this.startCameraPosition, this.initialCameraPosition, eased);
      this.camera.lookAt(0, 0, 0);
      this.moleculeGroup.rotation.x = this.startRotation.x + (0 - this.startRotation.x) * eased;
      this.moleculeGroup.rotation.y = this.startRotation.y + (0 - this.startRotation.y) * eased;
      this.moleculeGroup.rotation.z = this.startRotation.z + (0 - this.startRotation.z) * eased;
      if (progress >= 1) this.resetAnimationStart = -1;
    }

    if (this.hydrogenAnimationStart >= 0) {
      const progress = Math.min(1, (now - this.hydrogenAnimationStart) / this.hydrogenAnimationDuration);
      const opacity = this.hydrogenAnimationDirection > 0 ? progress : (1 - progress);
      this.hydrogenAtoms.forEach((data) => {
        const mat = data.mesh.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = opacity;
        data.mesh.visible = opacity > 0.01;
      });
      this.hydrogenBonds.forEach((data) => {
        const mat = data.mesh.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = opacity;
        data.mesh.visible = opacity > 0.01;
      });
      if (progress >= 1) {
        this.hydrogenAnimationStart = -1;
        this.hydrogenAtoms.forEach((data) => {
          const mat = data.mesh.material as THREE.MeshStandardMaterial;
          mat.transparent = false;
          mat.opacity = 1;
        });
        this.hydrogenBonds.forEach((data) => {
          const mat = data.mesh.material as THREE.MeshStandardMaterial;
          mat.transparent = false;
          mat.opacity = 1;
        });
      }
    }

    this.highlights = this.highlights.filter((h) => {
      const progress = (now - h.startTime) / h.duration;
      if (progress >= 1) {
        const mat = h.mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.copy(h.originalEmissive);
        return false;
      }
      const pulse = Math.sin(progress * Math.PI * 4) * 0.5 + 0.5;
      const mat = h.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setRGB(1 * pulse, 1 * pulse, 0.2 * pulse);
      return true;
    });

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    if (now - this.fpsUpdateTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }
  }

  public getFps(): number {
    return this.currentFps;
  }

  public exportSVG(): string {
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    const lines: string[] = [];
    const atoms: { x: number; y: number; r: number; color: string }[] = [];

    this.bondMeshes.forEach((bondData) => {
      if (bondData.isHydrogenBond && !this.hydrogenVisible) return;
      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      bondData.atom1Mesh.getWorldPosition(p1);
      bondData.atom2Mesh.getWorldPosition(p2);

      const sp1 = p1.clone().project(this.camera);
      const sp2 = p2.clone().project(this.camera);

      const x1 = (sp1.x * 0.5 + 0.5) * width;
      const y1 = (-sp1.y * 0.5 + 0.5) * height;
      const x2 = (sp2.x * 0.5 + 0.5) * width;
      const y2 = (-sp2.y * 0.5 + 0.5) * height;

      lines.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#888888" stroke-width="0.8"/>`);
    });

    this.atomMeshes.forEach((data) => {
      if (data.isHydrogen && !this.hydrogenVisible) return;
      const worldPos = new THREE.Vector3();
      data.mesh.getWorldPosition(worldPos);
      const sp = worldPos.project(this.camera);
      const x = (sp.x * 0.5 + 0.5) * width;
      const y = (-sp.y * 0.5 + 0.5) * height;
      const scale = data.mesh.scale.x;
      const r = (scale * 0.1 * this.currentZoom) * Math.min(width, height) * 0.5;
      const colorHex = '#' + data.originalColor.getHexString();
      atoms.push({ x, y, r, color: colorHex });
    });

    atoms.sort((a, b) => b.y - a.y);
    const atomCircles = atoms.map(a =>
      `<circle cx="${a.x.toFixed(2)}" cy="${a.y.toFixed(2)}" r="${a.r.toFixed(2)}" fill="${a.color}" stroke="#000000" stroke-width="0.8"/>`
    );

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0a1628"/>
  <g>
${lines.join('\n')}
  </g>
  <g>
${atomCircles.join('\n')}
  </g>
</svg>`;
  }

  public downloadSVG(): void {
    const svg = this.exportSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'molecule-structure.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  private onResize(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    this.clearMolecule();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
