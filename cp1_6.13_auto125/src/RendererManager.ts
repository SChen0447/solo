import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap, Back } from 'gsap';
import { LayerManager, LayerData, GlobalSettings } from './LayerManager';

interface LayerMeshGroup {
  layerId: number;
  slices: THREE.Mesh[];
  separator: THREE.Mesh | null;
  glow: THREE.Mesh | null;
  particles: THREE.Points | null;
  group: THREE.Group;
  originalY: number;
  currentExpandProgress: number;
  isFloating: boolean;
  isHovered: boolean;
  baseMaterial: THREE.MeshStandardMaterial[];
}

export interface HoverResult {
  layer: LayerData | null;
  point: THREE.Vector3 | null;
}

export interface RendererCallbacks {
  onLayerHover: (result: HoverResult) => void;
  onLayerClick: (layerId: number | null) => void;
}

export class RendererManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private layerManager: LayerManager;
  private callbacks: RendererCallbacks;

  private layerMeshGroups: Map<number, LayerMeshGroup> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedLayerId: number | null = null;
  private clock: THREE.Clock;

  private readonly SEGMENTS = 64;
  private readonly RING_COUNT = 4;
  private readonly INNER_RATIO = 0.8;
  private readonly SLICE_GAP = 0.15;

  private animationFrameId: number = 0;

  constructor(
    container: HTMLElement,
    layerManager: LayerManager,
    callbacks: RendererCallbacks
  ) {
    this.container = container;
    this.layerManager = layerManager;
    this.callbacks = callbacks;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.setupLights();
    this.createAllLayers();
    this.setupEventListeners();
    this.startAnimationLoop();

    this.hideLoadingScreen();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0f0f1a, 0.03);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(12, 8, 12);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = Math.PI * 0.15;
    controls.target.set(0, 0, 0);
    return controls;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
    mainLight.position.set(10, 15, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4a6fa5, 0.3);
    fillLight.position.set(-8, 6, -10);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffc864, 0.2);
    rimLight.position.set(0, 5, -12);
    this.scene.add(rimLight);
  }

  private hexToRgb(hex: string): THREE.Color {
    return new THREE.Color(hex);
  }

  private createRingGeometry(
    innerRadius: number,
    outerRadius: number,
    thickness: number,
    segments: number
  ): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    shape.holes.push(new THREE.Path().absarc(0, 0, innerRadius, 0, Math.PI * 2, true));

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: false,
      curveSegments: segments
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.center();

    return geometry;
  }

  private createSliceMaterial(
    layer: LayerData,
    colorIndex: number,
    globalSettings: GlobalSettings
  ): THREE.MeshStandardMaterial {
    const color1 = this.hexToRgb(layer.colors[0]);
    const color2 = this.hexToRgb(layer.colors[1] || layer.colors[0]);
    const t = colorIndex / Math.max(this.RING_COUNT - 1, 1);
    const color = color1.clone().lerp(color2, t);

    return new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: layer.opacity * globalSettings.opacity,
      roughness: layer.roughness,
      metalness: layer.metalness,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  private createAllLayers(): void {
    const layers = this.layerManager.getLayerData();
    const baseRadius = this.layerManager.getBaseRadius();
    const totalHeight = this.layerManager.getTotalHeight();

    layers.forEach((layer) => {
      const group = new THREE.Group();
      const slices: THREE.Mesh[] = [];
      const materials: THREE.MeshStandardMaterial[] = [];
      const globalSettings = this.layerManager.getGlobalSettings();

      const centerY = totalHeight / 2 - layer.depthStart - layer.thickness / 2;

      for (let ring = 0; ring < this.RING_COUNT; ring++) {
        const ringOuterRadius = baseRadius * (1 - ring * (1 - this.INNER_RATIO) / this.RING_COUNT);
        const ringInnerRadius = ringOuterRadius * (ring === this.RING_COUNT - 1 ? 0.4 : this.INNER_RATIO);

        const geometry = this.createRingGeometry(
          ringInnerRadius,
          ringOuterRadius,
          layer.thickness,
          this.SEGMENTS
        );

        const material = this.createSliceMaterial(layer, ring, globalSettings);
        materials.push(material);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = {
          layerId: layer.id,
          ringIndex: ring,
          isSlice: true
        };
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        slices.push(mesh);
        group.add(mesh);
      }

      let separator: THREE.Mesh | null = null;
      if (layer.id < layers.length - 1) {
        const separatorGeometry = this.createRingGeometry(
          baseRadius * this.INNER_RATIO,
          baseRadius,
          0.05,
          this.SEGMENTS
        );
        const separatorMaterial = new THREE.MeshStandardMaterial({
          color: 0xd0d0d0,
          transparent: true,
          opacity: 0.4,
          emissive: 0x444444,
          emissiveIntensity: 0.3,
          side: THREE.DoubleSide
        });
        separator = new THREE.Mesh(separatorGeometry, separatorMaterial);
        separator.position.y = -layer.thickness / 2 - 0.025;
        separator.userData = { layerId: layer.id, isSeparator: true };
        group.add(separator);
      }

      let glow: THREE.Mesh | null = null;
      const glowGeometry = this.createRingGeometry(
        baseRadius * this.INNER_RATIO * 0.95,
        baseRadius * 1.05,
        layer.thickness * 1.2,
        this.SEGMENTS
      );
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: this.hexToRgb(layer.colors[0]),
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.visible = false;
      glow.userData = { layerId: layer.id, isGlow: true };
      group.add(glow);

      let particles: THREE.Points | null = null;
      if (layer.hasParticles) {
        particles = this.createMetalParticles(layer, baseRadius);
        group.add(particles);
      }

      if (layer.hasPulse) {
        this.setupMagmaPulse(slices[0], materials[0], layer);
      }

      group.position.y = centerY;
      this.scene.add(group);

      this.layerMeshGroups.set(layer.id, {
        layerId: layer.id,
        slices,
        separator,
        glow,
        particles,
        group,
        originalY: centerY,
        currentExpandProgress: 0,
        isFloating: false,
        isHovered: false,
        baseMaterial: materials
      });
    });
  }

  private createMetalParticles(layer: LayerData, baseRadius: number): THREE.Points {
    const particleCount = 150;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const color1 = this.hexToRgb(layer.colors[0]);
    const color2 = this.hexToRgb(layer.colors[1] || layer.colors[0]);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = baseRadius * (this.INNER_RATIO + Math.random() * (1 - this.INNER_RATIO) * 0.9);
      const y = (Math.random() - 0.5) * layer.thickness * 0.8;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      const colorMix = Math.random();
      colors[i * 3] = color1.r * (1 - colorMix) + color2.r * colorMix;
      colors[i * 3 + 1] = color1.g * (1 - colorMix) + color2.g * colorMix;
      colors[i * 3 + 2] = color1.b * (1 - colorMix) + color2.b * colorMix;

      sizes[i] = 0.015 + Math.random() * 0.025;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    points.userData = { layerId: layer.id, isParticles: true, baseOpacity: 0.9 };
    return points;
  }

  private setupMagmaPulse(
    _mesh: THREE.Mesh,
    material: THREE.MeshStandardMaterial,
    _layer: LayerData
  ): void {
    gsap.to(material, {
      emissiveIntensity: 0.8,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
    material.emissive = this.hexToRgb('#FF5722');
    material.emissiveIntensity = 0.3;
  }

  public updateLayerExpand(layerId: number, progress: number): void {
    const meshGroup = this.layerMeshGroups.get(layerId);
    if (!meshGroup) return;

    const baseRadius = this.layerManager.getBaseRadius();
    const layer = this.layerManager.getLayerById(layerId);
    if (!layer) return;

    const clampedProgress = Math.max(0, Math.min(1, progress));
    meshGroup.currentExpandProgress = clampedProgress;

    meshGroup.slices.forEach((slice, index) => {
      const ringFactor = index / this.RING_COUNT;
      const expandAmount = clampedProgress * (0.8 + ringFactor * 0.4) * baseRadius * 0.2;
      const verticalOffset = clampedProgress * (0.5 + ringFactor * 0.3);

      gsap.to(slice.position, {
        y: verticalOffset,
        duration: 0.8,
        ease: Back.easeOut.config(1.2),
        overwrite: true
      });

      const targetScale = 1 + clampedProgress * 0.2 * (1 + ringFactor * 0.5);
      gsap.to(slice.scale, {
        x: targetScale,
        z: targetScale,
        duration: 1,
        ease: Back.easeOut.config(1.2),
        overwrite: true
      });

      const mat = slice.material as THREE.MeshStandardMaterial;
      const targetOpacity = layer.opacity * (1 - clampedProgress * 0.75) * this.layerManager.getGlobalSettings().opacity;
      gsap.to(mat, {
        opacity: targetOpacity,
        duration: 1,
        ease: 'power2.out',
        overwrite: true
      });
    });

    if (meshGroup.separator) {
      gsap.to((meshGroup.separator.material as THREE.MeshStandardMaterial), {
        opacity: 0.4 * (1 - clampedProgress * 0.5),
        duration: 0.8,
        overwrite: true
      });
    }

    if (meshGroup.particles) {
      const mat = meshGroup.particles.material as THREE.PointsMaterial;
      gsap.to(mat, {
        opacity: (meshGroup.particles.userData.baseOpacity || 0.9) * (1 - clampedProgress * 0.5),
        duration: 0.8,
        overwrite: true
      });
    }

    void expandAmount;
  }

  public updateAllLayersExpand(): void {
    const layers = this.layerManager.getLayerData();
    layers.forEach((layer) => {
      const progress = this.layerManager.getLayerDigAmount(layer.id);
      this.updateLayerExpand(layer.id, progress);
    });
  }

  public applyGlobalSettings(settings: GlobalSettings): void {
    this.layerMeshGroups.forEach((meshGroup, layerId) => {
      const layer = this.layerManager.getLayerById(layerId);
      if (!layer) return;

      const progress = meshGroup.currentExpandProgress;

      meshGroup.slices.forEach((slice, index) => {
        const mat = slice.material as THREE.MeshStandardMaterial;
        const baseOpacity = layer.opacity * (1 - progress * 0.75);
        mat.opacity = baseOpacity * settings.opacity;

        const color1 = this.hexToRgb(layer.colors[0]);
        const color2 = this.hexToRgb(layer.colors[1] || layer.colors[0]);
        const t = index / Math.max(this.RING_COUNT - 1, 1);
        const baseColor = color1.clone().lerp(color2, t);
        mat.color = baseColor.clone().multiplyScalar(settings.brightness);

        if (layer.hasPulse && mat.emissive) {
          mat.emissiveIntensity = 0.3 * settings.brightness;
        }
      });
    });

    this.renderer.toneMappingExposure = settings.brightness;
  }

  public setLayerHover(layerId: number | null): void {
    this.layerMeshGroups.forEach((meshGroup, id) => {
      const shouldHighlight = id === layerId && !meshGroup.isFloating;

      if (shouldHighlight && !meshGroup.isHovered) {
        meshGroup.isHovered = true;
        this.startGlowPulse(meshGroup);

        meshGroup.slices.forEach((slice) => {
          gsap.to(slice.scale, {
            y: 1.4,
            duration: 0.3,
            ease: 'back.out(1.5)',
            overwrite: true
          });
        });
      } else if (!shouldHighlight && meshGroup.isHovered) {
        meshGroup.isHovered = false;

        if (meshGroup.glow) {
          meshGroup.glow.visible = false;
          gsap.killTweensOf((meshGroup.glow.material as THREE.MeshBasicMaterial));
          (meshGroup.glow.material as THREE.MeshBasicMaterial).opacity = 0;
        }

        const expandProgress = meshGroup.currentExpandProgress;
        meshGroup.slices.forEach((slice) => {
          gsap.to(slice.scale, {
            y: 1,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: true
          });
          void expandProgress;
        });
      }
    });
  }

  private startGlowPulse(meshGroup: LayerMeshGroup): void {
    if (!meshGroup.glow) return;
    meshGroup.glow.visible = true;

    const glowMat = meshGroup.glow.material as THREE.MeshBasicMaterial;
    gsap.to(glowMat, {
      opacity: 0.3,
      duration: 0.4,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });
  }

  public selectLayer(layerId: number | null): void {
    if (this.selectedLayerId === layerId && layerId !== null) {
      this.resetSelection();
      return;
    }

    if (layerId === null) {
      this.resetSelection();
      return;
    }

    this.selectedLayerId = layerId;
    const targetGroup = this.layerMeshGroups.get(layerId);
    if (!targetGroup) return;

    const layer = this.layerManager.getLayerById(layerId);
    if (!layer) return;

    targetGroup.isFloating = true;
    targetGroup.group.userData.originalRotationY = targetGroup.group.rotation.y;

    gsap.to(targetGroup.group.position, {
      y: targetGroup.originalY + 3,
      duration: 1,
      ease: Back.easeOut.config(1.2)
    });

    gsap.to(targetGroup.group.rotation, {
      y: targetGroup.group.rotation.y + Math.PI * 2,
      duration: 3,
      ease: 'power1.inOut',
      repeat: -1
    });

    this.spawnClickParticles(targetGroup, layer);

    this.layerMeshGroups.forEach((meshGroup, id) => {
      if (id !== layerId) {
        meshGroup.slices.forEach((slice) => {
          gsap.to((slice.material as THREE.MeshStandardMaterial), {
            opacity: 0.08,
            duration: 0.6,
            ease: 'power2.out'
          });
        });
        if (meshGroup.separator) {
          gsap.to((meshGroup.separator.material as THREE.MeshStandardMaterial), {
            opacity: 0.05,
            duration: 0.6
          });
        }
      }
    });
  }

  private spawnClickParticles(meshGroup: LayerMeshGroup, layer: LayerData): void {
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];
    const colors = new Float32Array(particleCount * 3);

    const color = this.hexToRgb(layer.colors[0]);
    const baseRadius = this.layerManager.getBaseRadius();

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.5;
      const radius = baseRadius * (this.INNER_RATIO + Math.random() * (1 - this.INNER_RATIO) * 0.5);

      positions[i * 3] = Math.cos(theta) * Math.cos(phi) * radius * 0.5;
      positions[i * 3 + 1] = meshGroup.originalY + (Math.random() - 0.5) * layer.thickness * 0.3;
      positions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * radius * 0.5;

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.08,
        0.02 + Math.random() * 0.06,
        (Math.random() - 0.5) * 0.08
      );
      velocities.push(velocity);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    const startTime = Date.now();
    const lifetime = 3000;

    const animateParticles = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / lifetime;

      if (progress >= 1) {
        this.scene.remove(points);
        geometry.dispose();
        material.dispose();
        return;
      }

      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        posAttr.array[i * 3] += velocities[i].x;
        posAttr.array[i * 3 + 1] += velocities[i].y;
        posAttr.array[i * 3 + 2] += velocities[i].z;
        velocities[i].y -= 0.001;
      }
      posAttr.needsUpdate = true;

      material.opacity = 1 - progress;
      material.size = 0.08 * (1 - progress * 0.5);

      requestAnimationFrame(animateParticles);
    };

    animateParticles();
  }

  public resetSelection(): void {
    this.selectedLayerId = null;

    this.layerMeshGroups.forEach((meshGroup) => {
      if (meshGroup.isFloating) {
        meshGroup.isFloating = false;
        gsap.killTweensOf(meshGroup.group.position);
        gsap.killTweensOf(meshGroup.group.rotation);

        gsap.to(meshGroup.group.position, {
          y: meshGroup.originalY,
          duration: 1.5,
          ease: Back.easeOut.config(1.2)
        });

        gsap.to(meshGroup.group.rotation, {
          y: meshGroup.group.userData.originalRotationY || 0,
          duration: 1.5,
          ease: 'power2.out'
        });
      }

      const layer = this.layerManager.getLayerById(meshGroup.layerId);
      if (!layer) return;

      const expandProgress = this.layerManager.getLayerDigAmount(meshGroup.layerId);
      const globalOpacity = this.layerManager.getGlobalSettings().opacity;

      meshGroup.slices.forEach((slice) => {
        gsap.to((slice.material as THREE.MeshStandardMaterial), {
          opacity: layer.opacity * (1 - expandProgress * 0.75) * globalOpacity,
          duration: 1,
          ease: 'power2.out'
        });
      });

      if (meshGroup.separator) {
        gsap.to((meshGroup.separator.material as THREE.MeshStandardMaterial), {
          opacity: 0.4 * (1 - expandProgress * 0.5),
          duration: 1
        });
      }
    });
  }

  public resetAll(): void {
    this.resetSelection();

    this.layerMeshGroups.forEach((meshGroup) => {
      gsap.to(meshGroup.group.position, {
        y: meshGroup.originalY,
        duration: 1.5,
        ease: 'power2.out'
      });
      gsap.to(meshGroup.group.rotation, {
        y: 0,
        duration: 1.5,
        ease: 'power2.out'
      });
      meshGroup.isFloating = false;

      meshGroup.slices.forEach((slice) => {
        gsap.to(slice.position, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.5,
          ease: 'power2.out'
        });
        gsap.to(slice.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.5,
          ease: 'power2.out'
        });
      });

      const layer = this.layerManager.getLayerById(meshGroup.layerId);
      if (layer) {
        const globalOpacity = this.layerManager.getGlobalSettings().opacity;
        meshGroup.slices.forEach((slice, index) => {
          gsap.to((slice.material as THREE.MeshStandardMaterial), {
            opacity: layer.opacity * globalOpacity,
            duration: 1.5
          });
          void index;
        });
      }

      meshGroup.currentExpandProgress = 0;
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('click', this.onClick);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onResize = (): void => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private onMouseMove = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const allMeshes: THREE.Object3D[] = [];

    this.layerMeshGroups.forEach((meshGroup) => {
      meshGroup.slices.forEach((slice) => allMeshes.push(slice));
    });

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const layerId = hit.object.userData.layerId as number;
      const layer = this.layerManager.getLayerById(layerId);
      this.callbacks.onLayerHover({
        layer: layer || null,
        point: hit.point
      });
      this.setLayerHover(layerId);
    } else {
      this.callbacks.onLayerHover({ layer: null, point: null });
      this.setLayerHover(null);
    }
  };

  private onClick = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const allMeshes: THREE.Object3D[] = [];

    this.layerMeshGroups.forEach((meshGroup) => {
      meshGroup.slices.forEach((slice) => allMeshes.push(slice));
    });

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length > 0) {
      const layerId = intersects[0].object.userData.layerId as number;
      this.callbacks.onLayerClick(layerId);
      this.selectLayer(layerId);
    } else {
      this.callbacks.onLayerClick(null);
      this.selectLayer(null);
    }
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const currentDepth = this.layerManager.getGlobalSettings().depth;
    const delta = event.deltaY > 0 ? 0.5 : -0.5;
    const newDepth = Math.max(0, Math.min(this.layerManager.getTotalHeight(), currentDepth + delta));
    this.layerManager.setGlobalDepth(newDepth);
    this.updateAllLayersExpand();
    this.callbacks.onLayerHover({ layer: null, point: null });
  };

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const elapsed = this.clock.getElapsedTime();

      this.layerMeshGroups.forEach((meshGroup) => {
        if (meshGroup.particles) {
          meshGroup.particles.rotation.y = elapsed * 0.1;
          const positions = meshGroup.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
          for (let i = 0; i < positions.count; i++) {
            const y = positions.array[i * 3 + 1] as number;
            positions.array[i * 3 + 1] = y + Math.sin(elapsed * 2 + i) * 0.0003;
          }
          positions.needsUpdate = true;
        }
      });

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 1000);
      }
    }, 800);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('click', this.onClick);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);

    this.layerMeshGroups.forEach((meshGroup) => {
      meshGroup.slices.forEach((slice) => {
        slice.geometry.dispose();
        if (Array.isArray(slice.material)) {
          slice.material.forEach((m) => m.dispose());
        } else {
          slice.material.dispose();
        }
      });
      if (meshGroup.separator) {
        meshGroup.separator.geometry.dispose();
        (meshGroup.separator.material as THREE.Material).dispose();
      }
      if (meshGroup.glow) {
        meshGroup.glow.geometry.dispose();
        (meshGroup.glow.material as THREE.Material).dispose();
      }
      if (meshGroup.particles) {
        meshGroup.particles.geometry.dispose();
        (meshGroup.particles.material as THREE.Material).dispose();
      }
    });

    this.controls.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
