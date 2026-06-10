import * as THREE from 'three';
import { MoleculeFactory, AtomMeshInfo, BondMeshGroup, ELEMENT_SYMBOLS } from './MoleculeFactory';

interface ParticleRing {
  points: THREE.Points;
  startTime: number;
  duration: number;
  center: THREE.Vector3;
  normal: THREE.Vector3;
  baseRadius: number;
  maxRadius: number;
}

class OrbitControls {
  object: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  target: THREE.Vector3;

  minDistance = 3;
  maxDistance = 15;

  enableDamping = true;
  dampingFactor = 0.08;

  rotateSpeed = 0.005;
  zoomSpeed = 0.001;

  private spherical = new THREE.Spherical();
  private sphericalDelta = new THREE.Spherical();
  private scale = 1;

  private isDragging = false;
  private lastPositionX = 0;
  private lastPositionY = 0;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.object = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3();

    const offset = new THREE.Vector3().subVectors(camera.position, this.target);
    this.spherical.setFromVector3(offset);

    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointerleave', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.style.touchAction = 'none';
  }

  private onPointerDown = (e: PointerEvent) => {
    this.isDragging = true;
    this.lastPositionX = e.clientX;
    this.lastPositionY = e.clientY;
    this.domElement.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastPositionX;
    const deltaY = e.clientY - this.lastPositionY;

    this.lastPositionX = e.clientX;
    this.lastPositionY = e.clientY;

    this.sphericalDelta.theta -= deltaX * this.rotateSpeed;
    this.sphericalDelta.phi -= deltaY * this.rotateSpeed;
  };

  private onPointerUp = (e: PointerEvent) => {
    this.isDragging = false;
    try {
      this.domElement.releasePointerCapture(e.pointerId);
    } catch (_err) { /* ignore */ }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    if (delta > 0) {
      this.scale *= 1 + delta * this.zoomSpeed;
    } else {
      this.scale /= 1 + (-delta) * this.zoomSpeed;
    }
    this.scale = Math.max(0.5, Math.min(3, this.scale));
  };

  update() {
    const offset = new THREE.Vector3().subVectors(this.object.position, this.target);
    this.spherical.setFromVector3(offset);

    this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
    this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
    this.spherical.phi = Math.max(0.001, Math.min(Math.PI - 0.001, this.spherical.phi));

    const targetRadius = 5 / this.scale;
    this.spherical.radius += (targetRadius - this.spherical.radius) * 0.1;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    if (this.enableDamping) {
      this.sphericalDelta.theta *= (1 - this.dampingFactor);
      this.sphericalDelta.phi *= (1 - this.dampingFactor);
    } else {
      this.sphericalDelta.set(0, 0, 0);
    }

    offset.setFromSpherical(this.spherical);
    this.object.position.copy(this.target).add(offset);
    this.object.lookAt(this.target);
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointerleave', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }
}

class MoleculeViewerApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private factory: MoleculeFactory;
  private currentMolecule: THREE.Group | null = null;
  private currentAtoms: AtomMeshInfo[] = [];
  private currentBonds: BondMeshGroup[] = [];
  private currentMoleculeKey: string = 'water';

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private clock: THREE.Clock;

  private autoRotate: boolean = true;
  private autoRotateSpeed: number = 0.5 * Math.PI / 180;

  private bondAnimations: Map<BondMeshGroup, { startTime: number; duration: number; period: number }> = new Map();
  private particleRings: ParticleRing[] = [];
  private readonly MAX_PARTICLE_RINGS = 3;

  private tooltipEl: HTMLElement;
  private hoveredAtom: THREE.Mesh | null = null;
  private atomIndexCounters: Map<string, number> = new Map();

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;
    this.tooltipEl = document.getElementById('atomTooltip') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a23);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.factory = new MoleculeFactory();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupLights();
    this.setupEventListeners();
    this.loadMolecule('water');
    this.animate();
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(5, 5, 5);
    dir1.castShadow = true;
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x6699ff, 0.3);
    dir2.position.set(-5, -3, -5);
    this.scene.add(dir2);

    const point = new THREE.PointLight(0xff6600, 0.4, 20);
    point.position.set(0, 3, 4);
    this.scene.add(point);
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize);

    document.querySelectorAll('.molecule-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const key = target.dataset.molecule;
        if (key) {
          this.loadMolecule(key);
          document.querySelectorAll('.molecule-btn').forEach((b) => b.classList.remove('active'));
          target.classList.add('active');
        }
      });
    });

    const toggle = document.getElementById('autoRotateToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        this.autoRotate = !this.autoRotate;
        if (this.autoRotate) {
          toggle.classList.add('on');
        } else {
          toggle.classList.remove('on');
        }
      });
    }

    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('click', this.onClick);
  }

  private onWindowResize = () => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private clearCurrentMolecule() {
    if (this.currentMolecule) {
      this.scene.remove(this.currentMolecule);
      this.currentMolecule.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry && obj.geometry !== this.factory['atomGeometry']) {
            obj.geometry.dispose();
          }
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
      this.currentMolecule = null;
    }
    this.currentAtoms = [];
    this.currentBonds = [];
    this.bondAnimations.clear();
  }

  private loadMolecule(key: string) {
    this.clearCurrentMolecule();
    this.currentMoleculeKey = key;

    const result = this.factory.buildMolecule(key);
    if (!result) return;

    this.currentMolecule = result.group;
    this.currentAtoms = result.atoms;
    this.currentBonds = result.bonds;
    this.scene.add(this.currentMolecule);

    this.atomIndexCounters.clear();
    this.currentAtoms.forEach((info) => {
      const sym = ELEMENT_SYMBOLS[info.element];
      const count = (this.atomIndexCounters.get(sym) || 0) + 1;
      this.atomIndexCounters.set(sym, count);
      (info.mesh.userData as any).displayIndex = count;
    });
  }

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const atomMeshes = this.currentAtoms.map((a) => a.mesh);
    const intersects = this.raycaster.intersectObjects(atomMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      if (this.hoveredAtom !== hitMesh) {
        this.restoreAtom(this.hoveredAtom);
        this.hoveredAtom = hitMesh;
        this.highlightAtom(hitMesh);
      }
      this.showTooltip(e.clientX, e.clientY, hitMesh);
    } else {
      if (this.hoveredAtom) {
        this.restoreAtom(this.hoveredAtom);
        this.hoveredAtom = null;
      }
      this.hideTooltip();
    }
  };

  private highlightAtom(mesh: THREE.Mesh) {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const userData = mesh.userData as any;
    userData.highlighted = true;
    mat.emissiveIntensity = 0.5;
    const origScale = userData.originalScale;
    mesh.scale.setScalar(origScale * 1.3);
  }

  private restoreAtom(mesh: THREE.Mesh | null) {
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const userData = mesh.userData as any;
    userData.highlighted = false;
    mat.emissiveIntensity = userData.originalEmissiveIntensity || 0.05;
    const origScale = userData.originalScale;
    mesh.scale.setScalar(origScale);
  }

  private showTooltip(clientX: number, clientY: number, mesh: THREE.Mesh) {
    const userData = mesh.userData as any;
    const sym = ELEMENT_SYMBOLS[userData.element as keyof typeof ELEMENT_SYMBOLS];
    const idx = userData.displayIndex || (userData.index + 1);
    this.tooltipEl.textContent = `${sym}-${idx}`;

    const app = document.getElementById('app') as HTMLElement;
    const rect = app.getBoundingClientRect();
    this.tooltipEl.style.left = `${clientX - rect.left}px`;
    this.tooltipEl.style.top = `${clientY - rect.top}px`;
    this.tooltipEl.classList.add('visible');
  }

  private hideTooltip() {
    this.tooltipEl.classList.remove('visible');
  }

  private onClick = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const allBondMeshes: THREE.Mesh[] = [];
    this.currentBonds.forEach((bg) => bg.meshes.forEach((m) => allBondMeshes.push(m)));

    const intersects = this.raycaster.intersectObjects(allBondMeshes, false);
    if (intersects.length === 0) return;

    const hitMesh = intersects[0].object as THREE.Mesh;
    const bondGroup = this.findBondGroup(hitMesh);
    if (bondGroup && !this.bondAnimations.has(bondGroup)) {
      this.startBondAnimation(bondGroup);
    }
  };

  private findBondGroup(mesh: THREE.Mesh): BondMeshGroup | null {
    for (const bg of this.currentBonds) {
      if (bg.meshes.includes(mesh)) return bg;
    }
    return null;
  }

  private startBondAnimation(bondGroup: BondMeshGroup) {
    const now = performance.now();
    this.bondAnimations.set(bondGroup, {
      startTime: now,
      duration: 5000,
      period: 2000
    });

    if (this.particleRings.length >= this.MAX_PARTICLE_RINGS) {
      const oldest = this.particleRings.shift();
      if (oldest) {
        this.scene.remove(oldest.points);
        oldest.points.geometry.dispose();
        (oldest.points.material as THREE.Material).dispose();
      }
    }

    const ring = this.createParticleRing(bondGroup);
    this.particleRings.push(ring);
    this.scene.add(ring.points);
  }

  private createParticleRing(bondGroup: BondMeshGroup): ParticleRing {
    const particleCount = 20;
    const baseRadius = 0.15;
    const maxRadius = 0.6;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const normal = bondGroup.direction.clone().normalize();
    const up = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tangent1 = new THREE.Vector3().crossVectors(normal, up).normalize();
    const tangent2 = new THREE.Vector3().crossVectors(normal, tangent1).normalize();

    const center = bondGroup.midpoint.clone();

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      const pos = center.clone()
        .add(tangent1.clone().multiplyScalar(x * baseRadius))
        .add(tangent2.clone().multiplyScalar(y * baseRadius));
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      colors[i * 3] = 0.4;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);

    return {
      points,
      startTime: performance.now(),
      duration: 2000,
      center: center.clone(),
      normal: normal.clone(),
      baseRadius,
      maxRadius
    };
  }

  private updateBondAnimations() {
    const now = performance.now();
    const toRemove: BondMeshGroup[] = [];

    this.bondAnimations.forEach((config, bondGroup) => {
      const elapsed = now - config.startTime;
      if (elapsed >= config.duration) {
        toRemove.push(bondGroup);
        bondGroup.meshes.forEach((m) => {
          const ud = m.userData as any;
          m.scale.y = ud.originalScaleY || 1;
          m.position.copy(ud.originalPosition);
        });
        return;
      }

      const t = (elapsed % config.period) / config.period;
      const amplitude = bondGroup.originalLength * 0.3;
      const stretch = Math.sin(t * Math.PI * 2) * amplitude;

      bondGroup.meshes.forEach((m) => {
        const ud = m.userData as any;
        const originalLength = ud.originalLength;
        const newLength = originalLength + stretch;
        m.scale.y = newLength / originalLength;

        const start = new THREE.Vector3(ud.start.x, ud.start.y, ud.start.z);
        const end = new THREE.Vector3(ud.end.x, ud.end.y, ud.end.z);
        const dir = new THREE.Vector3().subVectors(end, start).normalize();
        const stretchedEnd = start.clone().add(dir.clone().multiplyScalar(newLength));
        const midpoint = new THREE.Vector3().addVectors(start, stretchedEnd).multiplyScalar(0.5);
        m.position.copy(midpoint);
      });
    });

    toRemove.forEach((bg) => this.bondAnimations.delete(bg));
  }

  private updateParticleRings() {
    const now = performance.now();
    const toRemove: number[] = [];

    const up = new THREE.Vector3(0, 1, 0);

    this.particleRings.forEach((ring, idx) => {
      const elapsed = now - ring.startTime;
      const progress = elapsed / ring.duration;

      if (progress >= 1) {
        toRemove.push(idx);
        return;
      }

      const currentRadius = ring.baseRadius + (ring.maxRadius - ring.baseRadius) * progress;
      const opacity = 1 - progress;

      const mat = ring.points.material as THREE.PointsMaterial;
      mat.opacity = opacity * 0.9;

      const tangent1 = new THREE.Vector3().crossVectors(ring.normal, up);
      if (tangent1.lengthSq() < 0.01) tangent1.set(1, 0, 0);
      tangent1.normalize();
      const tangent2 = new THREE.Vector3().crossVectors(ring.normal, tangent1).normalize();

      const positions = ring.points.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        const pos = ring.center.clone()
          .add(tangent1.clone().multiplyScalar(x * currentRadius))
          .add(tangent2.clone().multiplyScalar(y * currentRadius));
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      }
      ring.points.geometry.attributes.position.needsUpdate = true;
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const ring = this.particleRings[idx];
      this.scene.remove(ring.points);
      ring.points.geometry.dispose();
      (ring.points.material as THREE.Material).dispose();
      this.particleRings.splice(idx, 1);
    }
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.clock.getDelta();

    if (this.currentMolecule && this.autoRotate) {
      this.currentMolecule.rotation.y += this.autoRotateSpeed;
    }

    this.updateBondAnimations();
    this.updateParticleRings();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('click', this.onClick);
    this.controls.dispose();
    this.factory.dispose();
    this.renderer.dispose();
  }
}

new MoleculeViewerApp();
