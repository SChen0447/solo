import * as THREE from 'three';
import { MoleculeData, AtomData, BondData, getAtomById, getConnectedAtoms } from './moleculeData';

interface AtomMesh {
  mesh: THREE.Mesh;
  data: AtomData;
  group: THREE.Group;
  targetScale: number;
  startScale: number;
  scaleAnimTime: number;
  scaleAnimDuration: number;
  highlightMesh?: THREE.Mesh;
  originalOpacity: number;
}

interface BondMesh {
  mesh: THREE.Mesh | THREE.Group;
  data: BondData;
  originalOpacity: number;
}

interface ParticleData {
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  yOffset: number;
  speed: number;
}

interface AtomGroup {
  atomIds: string[];
  group: THREE.Group;
  velocity: THREE.Vector3;
  originalPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  boundingBox?: THREE.Mesh;
}

type DecomposeState = 'idle' | 'decomposing' | 'decomposed' | 'restoring';

export type RendererEventType =
  | 'atom-clicked'
  | 'molecule-loaded'
  | 'decompose-state-changed';

export interface RendererEvent {
  type: RendererEventType;
  data?: any;
}

export class MoleculeRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private moleculeGroup: THREE.Group = new THREE.Group();
  private atoms: Map<string, AtomMesh> = new Map();
  private bonds: BondMesh[] = [];
  private particles: ParticleData[] = [];
  private particleGroup: THREE.Group = new THREE.Group();

  private rotationSpeed: number = 0.5;
  private bondOpacity: number = 0.6;
  private atomScale: number = 1.0;

  private isDragging: boolean = false;
  private isRightDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private rotationVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private damping: number = 0.95;
  private autoRotate: boolean = true;

  private selectedAtomId: string | null = null;

  private decomposeState: DecomposeState = 'idle';
  private atomGroups: AtomGroup[] = [];
  private decomposeTime: number = 0;
  private decomposeDuration: number = 3;
  private decomposeSpeed: number = 0.5;

  private animationStartTime: number = 0;
  private isAnimating: boolean = false;
  private animationDuration: number = 1.2;

  private listeners: Map<RendererEventType, ((event: RendererEvent) => void)[]> = new Map();

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private draggingGroup: AtomGroup | null = null;
  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragOffset: THREE.Vector3 = new THREE.Vector3();

  private currentMolecule: MoleculeData | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 10;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    this.scene.add(this.moleculeGroup);
    this.scene.add(this.particleGroup);

    this.setupLights();
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0x8888ff, 0.3);
    directionalLight2.position.set(-5, -3, -5);
    this.scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0x6699ff, 0.5, 20);
    pointLight.position.set(0, 3, 5);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      if (this.decomposeState === 'decomposed') {
        this.checkGroupClick(event);
        if (this.draggingGroup) return;
      }

      this.checkAtomClick(event);
      this.isDragging = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      this.rotationVelocity = { x: 0, y: 0 };
      this.autoRotate = false;
    } else if (event.button === 2) {
      this.isRightDragging = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.draggingGroup) {
      this.dragGroup(event);
      return;
    }

    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;

      this.moleculeGroup.rotation.y += deltaX * 0.01;
      this.moleculeGroup.rotation.x += deltaY * 0.01;

      this.rotationVelocity.x = deltaX * 0.01;
      this.rotationVelocity.y = deltaY * 0.01;

      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    if (this.isRightDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;

      this.camera.position.x -= deltaX * 0.01;
      this.camera.position.y += deltaY * 0.01;

      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onMouseUp(): void {
    if (this.draggingGroup) {
      if (this.draggingGroup.boundingBox) {
        this.draggingGroup.boundingBox.visible = false;
      }
      this.draggingGroup = null;
    }

    if (this.isDragging) {
      this.isDragging = false;
      setTimeout(() => {
        if (!this.isDragging) {
          this.autoRotate = true;
        }
      }, 2000);
    }

    if (this.isRightDragging) {
      this.isRightDragging = false;
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.001;
    const delta = event.deltaY * zoomSpeed;
    const newZ = this.camera.position.z + delta * 5;
    this.camera.position.z = Math.max(3, Math.min(30, newZ));
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];
      this.isDragging = true;
      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
      this.rotationVelocity = { x: 0, y: 0 };
      this.autoRotate = false;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isDragging) {
      event.preventDefault();
      const touch = event.touches[0];
      const deltaX = touch.clientX - this.previousMousePosition.x;
      const deltaY = touch.clientY - this.previousMousePosition.y;

      this.moleculeGroup.rotation.y += deltaX * 0.01;
      this.moleculeGroup.rotation.x += deltaY * 0.01;

      this.rotationVelocity.x = deltaX * 0.01;
      this.rotationVelocity.y = deltaY * 0.01;

      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
    }
  }

  private onTouchEnd(): void {
    if (this.isDragging) {
      this.isDragging = false;
      setTimeout(() => {
        if (!this.isDragging) {
          this.autoRotate = true;
        }
      }, 2000);
    }
  }

  private checkAtomClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes: THREE.Mesh[] = [];
    this.atoms.forEach((atom) => meshes.push(atom.mesh));

    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      let clickedAtomId: string | null = null;

      this.atoms.forEach((atom, id) => {
        if (atom.mesh === clickedMesh) {
          clickedAtomId = id;
        }
      });

      if (clickedAtomId) {
        this.selectAtom(clickedAtomId);
      }
    } else {
      this.deselectAtom();
    }
  }

  private checkGroupClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    for (const group of this.atomGroups) {
      if (group.boundingBox) {
        const intersects = this.raycaster.intersectObject(group.boundingBox);
        if (intersects.length > 0) {
          this.draggingGroup = group;
          group.boundingBox.visible = true;

          this.dragPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 0, 1),
            group.group.position
          );

          const intersection = new THREE.Vector3();
          this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
          if (intersection) {
            this.dragOffset.copy(group.group.position).sub(intersection);
          }
          return;
        }
      }
    }
  }

  private dragGroup(event: MouseEvent): void {
    if (!this.draggingGroup) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);

    if (intersection) {
      this.draggingGroup.group.position.copy(intersection).add(this.dragOffset);
    }
  }

  private selectAtom(atomId: string): void {
    this.deselectAtom();
    this.selectedAtomId = atomId;

    const atom = this.atoms.get(atomId);
    if (!atom) return;

    this.atoms.forEach((a) => {
      const material = a.mesh.material as THREE.MeshPhongMaterial;
      material.transparent = true;
      material.opacity = 0.2;
    });

    const material = atom.mesh.material as THREE.MeshPhongMaterial;
    material.opacity = 1;

    if (!atom.highlightMesh) {
      const highlightGeometry = new THREE.SphereGeometry(atom.data.radius * 1.3, 32, 32);
      const highlightMaterial = new THREE.MeshBasicMaterial({
        color: atom.data.color,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide,
      });
      atom.highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
      atom.group.add(atom.highlightMesh);
    }
    atom.highlightMesh.visible = true;

    if (this.currentMolecule) {
      const atomData = getAtomById(this.currentMolecule, atomId);
      const connected = getConnectedAtoms(this.currentMolecule, atomId);
      this.emit('atom-clicked', {
        atom: atomData,
        connected: connected,
      });
    }
  }

  private deselectAtom(): void {
    if (!this.selectedAtomId) return;

    const selectedAtom = this.atoms.get(this.selectedAtomId);
    if (selectedAtom?.highlightMesh) {
      selectedAtom.highlightMesh.visible = false;
    }

    this.atoms.forEach((atom) => {
      const material = atom.mesh.material as THREE.MeshPhongMaterial;
      material.opacity = atom.originalOpacity;
    });

    this.selectedAtomId = null;
  }

  public loadMolecule(molecule: MoleculeData): void {
    this.clearMolecule();
    this.currentMolecule = molecule;

    this.atomGroups = [];
    this.decomposeState = 'idle';
    this.decomposeTime = 0;

    const groups = this.findAtomGroups(molecule);

    groups.forEach((groupAtomIds, groupIndex) => {
      const group = new THREE.Group();

      groupAtomIds.forEach((atomId) => {
        const atomData = molecule.atoms.find((a) => a.id === atomId);
        if (!atomData) return;

        const atomGroup = new THREE.Group();
        atomGroup.position.set(0, 0, 0);

        const geometry = new THREE.SphereGeometry(atomData.radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({
          color: atomData.color,
          emissive: atomData.color,
          emissiveIntensity: 0.2,
          shininess: 50,
          transparent: true,
          opacity: 1,
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.scale.set(0.01, 0.01, 0.01);
        atomGroup.add(sphere);

        atomGroup.position.set(
          atomData.position.x * 1.5,
          atomData.position.y * 1.5,
          atomData.position.z * 1.5
        );

        const atomMesh: AtomMesh = {
          mesh: sphere,
          data: atomData,
          group: atomGroup,
          targetScale: 1,
          startScale: 0.01,
          scaleAnimTime: 0,
          scaleAnimDuration: 0.4,
          originalOpacity: 1,
        };

        this.atoms.set(atomId, atomMesh);
        group.add(atomGroup);
      });

      this.moleculeGroup.add(group);

      const center = new THREE.Vector3();
      groupAtomIds.forEach((atomId) => {
        const atomData = molecule.atoms.find((a) => a.id === atomId);
        if (atomData) {
          center.x += atomData.position.x * 1.5;
          center.y += atomData.position.y * 1.5;
          center.z += atomData.position.z * 1.5;
        }
      });
      center.divideScalar(groupAtomIds.length);

      const bboxGeometry = new THREE.SphereGeometry(3, 32, 32);
      const bboxMaterial = new THREE.MeshBasicMaterial({
        color: 0x4299e1,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
      });
      const bbox = new THREE.Mesh(bboxGeometry, bboxMaterial);
      bbox.visible = false;
      group.add(bbox);

      const angle = (groupIndex / groups.length) * Math.PI * 2 + Math.random() * 0.5;
      const offset = new THREE.Vector3(
        Math.cos(angle) * 8,
        (Math.random() - 0.5) * 4,
        Math.sin(angle) * 8
      );

      const targetPos = center.clone().add(offset);

      this.atomGroups.push({
        atomIds: groupAtomIds,
        group,
        velocity: new THREE.Vector3(),
        originalPosition: center.clone(),
        targetPosition: targetPos,
        boundingBox: bbox,
      });
    });

    molecule.bonds.forEach((bondData) => {
      const atom1 = molecule.atoms.find((a) => a.id === bondData.atom1);
      const atom2 = molecule.atoms.find((a) => a.id === bondData.atom2);
      if (!atom1 || !atom2) return;

      const bondMesh = this.createBond(
        new THREE.Vector3(atom1.position.x * 1.5, atom1.position.y * 1.5, atom1.position.z * 1.5),
        new THREE.Vector3(atom2.position.x * 1.5, atom2.position.y * 1.5, atom2.position.z * 1.5),
        bondData.order,
        this.bondOpacity
      );

      this.moleculeGroup.add(bondMesh);
      this.bonds.push({
        mesh: bondMesh,
        data: bondData,
        originalOpacity: this.bondOpacity,
      });
    });

    this.createParticleRing(molecule);

    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.emit('molecule-loaded', { molecule });

    setTimeout(() => {
      this.autoRotate = true;
    }, 2000);
  }

  private findAtomGroups(molecule: MoleculeData): string[][] {
    const visited: Set<string> = new Set();
    const groups: string[][] = [];

    const dfs = (atomId: string, group: string[]) => {
      if (visited.has(atomId)) return;
      visited.add(atomId);
      group.push(atomId);

      for (const bond of molecule.bonds) {
        let otherId: string | null = null;
        if (bond.atom1 === atomId) otherId = bond.atom2;
        if (bond.atom2 === atomId) otherId = bond.atom1;
        if (otherId && !visited.has(otherId)) {
          dfs(otherId, group);
        }
      }
    };

    for (const atom of molecule.atoms) {
      if (!visited.has(atom.id)) {
        const group: string[] = [];
        dfs(atom.id, group);
        groups.push(group);
      }
    }

    return groups;
  }

  private createBond(start: THREE.Vector3, end: THREE.Vector3, order: number, opacity: number): THREE.Group {
    const bondGroup = new THREE.Group();
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const bondRadius = 0.08;
    const bondSeparation = 0.22;

    for (let i = 0; i < order; i++) {
      const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 16);
      const material = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        emissive: 0x666666,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: opacity,
        shininess: 30,
      });

      const cylinder = new THREE.Mesh(geometry, material);
      cylinder.position.copy(midpoint);

      const offset = (i - (order - 1) / 2) * bondSeparation;
      const perp = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
      if (perp.length() === 0) {
        perp.set(1, 0, 0);
      }
      perp.multiplyScalar(offset);
      cylinder.position.add(perp);

      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
      cylinder.rotation.setFromQuaternion(quaternion);

      cylinder.scale.y = 0.01;
      bondGroup.add(cylinder);
    }

    return bondGroup;
  }

  private createParticleRing(molecule: MoleculeData): void {
    this.particleGroup.clear();
    this.particles = [];

    const colors = Array.from(new Set(molecule.atoms.map((a) => a.color)));
    const particleCount = 120;
    const ringRadius = 6;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const yOffset = (Math.random() - 0.5) * 1.5;
      const radius = ringRadius + (Math.random() - 0.5) * 1;

      const geometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 8, 8);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6 + Math.random() * 0.4,
      });

      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(
        Math.cos(angle) * radius,
        yOffset,
        Math.sin(angle) * radius
      );

      this.particleGroup.add(particle);
      this.particles.push({
        mesh: particle,
        angle: angle,
        radius: radius,
        yOffset: yOffset,
        speed: 0.1 + Math.random() * 0.2,
      });
    }
  }

  private clearMolecule(): void {
    this.atoms.forEach((atom) => {
      atom.group.remove(atom.mesh);
      atom.mesh.geometry.dispose();
      (atom.mesh.material as THREE.Material).dispose();
    });
    this.atoms.clear();

    this.bonds.forEach((bond) => {
      if (bond.mesh instanceof THREE.Group) {
        bond.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
      }
      this.moleculeGroup.remove(bond.mesh);
    });
    this.bonds = [];

    while (this.moleculeGroup.children.length > 0) {
      this.moleculeGroup.remove(this.moleculeGroup.children[0]);
    }

    this.particles.forEach((p) => {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particleGroup.clear();
    this.particles = [];

    this.currentMolecule = null;
    this.selectedAtomId = null;
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  public setBondOpacity(opacity: number): void {
    this.bondOpacity = opacity;
    this.bonds.forEach((bond) => {
      bond.originalOpacity = opacity;
      if (bond.mesh instanceof THREE.Group) {
        bond.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshPhongMaterial;
            material.opacity = opacity;
            material.emissiveIntensity = 0.3 * opacity;
          }
        });
      }
    });
  }

  public setAtomScale(scale: number): void {
    this.atomScale = scale;
    this.atoms.forEach((atom) => {
      atom.startScale = atom.mesh.scale.x;
      atom.targetScale = scale;
      atom.scaleAnimTime = 0;
      atom.scaleAnimDuration = 0.2;
    });
  }

  public toggleDecompose(): void {
    if (this.decomposeState === 'idle' || this.decomposeState === 'restoring') {
      this.startDecompose();
    } else if (this.decomposeState === 'decomposed' || this.decomposeState === 'decomposing') {
      this.startRestore();
    }
  }

  private startDecompose(): void {
    this.decomposeState = 'decomposing';
    this.decomposeTime = 0;
    this.emit('decompose-state-changed', { state: 'decomposing' });
  }

  private startRestore(): void {
    this.decomposeState = 'restoring';
    this.decomposeTime = 0;
    this.draggingGroup = null;

    this.atomGroups.forEach((group) => {
      if (group.boundingBox) {
        group.boundingBox.visible = false;
      }
    });

    this.emit('decompose-state-changed', { state: 'restoring' });
  }

  private updateDecompose(deltaTime: number): void {
    if (this.decomposeState === 'idle' || this.decomposeState === 'decomposed') {
      return;
    }

    this.decomposeTime += deltaTime;
    const progress = Math.min(this.decomposeTime / this.decomposeDuration, 1);
    const easedProgress = this.easeInOutCubic(progress);

    if (this.decomposeState === 'decomposing') {
      this.atomGroups.forEach((group) => {
        const startPos = group.originalPosition.clone();
        const endPos = group.targetPosition.clone();
        group.group.position.lerpVectors(startPos, endPos, easedProgress);
      });

      this.bonds.forEach((bond) => {
        if (bond.mesh instanceof THREE.Group) {
          bond.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const material = child.material as THREE.MeshPhongMaterial;
              material.opacity = bond.originalOpacity * (1 - easedProgress * 0.8);
            }
          });
        }
      });

      if (progress >= 1) {
        this.decomposeState = 'decomposed';
        this.emit('decompose-state-changed', { state: 'decomposed' });
      }
    } else if (this.decomposeState === 'restoring') {
      const elasticProgress = this.elasticOut(progress);

      this.atomGroups.forEach((group) => {
        const startPos = group.group.position.clone();
        const endPos = group.originalPosition.clone();
        group.group.position.lerpVectors(startPos, endPos, elasticProgress);
      });

      this.bonds.forEach((bond) => {
        if (bond.mesh instanceof THREE.Group) {
          bond.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const material = child.material as THREE.MeshPhongMaterial;
              const currentOpacity = material.opacity;
              material.opacity = currentOpacity + (bond.originalOpacity - currentOpacity) * elasticProgress;
            }
          });
        }
      });

      if (progress >= 1) {
        this.decomposeState = 'idle';
        this.emit('decompose-state-changed', { state: 'idle' });
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private elasticOut(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = 1 / 60;

    if (!this.isDragging && this.autoRotate) {
      this.moleculeGroup.rotation.y += 0.005 * this.rotationSpeed;
    }

    if (!this.isDragging && (this.rotationVelocity.x !== 0 || this.rotationVelocity.y !== 0)) {
      this.moleculeGroup.rotation.y += this.rotationVelocity.x;
      this.moleculeGroup.rotation.x += this.rotationVelocity.y;

      this.rotationVelocity.x *= this.damping;
      this.rotationVelocity.y *= this.damping;

      if (Math.abs(this.rotationVelocity.x) < 0.0001) this.rotationVelocity.x = 0;
      if (Math.abs(this.rotationVelocity.y) < 0.0001) this.rotationVelocity.y = 0;
    }

    if (this.isAnimating) {
      const elapsed = (performance.now() - this.animationStartTime) / 1000;
      const delayStep = 0.05;

      let allDone = true;

      this.atoms.forEach((atom, id) => {
        const index = parseInt(id.replace(/\D/g, '')) || 0;
        const delay = index * delayStep;

        if (elapsed >= delay) {
          const localElapsed = Math.min((elapsed - delay) / 0.4, 1);
          const scale = this.elasticOut(localElapsed) * this.atomScale;
          atom.mesh.scale.set(scale, scale, scale);
          if (localElapsed < 1) allDone = false;
        } else {
          allDone = false;
        }
      });

      if (elapsed > 0.3) {
        this.bonds.forEach((bond, index) => {
          const delay = 0.3 + index * 0.03;
          if (elapsed >= delay) {
            const localElapsed = Math.min((elapsed - delay) / 0.6, 1);
            const scaleY = localElapsed;

            if (bond.mesh instanceof THREE.Group) {
              bond.mesh.children.forEach((child) => {
                if (child instanceof THREE.Mesh) {
                  child.scale.y = scaleY;
                }
              });
            }
          }
        });
      }

      if (allDone && elapsed > this.animationDuration) {
        this.isAnimating = false;
      }
    }

    this.atoms.forEach((atom) => {
      if (atom.scaleAnimTime < atom.scaleAnimDuration) {
        atom.scaleAnimTime += deltaTime;
        const t = Math.min(atom.scaleAnimTime / atom.scaleAnimDuration, 1);
        const easedT = this.easeInOutCubic(t);
        const scale = atom.startScale + (atom.targetScale - atom.startScale) * easedT;
        atom.mesh.scale.set(scale, scale, scale);
      }
    });

    if (this.selectedAtomId) {
      const atom = this.atoms.get(this.selectedAtomId);
      if (atom?.highlightMesh) {
        const time = performance.now() / 1000;
        const pulse = 0.8 + Math.sin(time * 3) * 0.2;
        const scale = 1.3 * pulse;
        atom.highlightMesh.scale.set(scale, scale, scale);
        const material = atom.highlightMesh.material as THREE.MeshBasicMaterial;
        material.opacity = 0.4 * pulse;
      }
    }

    this.particles.forEach((particle) => {
      particle.angle += particle.speed * 0.01;
      particle.mesh.position.x = Math.cos(particle.angle) * particle.radius;
      particle.mesh.position.z = Math.sin(particle.angle) * particle.radius;
      particle.mesh.position.y = particle.yOffset + Math.sin(particle.angle * 0.5) * 0.2;
    });

    this.updateDecompose(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  public on(eventType: RendererEventType, callback: (event: RendererEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  private emit(eventType: RendererEventType, data?: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => callback({ type: eventType, data }));
    }
  }

  public getDecomposeState(): DecomposeState {
    return this.decomposeState;
  }

  public dispose(): void {
    this.clearMolecule();
    this.renderer.dispose();
  }
}
