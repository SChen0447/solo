import * as THREE from 'three';
import type { ElementType, FusionResultType } from './ElementSystem';
import { ElementSystem } from './ElementSystem';

interface CrystalData {
  type: ElementType;
  mesh: THREE.Mesh;
  homePosition: THREE.Vector3;
  isDragging: boolean;
  isInCircle: boolean;
  pulsePhase: number;
}

interface ParticleSystem {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  lifetimes: number[];
  maxLifetimes: number[];
  type: string;
}

export type FusionCompleteCallback = (elements: ElementType[]) => void;
export type ElementsChangedCallback = (elements: ElementType[]) => void;

export class MagicCircle {
  public group: THREE.Group;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private circleRadius: number = 120;
  private crystalRadius: number = 20;
  private crystalDistance: number = 190;

  private crystals: CrystalData[] = [];
  private circle: THREE.Mesh | null = null;
  private circleBorder: THREE.Mesh | null = null;
  private circleInner: THREE.Mesh | null = null;

  private dragTrailParticles: ParticleSystem | null = null;
  private fusionParticles: ParticleSystem[] = [];

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private draggedCrystal: CrystalData | null = null;
  private dragOffset: THREE.Vector3 = new THREE.Vector3();

  private borderColors: THREE.Color[] = [
    new THREE.Color(0x6b4eff),
    new THREE.Color(0xff69b4)
  ];
  private borderColorPhase: number = 0;

  private fusionAnimationTime: number = 0;
  private isFusionPlaying: boolean = false;
  private fusionResultTimer: number = 0;

  private onFusionComplete: FusionCompleteCallback | null = null;
  private onElementsChanged: ElementsChangedCallback | null = null;

  private circlePlane: THREE.Plane;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.group = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.circlePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    this.createMagicCircle();
    this.createCrystals();
    this.createDragTrailSystem();

