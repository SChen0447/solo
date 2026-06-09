import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlanetState, SimulationConfig, GravityWave } from '../simulation/types';

export class Renderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;

  private container: HTMLElement | null = null;
  private starMesh: THREE.Mesh | null = null;
  private starLight: THREE.PointLight | null = null;
  private planetMeshes: Map<number, THREE.Mesh> = new Map();
  private orbitLines: Map<number, THREE.Line> = new Map();
  private velocityArrows: Map<number, THREE.ArrowHelper> = new Map();
  private selectionHalos: Map<number, THREE.Mesh> = new Map();
  private fieldLineGroup: THREE.Group | null = null;
  private starField: THREE.Points | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private gravityWaveMeshes: Map<number, THREE.Mesh> = new Map();
  private gravityWaveCounter = 0;

  private onPlanetClickCallback: ((id: number) => void) | null = null;
  private onPlanetDragStartCallback: ((id: number) => void) | null = null;
  private onPlanetDragMoveCallback: ((id: number, pos: THREE.Vector3) => void) | null = null;
  private onPlanetDragEndCallback: ((id: number) => void) | null = null;

  private draggingPlanetId: number | null = null;
  private isMouseDown = false;
  private dragPlane: THREE.Plane = new THREE.Plane();

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;
  }

  init(container: HTMLElement): void {
    this.container = container;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 30, 50);
    this.camera.lookAt(0, 0, 0);

    this.createStar();
    this.createStarField();
    this.createGrid();
    this.setupLights();
    this.setupEventListeners();
    this.onResize();
  }

  private createStar(): void {
    const geometry = new THREE.SphereGeometry(1.5, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0xFFF176,
      emissive: 0xFFF176,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.1
    });
    this.starMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.starMesh);

    this.starLight = new THREE.PointLight(0xFFF176, 2, 200, 0.5);
    this.starLight.position.set(0, 0, 0);
    this.scene.add(this.starLight);
  }

  private createStarField(): void {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.05 + Math.random() * 0.15;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private createGrid(): void {
    this.gridHelper = new THREE.GridHelper(100, 50, 0x1a1a4e, 0x1a1a4e);
    this.gridHelper.position.y = -0.1;
    this.scene.add(this.gridHelper);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.4);
    this.scene.add(ambientLight);
  }

  createPlanets(planets: PlanetState[]): void {
    for (const planet of planets) {
      const geometry = new THREE.SphereGeometry(planet.radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(planet.color),
        roughness: 0.7,
        metalness: 0.2
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(planet.position);
      mesh.userData.planetId = planet.id;
      this.scene.add(mesh);
      this.planetMeshes.set(planet.id, mesh);

      const orbitGeometry = new THREE.BufferGeometry();
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(planet.color),
        transparent: true,
        opacity: 0.6
      });
      const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
      this.scene.add(orbitLine);
      this.orbitLines.set(planet.id, orbitLine);

      const arrowDir = new THREE.Vector3(1, 0, 0);
      const velocityArrow = new THREE.ArrowHelper(
        arrowDir,
        planet.position.clone(),
        1,
        0x76FF03,
        0.8,
        0.4
      );
      this.scene.add(velocityArrow);
      this.velocityArrows.set(planet.id, velocityArrow);

      const haloGeometry = new THREE.RingGeometry(planet.radius * 1.2, planet.radius * 1.5, 32);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.position.copy(planet.position);
      this.scene.add(halo);
      this.selectionHalos.set(planet.id, halo);
    }

    this.createFieldLines();
  }

  private createFieldLines(): void {
    if (this.fieldLineGroup) {
      this.scene.remove(this.fieldLineGroup);
    }
    this.fieldLineGroup = new THREE.Group();
    const density = 30;
    const maxDist = 35;

    for (let i = 0; i < density; i++) {
      const phi = Math.acos(1 - 2 * ((i + 0.5) / density));
      for (let j = 0; j < density / 3; j++) {
        const theta = (j / (density / 3)) * Math.PI * 2;
        const points: THREE.Vector3[] = [];
        const steps = 20;

        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const r = 1.5 + t * (maxDist - 1.5);
          const wobble = Math.sin(t * Math.PI * 3) * 0.5 * (1 - t);

          const x = r * Math.sin(phi + wobble) * Math.cos(theta);
          const y = r * Math.sin(phi + wobble) * Math.sin(theta) * 0.7;
          const z = r * Math.cos(phi + wobble);
          points.push(new THREE.Vector3(x, y, z));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: 0x00BCD4,
          transparent: true,
          opacity: 0.3
        });
        const line = new THREE.Line(geometry, material);
        this.fieldLineGroup.add(line);
      }
    }
    this.scene.add(this.fieldLineGroup);
  }

  updatePlanets(planets: PlanetState[]): void {
    const orbitPointCount = 200;

    for (const planet of planets) {
      const mesh = this.planetMeshes.get(planet.id);
      if (mesh) {
        mesh.position.copy(planet.position);
        mesh.scale.setScalar(planet.radius / mesh.geometry.parameters.radius);
        (mesh.material as THREE.MeshStandardMaterial).color.set(planet.color);
      }

      const orbitLine = this.orbitLines.get(planet.id);
      if (orbitLine) {
        const points: THREE.Vector3[] = [];
        const a = planet.orbitRadius;
        const e = Math.min(planet.eccentricity, 0.95);
        const b = a * Math.sqrt(1 - e * e);
        const inclination = planet.inclination;

        for (let i = 0; i <= orbitPointCount; i++) {
          const theta = (i / orbitPointCount) * Math.PI * 2;
          const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
          const x = r * Math.cos(theta);
          const z = r * Math.sin(theta) * Math.cos(inclination);
          const y = r * Math.sin(theta) * Math.sin(inclination);
          points.push(new THREE.Vector3(x, y, z));
        }
        orbitLine.geometry.dispose();
        orbitLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
      }

      const arrow = this.velocityArrows.get(planet.id);
      if (arrow) {
        const speed = planet.velocity.length();
        if (speed > 0.001) {
          const dir = planet.velocity.clone().normalize();
          arrow.position.copy(planet.position);
          arrow.setDirection(dir);
          arrow.setLength(speed * 0.5, 0.8, 0.4);
        }
      }

      const halo = this.selectionHalos.get(planet.id);
      if (halo) {
        halo.position.copy(planet.position);
        halo.lookAt(this.camera.position);
      }
    }

    this.updateStarField();
  }

  private updateStarField(): void {
    if (!this.starField) return;
    const time = performance.now() / 1000;
    const phases = this.starField.geometry.getAttribute('phase') as THREE.BufferAttribute;
    const sizes = this.starField.geometry.getAttribute('size') as THREE.BufferAttribute;
    const baseSizes = this.starField.geometry.userData.baseSizes as Float32Array;

    if (!baseSizes) {
      this.starField.geometry.userData.baseSizes = new Float32Array(sizes.array);
      return;
    }

    for (let i = 0; i < phases.count; i++) {
      const twinkle = 0.6 + 0.4 * Math.sin(time * 2 + phases.array[i]);
      sizes.array[i] = baseSizes[i] * twinkle;
    }
    sizes.needsUpdate = true;
  }

  updateVisibility(config: SimulationConfig): void {
    for (const [, line] of this.orbitLines) {
      line.visible = config.showOrbits;
    }
    for (const [, arrow] of this.velocityArrows) {
      arrow.visible = config.showVelocity;
    }
    if (this.fieldLineGroup) {
      this.fieldLineGroup.visible = config.showFieldLines;
    }
    if (this.gridHelper) {
      this.gridHelper.visible = config.showGrid;
    }
  }

  updateGravityWaves(waves: GravityWave[]): void {
    const now = performance.now() / 1000;
    const activeIds = new Set<number>();

    for (const wave of waves) {
      const elapsed = now - wave.startTime;
      const progress = Math.min(elapsed / wave.duration, 1);
      const id = Math.floor(wave.startTime * 1000);
      activeIds.add(id);

      let mesh = this.gravityWaveMeshes.get(id);
      if (!mesh) {
        const geometry = new THREE.RingGeometry(0.2, 0.3, 64);
        const material = new THREE.MeshBasicMaterial({
          color: 0x00BCD4,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(wave.position);
        this.scene.add(mesh);
        this.gravityWaveMeshes.set(id, mesh);
      }

      const currentRadius = 0.2 + progress * (wave.maxRadius - 0.2);
      const thickness = 0.3 * (1 - progress);
      mesh.geometry.dispose();
      mesh.geometry = new THREE.RingGeometry(
        Math.max(0.01, currentRadius - thickness),
        currentRadius,
        64
      );
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - progress);
      mesh.lookAt(this.camera.position);
    }

    for (const [id, mesh] of this.gravityWaveMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.gravityWaveMeshes.delete(id);
      }
    }
  }

  playSelectionPulse(planetId: number): void {
    const halo = this.selectionHalos.get(planetId);
    if (!halo) return;

    const material = halo.material as THREE.MeshBasicMaterial;
    const startScale = halo.scale.x;
    const startTime = performance.now();
    const duration = 300;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const scale = startScale + ease * 0.5;
      halo.scale.setScalar(scale);
      material.opacity = 0.8 * (1 - ease);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        material.opacity = 0;
        halo.scale.setScalar(1);
      }
    };
    animate();
  }

  playGravityWave(position: THREE.Vector3): void {
    const geometry = new THREE.RingGeometry(0.2, 0.3, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00BCD4,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);

    const id = this.gravityWaveCounter++;
    this.gravityWaveMeshes.set(id, mesh);

    const startTime = performance.now();
    const duration = 1500;
    const maxRadius = 5;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const currentRadius = 0.2 + t * (maxRadius - 0.2);
      const thickness = 0.3 * (1 - t);

      mesh.geometry.dispose();
      mesh.geometry = new THREE.RingGeometry(
        Math.max(0.01, currentRadius - thickness),
        currentRadius,
        64
      );
      material.opacity = 0.8 * (1 - t);
      mesh.lookAt(this.camera.position);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        material.dispose();
        this.gravityWaveMeshes.delete(id);
      }
    };
    animate();
  }

  onPlanetClick(callback: (id: number) => void): void {
    this.onPlanetClickCallback = callback;
  }

  onPlanetDragStart(callback: (id: number) => void): void {
    this.onPlanetDragStartCallback = callback;
  }

  onPlanetDragMove(callback: (id: number, pos: THREE.Vector3) => void): void {
    this.onPlanetDragMoveCallback = callback;
  }

  onPlanetDragEnd(callback: (id: number) => void): void {
    this.onPlanetDragEndCallback = callback;
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.updateMouse(e);
      const hit = this.raycastPlanet();
      if (hit !== null) {
        this.draggingPlanetId = hit;
        this.controls.enabled = false;
        const planet = this.planetMeshes.get(hit);
        if (planet) {
          this.dragPlane.setFromNormalAndCoplanarPoint(
            this.camera.getWorldDirection(new THREE.Vector3()).negate(),
            planet.position
          );
        }
        if (this.onPlanetDragStartCallback) {
          this.onPlanetDragStartCallback(hit);
        }
      }
    });

    dom.addEventListener('mousemove', (e) => {
      this.updateMouse(e);
      if (this.draggingPlanetId !== null && this.onPlanetDragMoveCallback) {
        const intersectPoint = new THREE.Vector3();
        this.raycaster.setFromCamera(this.mouse, this.camera);
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        this.onPlanetDragMoveCallback(this.draggingPlanetId, intersectPoint);
      }
    });

    dom.addEventListener('mouseup', () => {
      if (this.draggingPlanetId !== null) {
        if (this.onPlanetDragEndCallback) {
          this.onPlanetDragEndCallback(this.draggingPlanetId);
        }
        this.draggingPlanetId = null;
      } else if (this.isMouseDown) {
        const hit = this.raycastPlanet();
        if (hit !== null && this.onPlanetClickCallback) {
          this.onPlanetClickCallback(hit);
        }
      }
      this.isMouseDown = false;
      this.controls.enabled = true;
    });

    dom.addEventListener('mouseleave', () => {
      if (this.draggingPlanetId !== null && this.onPlanetDragEndCallback) {
        this.onPlanetDragEndCallback(this.draggingPlanetId);
      }
      this.draggingPlanetId = null;
      this.isMouseDown = false;
      this.controls.enabled = true;
    });

    window.addEventListener('resize', () => this.onResize());
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastPlanet(): number | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.planetMeshes.values());
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      return hits[0].object.userData.planetId as number;
    }
    return null;
  }

  onResize(): void {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
