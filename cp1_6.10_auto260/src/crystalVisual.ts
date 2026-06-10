import * as THREE from 'three';
import { ElementData, CrystalStructure } from './elementData';
import { SceneManager } from './scene';

export type AtomSiteType = 'corner' | 'face' | 'body' | 'edge' | 'internal';

export interface CrystalAtom {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  siteType: AtomSiteType;
}

export class CrystalVisualizer {
  private sceneMgr: SceneManager;
  private cellSize: number = 2;
  private atoms: CrystalAtom[] = [];
  private wireframe: THREE.LineSegments | null = null;
  private slicePlaneMesh: THREE.Mesh | null = null;
  private sliceEnabled: boolean = false;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private tooltip: HTMLElement | null = null;
  private onAtomClickCallback: ((atom: CrystalAtom) => void) | null = null;

  constructor(sceneMgr: SceneManager) {
    this.sceneMgr = sceneMgr;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.tooltip = document.getElementById('tooltip');
    this.setupMouseInteraction();
    this.setupKeyboard();
  }

  public setOnAtomClick(callback: (atom: CrystalAtom) => void): void {
    this.onAtomClickCallback = callback;
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 's') {
        this.toggleSlice();
      }
    });
  }

  private setupMouseInteraction(): void {
    const canvas = this.sceneMgr.renderer.domElement;

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.sceneMgr.camera);
      const meshes = this.atoms.map(a => a.mesh);
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const atom = this.atoms.find(a => a.mesh === hitMesh);
        if (atom && this.onAtomClickCallback) {
          this.onAtomClickCallback(atom);
        }
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.tooltip) return;

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.sceneMgr.camera);
      const meshes = this.atoms.map(a => a.mesh);
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const atom = this.atoms.find(a => a.mesh === hitMesh);
        if (atom) {
          this.showTooltip(atom, e.clientX, e.clientY);
          return;
        }
      }
      this.hideTooltip();
    });

    canvas.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  }

  private showTooltip(atom: CrystalAtom, x: number, y: number): void {
    if (!this.tooltip) return;
    const siteName = this.getSiteTypeName(atom.siteType);
    const pos = atom.position;
    this.tooltip.innerHTML = `
      <div><b>位置:</b> (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})</div>
      <div><b>占位:</b> ${siteName}</div>
    `;
    this.tooltip.style.left = `${x + 15}px`;
    this.tooltip.style.top = `${y + 15}px`;
    this.tooltip.classList.add('show');
  }

  private hideTooltip(): void {
    if (!this.tooltip) return;
    this.tooltip.classList.remove('show');
  }

  private getSiteTypeName(type: AtomSiteType): string {
    const names: Record<AtomSiteType, string> = {
      corner: '角原子',
      face: '面心原子',
      body: '体心原子',
      edge: '棱心原子',
      internal: '内部原子'
    };
    return names[type];
  }

  public toggleSlice(): void {
    this.sliceEnabled = !this.sliceEnabled;
    this.applySliceMode();
  }

  private applySliceMode(): void {
    const transition = (targetOpacity: number, duration: number = 400) => {
      const start = performance.now();
      const halfSize = this.cellSize / 2;
      const thresholdY = 0;

      const animate = () => {
        const elapsed = performance.now() - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - 0.5 * (1 - Math.cos(Math.PI * t));

        this.atoms.forEach(atom => {
          const shouldHide = this.sliceEnabled && atom.position.y > thresholdY;
          const op = shouldHide ? 0 : targetOpacity;
          const mat = atom.mesh.material as THREE.MeshPhongMaterial;
          mat.transparent = true;
          mat.opacity = op * eased + (mat.opacity ?? targetOpacity) * (1 - eased);
        });

        if (this.slicePlaneMesh) {
          const mat = this.slicePlaneMesh.material as THREE.MeshBasicMaterial;
          mat.opacity = this.sliceEnabled ? 0.3 * eased : mat.opacity * (1 - eased);
          this.slicePlaneMesh.visible = this.sliceEnabled;
        }

        if (t < 1) requestAnimationFrame(animate);
        else {
          this.atoms.forEach(atom => {
            const shouldHide = this.sliceEnabled && atom.position.y > thresholdY;
            atom.mesh.visible = !shouldHide;
            const mat = atom.mesh.material as THREE.MeshPhongMaterial;
            mat.opacity = shouldHide ? 0 : targetOpacity;
          });
        }
      };
      animate();
    };

    transition(this.sceneMgr.settings.crystalOpacity);
  }

  public build(element: ElementData): void {
    this.atoms = [];
    this.buildWireframe();
    this.buildAtoms(element);
    this.buildSlicePlane(element);
    this.applyOpacity();
  }

  private buildWireframe(): void {
    const s = this.cellSize;
    const half = s / 2;

    const edges = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(s, s, s)
    );
    const mat = new THREE.LineBasicMaterial({
      color: 0x70a0ff,
      transparent: true,
      opacity: 0.6
    });
    this.wireframe = new THREE.LineSegments(edges, mat);
    this.sceneMgr.crystalGroup.add(this.wireframe);

    const axesHelper = new THREE.AxesHelper(half * 1.2);
    this.sceneMgr.crystalGroup.add(axesHelper);
  }

  private buildSlicePlane(element: ElementData): void {
    const s = this.cellSize;
    const planeGeo = new THREE.PlaneGeometry(s * 1.05, s * 1.05);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x4080ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.slicePlaneMesh = new THREE.Mesh(planeGeo, planeMat);
    this.slicePlaneMesh.visible = false;
    this.sceneMgr.crystalGroup.add(this.slicePlaneMesh);
  }

  private buildAtoms(element: ElementData): void {
    const structure = element.crystalStructure;
    const atomColor = new THREE.Color(element.color);
    const glowColor = new THREE.Color(element.glowColor);
    const half = this.cellSize / 2;
    const atomRadius = 0.22;

    const positions = this.getAtomPositions(structure, half);

    positions.forEach(({ pos, type }) => {
      const geo = new THREE.SphereGeometry(atomRadius, 24, 24);
      const mat = new THREE.MeshPhongMaterial({
        color: atomColor,
        emissive: glowColor,
        emissiveIntensity: 0.3,
        shininess: 80,
        transparent: true,
        opacity: this.sceneMgr.settings.crystalOpacity
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.sceneMgr.crystalGroup.add(mesh);
      this.atoms.push({ mesh, position: pos.clone(), siteType: type });
    });
  }

  private getAtomPositions(
    structure: CrystalStructure,
    half: number
  ): Array<{ pos: THREE.Vector3; type: AtomSiteType }> {
    const result: Array<{ pos: THREE.Vector3; type: AtomSiteType }> = [];

    const corners = [
      new THREE.Vector3(-half, -half, -half),
      new THREE.Vector3(half, -half, -half),
      new THREE.Vector3(-half, half, -half),
      new THREE.Vector3(half, half, -half),
      new THREE.Vector3(-half, -half, half),
      new THREE.Vector3(half, -half, half),
      new THREE.Vector3(-half, half, half),
      new THREE.Vector3(half, half, half)
    ];

    switch (structure) {
      case 'SC':
        corners.forEach(p => result.push({ pos: p, type: 'corner' }));
        break;

      case 'BCC':
        corners.forEach(p => result.push({ pos: p, type: 'corner' }));
        result.push({ pos: new THREE.Vector3(0, 0, 0), type: 'body' });
        break;

      case 'FCC':
        corners.forEach(p => result.push({ pos: p, type: 'corner' }));
        result.push({ pos: new THREE.Vector3(0, 0, half), type: 'face' });
        result.push({ pos: new THREE.Vector3(0, 0, -half), type: 'face' });
        result.push({ pos: new THREE.Vector3(0, half, 0), type: 'face' });
        result.push({ pos: new THREE.Vector3(0, -half, 0), type: 'face' });
        result.push({ pos: new THREE.Vector3(half, 0, 0), type: 'face' });
        result.push({ pos: new THREE.Vector3(-half, 0, 0), type: 'face' });
        break;

      case 'HCP': {
        const a = half * 0.8;
        const c = half * 1.2;
        const h = (Math.sqrt(3) / 3) * a;
        const positions = [
          { pos: new THREE.Vector3(0, -c, 0), type: 'corner' as AtomSiteType },
          { pos: new THREE.Vector3(a, -c, 0), type: 'corner' as AtomSiteType },
          { pos: new THREE.Vector3(-a / 2, -c, h), type: 'corner' as AtomSiteType },
          { pos: new THREE.Vector3(-a / 2, -c, -h), type: 'corner' as AtomSiteType },
          { pos: new THREE.Vector3(0, c, 0), type: 'corner' as AtomSiteType },
          { pos: new THREE.Vector3(a, c, 0), type: 'corner' as AtomSiteType },
          { pos: new THREE.Vector3(-a / 2, c, h), type: 'corner' as AtomSiteType },
          { pos: new THREE.Vector3(-a / 2, c, -h), type: 'corner' as AtomSiteType },
          { pos: new THREE.Vector3(a / 2, 0, h / 2), type: 'internal' as AtomSiteType },
          { pos: new THREE.Vector3(-a / 2, 0, -h / 2), type: 'internal' as AtomSiteType }
        ];
        positions.forEach(p => result.push(p));
        break;
      }

      case 'Diamond': {
        corners.forEach(p => result.push({ pos: p, type: 'corner' }));
        result.push({ pos: new THREE.Vector3(0, 0, half), type: 'face' });
        result.push({ pos: new THREE.Vector3(0, 0, -half), type: 'face' });
        result.push({ pos: new THREE.Vector3(0, half, 0), type: 'face' });
        result.push({ pos: new THREE.Vector3(0, -half, 0), type: 'face' });
        result.push({ pos: new THREE.Vector3(half, 0, 0), type: 'face' });
        result.push({ pos: new THREE.Vector3(-half, 0, 0), type: 'face' });
        const q = half / 2;
        result.push({ pos: new THREE.Vector3(-q, -q, -q), type: 'internal' });
        result.push({ pos: new THREE.Vector3(q, q, -q), type: 'internal' });
        result.push({ pos: new THREE.Vector3(-q, q, q), type: 'internal' });
        result.push({ pos: new THREE.Vector3(q, -q, q), type: 'internal' });
        break;
      }
    }

    return result;
  }

  public applyOpacity(): void {
    const opacity = this.sceneMgr.settings.crystalOpacity;
    this.atoms.forEach(atom => {
      const mat = atom.mesh.material as THREE.MeshPhongMaterial;
      if (!(this.sliceEnabled && atom.position.y > 0)) {
        mat.opacity = opacity;
      }
    });
  }

  public dispose(): void {
    this.atoms = [];
    this.wireframe = null;
    this.slicePlaneMesh = null;
  }
}