    this.setupEventListeners();
  }

  private createMagicCircle(): void {
    const circleGeo = new THREE.RingGeometry(this.circleRadius - 4, this.circleRadius, 128);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0x6b4eff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.circle = new THREE.Mesh(circleGeo, circleMat);
    this.group.add(this.circle);

    const borderGeo = new THREE.RingGeometry(this.circleRadius - 1, this.circleRadius + 2, 128);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0x6b4eff,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.circleBorder = new THREE.Mesh(borderGeo, borderMat);
    this.group.add(this.circleBorder);

    const innerGeo = new THREE.CircleGeometry(this.circleRadius - 8, 64);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a3a,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.circleInner = new THREE.Mesh(innerGeo, innerMat);
    this.group.add(this.circleInner);

    const runeCount = 8;
    for (let i = 0; i < runeCount; i++) {
      const angle = (i / runeCount) * Math.PI * 2;
      const runeGeo = new THREE.CircleGeometry(5, 8);
      const runeMat = new THREE.MeshBasicMaterial({
        color: 0x6b4eff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.set(
        Math.cos(angle) * (this.circleRadius - 20),
        Math.sin(angle) * (this.circleRadius - 20),
        1
      );
      this.group.add(rune);
    }
  }

  private createCrystalMaterial(type: ElementType): THREE.ShaderMaterial {
    const info = ElementSystem.getElementInfo(type);
    const color = new THREE.Color(info.color);

    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        vec3 color = mix(uColor1, uColor2, (vPosition.y + 1.0) * 0.5);
        color += intensity * 0.5;
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const color2 = color.clone().multiplyScalar(0.6);
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor1: { value: color },
        uColor2: { value: color2 },
        uTime: { value: 0 }
      },
      transparent: true
    });
  }

  private createCrystals(): void {
    const elementTypes: ElementType[] = ['fire', 'water', 'wind', 'earth'];
    const positions = [
      new THREE.Vector3(-this.crystalDistance, this.crystalDistance, 5),
      new THREE.Vector3(this.crystalDistance, this.crystalDistance, 5),
      new THREE.Vector3(-this.crystalDistance, -this.crystalDistance, 5),
      new THREE.Vector3(this.crystalDistance, -this.crystalDistance, 5)
    ];

    elementTypes.forEach((type, i) => {
      const geometry = new THREE.SphereGeometry(this.crystalRadius, 32, 32);
      const material = this.createCrystalMaterial(type);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(positions[i]);
      mesh.userData = { elementType: type, isCrystal: true };

      const glowGeo = new THREE.SphereGeometry(this.crystalRadius * 1.3, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: ElementSystem.getElementInfo(type).color,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      mesh.add(glow);

      this.group.add(mesh);

      this.crystals.push({
        type,
        mesh,
        homePosition: positions[i].clone(),
        isDragging: false,
        isInCircle: false,
        pulsePhase: Math.random() * Math.PI * 2
      });
    });
  }

  private createDragTrailSystem(): void {
    const maxParticles = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    this.group.add(points);

    this.dragTrailParticles = {
      points,
      velocities: new Array(maxParticles).fill(null).map(() => new THREE.Vector3()),
      lifetimes: new Array(maxParticles).fill(0),
      maxLifetimes: new Array(maxParticles).fill(0),
      type: 'trail'
    };
  }

  private emitTrailParticle(position: THREE.Vector3, elementType: ElementType): void {
    if (!this.dragTrailParticles) return;

    const system = this.dragTrailParticles;
    const positions = system.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = system.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizes = system.points.geometry.getAttribute('size') as THREE.BufferAttribute;

    let index = -1;
    for (let i = 0; i < system.lifetimes.length; i++) {
      if (system.lifetimes[i] <= 0) {
        index = i;
        break;
      }
    }
    if (index === -1) return;

    const info = ElementSystem.getElementInfo(elementType);
    const color = new THREE.Color(info.color);

    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 5
    );

    positions.array[index * 3] = position.x + offset.x;
    positions.array[index * 3 + 1] = position.y + offset.y;
    positions.array[index * 3 + 2] = position.z + offset.z;

    colors.array[index * 3] = color.r;
    colors.array[index * 3 + 1] = color.g;
    colors.array[index * 3 + 2] = color.b;

    sizes.array[index] = 3 + Math.random() * 4;

    system.velocities[index].set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 10
    );

    system.lifetimes[index] = 0.8;
    system.maxLifetimes[index] = 0.8;

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
  }

  private createFusionParticles(resultType: FusionResultType): void {
    const maxParticles = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    this.group.add(points);

    const system: ParticleSystem = {
      points,
      velocities: new Array(maxParticles).fill(null).map(() => new THREE.Vector3()),
      lifetimes: new Array(maxParticles).fill(0),
      maxLifetimes: new Array(maxParticles).fill(0),
      type: resultType
    };

    this.fusionParticles.push(system);
    this.emitFusionBurst(system, resultType);
  }

  private emitFusionBurst(system: ParticleSystem, resultType: FusionResultType): void {
    const positions = system.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = system.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizes = system.points.geometry.getAttribute('size') as THREE.BufferAttribute;

    const colorMap: Record<string, number[]> = {
      steam: [0xffffff, 0xd0d0d0, 0xa0a0a0],
      firestorm: [0xff4500, 0xff8c00, 0xffd700],
      mud: [0x8b4513, 0x654321, 0x3d2817],
      lava: [0xff0000, 0xff4500, 0x8b4513],
      ice: [0x87ceeb, 0xb0e0e6, 0xffffff],
      sand: [0xf4a460, 0xdaa520, 0xcd853f],
      lightning: [0x9400d3, 0x8b5cf6, 0x1e90ff],
      storm: [0x4b0082, 0x8b5cf6, 0x32cd32],
      earth_wind: [0xd2691e, 0xa0522d, 0x32cd32],
      fire_water: [0xff6347, 0x4682b4, 0xd3d3d3]
    };

    const colorHexes = colorMap[resultType] || [0xffffff];

    for (let i = 0; i < 400; i++) {
      let index = -1;
      for (let j = 0; j < system.lifetimes.length; j++) {
        if (system.lifetimes[j] <= 0) {
          index = j;
          break;
        }
      }
      if (index === -1) break;

      const colorHex = colorHexes[Math.floor(Math.random() * colorHexes.length)];
      const color = new THREE.Color(colorHex);

      let pos: THREE.Vector3;
      let vel: THREE.Vector3;
      const lifetime = 1.5 + Math.random() * 0.5;

      switch (resultType) {
        case 'steam':
        case 'fire_water':
          pos = new THREE.Vector3(
            (Math.random() - 0.5) * this.circleRadius * 1.5,
            (Math.random() - 0.5) * this.circleRadius * 0.5,
            10
          );
          vel = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            60 + Math.random() * 40,
            (Math.random() - 0.5) * 10
          );
          break;
        case 'firestorm':
          const fireAngle = Math.random() * Math.PI * 2;
          const fireR = Math.random() * this.circleRadius * 0.8;
          pos = new THREE.Vector3(
            Math.cos(fireAngle) * fireR,
            Math.sin(fireAngle) * fireR,
            10
          );
          vel = new THREE.Vector3(
            -Math.sin(fireAngle) * 80 + (Math.random() - 0.5) * 20,
            Math.cos(fireAngle) * 80 + 30,
            (Math.random() - 0.5) * 15
          );
          break;
        case 'mud':
          pos = new THREE.Vector3(
            (Math.random() - 0.5) * this.circleRadius * 0.6,
            -this.circleRadius * 0.3,
            10
          );
          vel = new THREE.Vector3(
            (Math.random() - 0.5) * 30,
            80 + Math.random() * 60,
            (Math.random() - 0.5) * 10
          );
          break;
        case 'lava':
          pos = new THREE.Vector3(
            (Math.random() - 0.5) * this.circleRadius * 1.2,
            (Math.random() - 0.5) * this.circleRadius * 1.2,
            10
          );
          vel = new THREE.Vector3(
            (Math.random() - 0.5) * 40,
            20 + Math.random() * 30,
            (Math.random() - 0.5) * 20
          );
          break;
        case 'ice':
          pos = new THREE.Vector3(
            (Math.random() - 0.5) * this.circleRadius * 1.5,
            (Math.random() - 0.5) * this.circleRadius * 1.5,
            10
          );
          vel = new THREE.Vector3(
            (Math.random() - 0.5) * 30,
            -20 + Math.random() * 20,
            (Math.random() - 0.5) * 20
          );
          break;
        case 'sand':
        case 'earth_wind':
          const sandAngle = Math.random() * Math.PI * 2;
          pos = new THREE.Vector3(
            Math.cos(sandAngle) * (20 + Math.random() * 20),
            Math.sin(sandAngle) * (20 + Math.random() * 20),
            10
          );
          vel = new THREE.Vector3(
            Math.cos(sandAngle) * (40 + Math.random() * 30),
            Math.sin(sandAngle) * (40 + Math.random() * 30) + 10,
            (Math.random() - 0.5) * 20
          );
          break;
        case 'lightning':
          pos = new THREE.Vector3(
            (Math.random() - 0.5) * this.circleRadius,
            (Math.random() - 0.5) * this.circleRadius,
            10
          );
          vel = new THREE.Vector3(
            (Math.random() - 0.5) * 120,
            (Math.random() - 0.5) * 120,
            (Math.random() - 0.5) * 50
          );
          system.lifetimes[index] = 0.15 + Math.random() * 0.2;
          system.maxLifetimes[index] = 0.2;
          break;
        case 'storm':
          const stormAngle = Math.random() * Math.PI * 2;
          pos = new THREE.Vector3(
            Math.cos(stormAngle) * (30 + Math.random() * 60),
            Math.sin(stormAngle) * (30 + Math.random() * 60),
            10
          );
          vel = new THREE.Vector3(
            -Math.sin(stormAngle) * 100,
            Math.cos(stormAngle) * 100 + 20,
            (Math.random() - 0.5) * 30
          );
          break;
        default:
          pos = new THREE.Vector3(
            (Math.random() - 0.5) * this.circleRadius,
            (Math.random() - 0.5) * this.circleRadius,
            10
          );
          vel = new THREE.Vector3(
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 30
          );
      }

      positions.array[index * 3] = pos.x;
      positions.array[index * 3 + 1] = pos.y;
      positions.array[index * 3 + 2] = pos.z;

      colors.array[index * 3] = color.r;
      colors.array[index * 3 + 1] = color.g;
      colors.array[index * 3 + 2] = color.b;

      sizes.array[index] = 4 + Math.random() * 6;

      system.velocities[index].copy(vel);
      if (resultType !== 'lightning') {
        system.lifetimes[index] = lifetime;
        system.maxLifetimes[index] = lifetime;
      }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
  }

  private updateParticleSystem(system: ParticleSystem, delta: number): boolean {
    const positions = system.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const sizes = system.points.geometry.getAttribute('size') as THREE.BufferAttribute;
    const material = system.points.material as THREE.PointsMaterial;

    let hasActiveParticles = false;

    for (let i = 0; i < system.lifetimes.length; i++) {
      if (system.lifetimes[i] > 0) {
        hasActiveParticles = true;
        system.lifetimes[i] -= delta;

        const alpha = Math.max(0, system.lifetimes[i] / system.maxLifetimes[i]);

        positions.array[i * 3] += system.velocities[i].x * delta;
        positions.array[i * 3 + 1] += system.velocities[i].y * delta;
        positions.array[i * 3 + 2] += system.velocities[i].z * delta;

        if (system.type === 'steam' || system.type === 'fire_water') {
          system.velocities[i].y -= 5 * delta;
          system.velocities[i].multiplyScalar(1 - delta * 0.5);
        } else if (system.type === 'mud' || system.type === 'lava') {
          system.velocities[i].y -= 40 * delta;
        } else if (system.type === 'lightning') {
          positions.array[i * 3] += (Math.random() - 0.5) * 100 * delta;
          positions.array[i * 3 + 1] += (Math.random() - 0.5) * 100 * delta;
        } else if (system.type === 'firestorm' || system.type === 'storm') {
        } else {
          system.velocities[i].multiplyScalar(1 - delta);
        }

        sizes.array[i] = Math.max(0.1, sizes.array[i] * (1 - delta * 0.5));

        if (system.lifetimes[i] <= 0) {
          sizes.array[i] = 0;
        }
      }
    }

    positions.needsUpdate = true;
    sizes.needsUpdate = true;
    material.opacity = 1;

    return hasActiveParticles;
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointerleave', (e) => this.onPointerUp(e));
  }

  private updateMouse(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getMouseWorldPosition(): THREE.Vector3 {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.circlePlane, target);
    return target;
  }

  private onPointerDown(e: PointerEvent): void {
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const crystalMeshes = this.crystals.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(crystalMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const crystal = this.crystals.find(c => c.mesh === hitMesh);
      if (crystal) {
        this.isDragging = true;
        this.draggedCrystal = crystal;
        crystal.isDragging = true;
        crystal.isInCircle = false;

        const worldPos = this.getMouseWorldPosition();
        this.dragOffset.copy(crystal.mesh.position).sub(worldPos);

        this.renderer.domElement.setPointerCapture(e.pointerId);
      }
    }
  }

  private onPointerMove(e: PointerEvent): void {
    this.updateMouse(e);

    if (this.isDragging && this.draggedCrystal) {
      const worldPos = this.getMouseWorldPosition();
      this.draggedCrystal.mesh.position.copy(worldPos).add(this.dragOffset);
      this.draggedCrystal.mesh.position.z = 15;

      this.emitTrailParticle(this.draggedCrystal.mesh.position, this.draggedCrystal.type);
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.isDragging && this.draggedCrystal) {
      const crystal = this.draggedCrystal;
      crystal.isDragging = false;

      const distFromCenter = Math.sqrt(
        crystal.mesh.position.x ** 2 + crystal.mesh.position.y ** 2
      );

      if (distFromCenter < this.circleRadius * 0.85) {
        const angle = Math.atan2(crystal.mesh.position.y, crystal.mesh.position.x);
        const targetDist = this.circleRadius * 0.4;
        crystal.mesh.position.x = Math.cos(angle) * targetDist;
        crystal.mesh.position.y = Math.sin(angle) * targetDist;
        crystal.mesh.position.z = 5;
        crystal.isInCircle = true;
      } else {
        crystal.mesh.position.copy(crystal.homePosition);
        crystal.isInCircle = false;
      }

      this.notifyElementsChanged();
      this.checkAndTriggerFusion();

      try {
        this.renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
      }
    }

    this.isDragging = false;
    this.draggedCrystal = null;
  }

  private checkAndTriggerFusion(): void {
    const elementsInCircle = this.crystals
      .filter(c => c.isInCircle)
      .map(c => c.type);

    if (elementsInCircle.length >= 2) {
      if (this.onFusionComplete) {
        this.onFusionComplete(elementsInCircle);
      }
    }
  }

  private notifyElementsChanged(): void {
    if (this.onElementsChanged) {
      const elements = this.crystals
        .filter(c => c.isInCircle)
        .map(c => c.type);
      this.onElementsChanged(elements);
    }
  }

  public setFusionCallback(callback: FusionCompleteCallback): void {
    this.onFusionComplete = callback;
  }

  public setElementsChangedCallback(callback: ElementsChangedCallback): void {
    this.onElementsChanged = callback;
  }

  public triggerFusion(resultType: FusionResultType, elements: ElementType[]): void {
    this.isFusionPlaying = true;
    this.fusionAnimationTime = 0;
    this.currentFusionResult = resultType;
    this.fusionResultTimer = 2;

    this.createFusionParticles(resultType);

    if (this.circleBorder) {
      const material = this.circleBorder.material as THREE.MeshBasicMaterial;
      const resultColorMap: Record<string, number> = {
        steam: 0xd0d0d0,
        firestorm: 0xff8c00,
        mud: 0x654321,
        lava: 0xff4500,
        ice: 0x87ceeb,
        sand: 0xdaa520,
        lightning: 0x9400d3,
        storm: 0x4b0082,
        earth_wind: 0xd2691e,
        fire_water: 0x6495ed
      };
      this.borderColors = [
        new THREE.Color(resultColorMap[resultType] || 0xffffff),
        new THREE.Color(resultColorMap[resultType] || 0xffffff).offsetHSL(0.1, 0, 0)
      ];
    }
  }

  public replayFusion(resultType: FusionResultType, elements: ElementType[]): void {
    this.isFusionPlaying = true;
    this.fusionAnimationTime = 0;
    this.currentFusionResult = resultType;
    this.fusionResultTimer = 2;

    this.createFusionParticles(resultType);

    if (this.circleBorder) {
      const resultColorMap: Record<string, number> = {
        steam: 0xd0d0d0,
        firestorm: 0xff8c00,
        mud: 0x654321,
        lava: 0xff4500,
        ice: 0x87ceeb,
        sand: 0xdaa520,
        lightning: 0x9400d3,
        storm: 0x4b0082,
        earth_wind: 0xd2691e,
        fire_water: 0x6495ed
      };
      this.borderColors = [
        new THREE.Color(resultColorMap[resultType] || 0xffffff),
        new THREE.Color(resultColorMap[resultType] || 0xffffff).offsetHSL(0.1, 0, 0)
      ];
    }
  }

  public getActiveElements(): ElementType[] {
    return this.crystals
      .filter(c => c.isInCircle)
      .map(c => c.type);
  }

  public clearCrystalsFromCircle(): void {
    this.crystals.forEach(crystal => {
      if (crystal.isInCircle) {
        crystal.isInCircle = false;
        crystal.mesh.position.copy(crystal.homePosition);
      }
    });
    this.notifyElementsChanged();
  }

  public update(delta: number, time: number): void {
    this.borderColorPhase += delta / 4;
    const t = (Math.sin(this.borderColorPhase * Math.PI * 2) + 1) / 2;
    const currentBorderColor = this.borderColors[0].clone().lerp(this.borderColors[1], t);

    if (this.circleBorder) {
      (this.circleBorder.material as THREE.MeshBasicMaterial).color.copy(currentBorderColor);
    }
    if (this.circle) {
      const ringColor = currentBorderColor.clone().multiplyScalar(0.6);
      (this.circle.material as THREE.MeshBasicMaterial).color.copy(ringColor);
    }

    this.crystals.forEach((crystal, i) => {
      crystal.pulsePhase += delta * Math.PI;
      const pulseScale = 1 + Math.sin(crystal.pulsePhase) * 0.02;

      if (!crystal.isDragging) {
        crystal.mesh.scale.setScalar(pulseScale);
      } else {
        crystal.mesh.scale.setScalar(1.1);
      }

      const mat = crystal.mesh.material as THREE.ShaderMaterial;
      if (mat.uniforms) {
        mat.uniforms.uTime.value = time + i;
      }
    });

    if (this.dragTrailParticles) {
      this.updateParticleSystem(this.dragTrailParticles, delta);
    }

    this.fusionParticles = this.fusionParticles.filter(system => {
      const active = this.updateParticleSystem(system, delta);
      if (!active) {
        system.points.geometry.dispose();
        (system.points.material as THREE.Material).dispose();
        this.group.remove(system.points);
        return false;
      }
      return true;
    });

    if (this.isFusionPlaying) {
      this.fusionAnimationTime += delta;
      this.fusionResultTimer -= delta;

      if (this.fusionResultTimer <= 0) {
        this.isFusionPlaying = false;
        this.currentFusionResult = null;
        this.borderColors = [
          new THREE.Color(0x6b4eff),
          new THREE.Color(0xff69b4)
        ];
      }
    }
  }

  public resize(scale: number): void {
    this.group.scale.setScalar(scale);
  }

  public dispose(): void {
    this.crystals.forEach(crystal => {
      crystal.mesh.geometry.dispose();
      (crystal.mesh.material as THREE.Material).dispose();
    });

    if (this.circle) {
      this.circle.geometry.dispose();
      (this.circle.material as THREE.Material).dispose();
    }
    if (this.circleBorder) {
      this.circleBorder.geometry.dispose();
      (this.circleBorder.material as THREE.Material).dispose();
    }
    if (this.circleInner) {
      this.circleInner.geometry.dispose();
      (this.circleInner.material as THREE.Material).dispose();
    }

    if (this.dragTrailParticles) {
      this.dragTrailParticles.points.geometry.dispose();
      (this.dragTrailParticles.points.material as THREE.Material).dispose();
    }

    this.fusionParticles.forEach(system => {
      system.points.geometry.dispose();
      (system.points.material as THREE.Material).dispose();
    });
  }
}
