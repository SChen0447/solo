import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Fossil, FossilConfig, FossilGroup, FossilState } from './fossil';

export interface SceneStats {
  total: number;
  dug: number;
  assembled: number;
  groups: {
    skull: { done: number; total: number };
    torso: { done: number; total: number };
    limbs: { done: number; total: number };
  };
}

export interface SceneCallbacks {
  onStatsUpdate: (stats: SceneStats) => void;
  onHint: (text: string) => void;
  onGroupComplete: (group: FossilGroup) => void;
  onSnapGlow: () => void;
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  private sandGround!: THREE.Mesh;
  private fossils: Fossil[] = [];
  private targetMarkers: THREE.Group[] = [];
  private pebbles: THREE.Mesh[] = [];
  private particles: THREE.Mesh[] = [];

  private directionalLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private cameraPointLight!: THREE.PointLight;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private draggedFossil: Fossil | null = null;
  private hoveredFossil: Fossil | null = null;

  private callbacks: SceneCallbacks;
  private isRunning = true;
  private animationId: number | null = null;

  private groupTotals = { skull: 3, torso: 4, limbs: 3 };
  private completedGroups = new Set<FossilGroup>();
  private completeSkeletons: THREE.Group[] = [];

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0D0D1A');
    this.scene.fog = new THREE.Fog('#0D0D1A', 15, 30);

    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(8, 6, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 10;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(0, 0.2, 0);

    this.setupLights();
    this.createSandGround();
    this.createPebbles();
    this.createFossils();
    this.createTargetMarkers();

    this.bindEvents(container);
  }

  private setupLights(): void {
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(-8, 10, 6);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(2048, 2048);
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 30;
    this.directionalLight.shadow.camera.left = -12;
    this.directionalLight.shadow.camera.right = 12;
    this.directionalLight.shadow.camera.top = 12;
    this.directionalLight.shadow.camera.bottom = -12;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);

    this.ambientLight = new THREE.AmbientLight('#FFF8DC', 0.4);
    this.scene.add(this.ambientLight);

    this.cameraPointLight = new THREE.PointLight(0xffffff, 0.2, 20);
    this.camera.add(this.cameraPointLight);
    this.scene.add(this.camera);
  }

  private createSandGround(): void {
    const geometry = new THREE.PlaneGeometry(24, 24, 60, 60);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(positions.count * 3);
    const color1 = new THREE.Color('#D4A574');
    const color2 = new THREE.Color('#C49A6C');

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      let yOffset = 0;
      if (dist < 12) {
        yOffset = (Math.random() - 0.5) * 0.02;
      }
      positions.setY(i, yOffset);

      const t = Math.random();
      const c = color1.clone().lerp(color2, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0
    });

    this.sandGround = new THREE.Mesh(geometry, material);
    this.sandGround.receiveShadow = true;
    this.sandGround.name = 'sandGround';
    this.scene.add(this.sandGround);
  }

  private createPebbles(): void {
    for (let i = 0; i < 30; i++) {
      const radius = 0.03 + Math.random() * 0.05;
      const geometry = new THREE.SphereGeometry(radius, 8, 6);

      const positions = geometry.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < positions.count; j++) {
        positions.setX(j, positions.getX(j) * (0.8 + Math.random() * 0.4));
        positions.setY(j, positions.getY(j) * (0.8 + Math.random() * 0.4));
        positions.setZ(j, positions.getZ(j) * (0.8 + Math.random() * 0.4));
      }
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: '#8B7355',
        roughness: 0.8,
        flatShading: true
      });

      const pebble = new THREE.Mesh(geometry, material);
      const angle = Math.random() * Math.PI * 2;
      const dist = 1 + Math.random() * 10;
      pebble.position.set(
        Math.cos(angle) * dist,
        radius * 0.5 + (Math.random() - 0.5) * 0.02,
        Math.sin(angle) * dist
      );
      pebble.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      pebble.castShadow = true;
      pebble.receiveShadow = true;
      this.scene.add(pebble);
      this.pebbles.push(pebble);
    }
  }

  private createFossils(): void {
    const configs = this.generateFossilConfigs();
    configs.forEach((config) => {
      const fossil = new Fossil(config, this.scene);
      this.fossils.push(fossil);
    });
  }

  private generateFossilConfigs(): FossilConfig[] {
    const configs: FossilConfig[] = [];
    const groups: FossilGroup[] = ['skull', 'torso', 'limbs'];

    const targetLayouts = this.getTargetLayouts();
    let id = 0;

    groups.forEach((group) => {
      const total = this.groupTotals[group];
      for (let i = 0; i < total; i++) {
        let x: number, z: number;
        let attempts = 0;
        do {
          const angle = Math.random() * Math.PI * 2;
          const dist = 1.5 + Math.random() * 3.5;
          x = Math.cos(angle) * dist;
          z = Math.sin(angle) * dist;
          attempts++;
        } while (
          attempts < 20 &&
          configs.some((c) => {
            const dx = c.buriedPosition.x - x;
            const dz = c.buriedPosition.z - z;
            return Math.sqrt(dx * dx + dz * dz) < 0.8;
          })
        );

        const buryDepth = 0.5 + Math.random() * 0.7;
        const length = 0.3 + Math.random() * 0.9;

        const target = targetLayouts[group][i];

        configs.push({
          id: id++,
          group,
          groupIndex: i,
          buriedPosition: new THREE.Vector3(x, -buryDepth, z),
          targetPosition: target.position,
          targetRotation: target.rotation,
          buryDepth,
          length
        });
      }
    });

    return configs;
  }

  private getTargetLayouts(): Record<
    FossilGroup,
    { position: THREE.Vector3; rotation: number }[]
  > {
    return {
      skull: [
        { position: new THREE.Vector3(-2.5, 0, 2.5), rotation: Math.PI * 0.1 },
        { position: new THREE.Vector3(-2.0, 0, 3.0), rotation: Math.PI * 0.05 },
        { position: new THREE.Vector3(-3.0, 0, 2.8), rotation: -Math.PI * 0.05 }
      ],
      torso: [
        { position: new THREE.Vector3(-1.0, 0, 1.0), rotation: 0 },
        { position: new THREE.Vector3(0, 0, 0.5), rotation: Math.PI * 0.02 },
        { position: new THREE.Vector3(1.0, 0, 0), rotation: -Math.PI * 0.02 },
        { position: new THREE.Vector3(2.0, 0, -0.5), rotation: Math.PI * 0.05 }
      ],
      limbs: [
        { position: new THREE.Vector3(-1.5, 0, -1.5), rotation: Math.PI * 0.3 },
        { position: new THREE.Vector3(1.5, 0, -1.5), rotation: -Math.PI * 0.3 },
        { position: new THREE.Vector3(2.5, 0, -2.5), rotation: Math.PI * 0.6 }
      ]
    };
  }

  private createTargetMarkers(): void {
    const layouts = this.getTargetLayouts();
    (Object.keys(layouts) as FossilGroup[]).forEach((group) => {
      layouts[group].forEach((target, i) => {
        const markerGroup = new THREE.Group();
        markerGroup.position.copy(target.position);
        markerGroup.position.y = 0.01;

        const ringGeo = new THREE.RingGeometry(0.35, 0.4, 32);
        const ringMat = new THREE.LineBasicMaterial({
          color: '#B0B0B0',
          transparent: true,
          opacity: 0.5
        });
        const ringPoints: THREE.Vector3[] = [];
        const ringSegments = 48;
        for (let s = 0; s <= ringSegments; s++) {
          const a = (s / ringSegments) * Math.PI * 2;
          const r = 0.4;
          ringPoints.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
        }
        const ringGeo2 = new THREE.BufferGeometry().setFromPoints(ringPoints);
        const ring = new THREE.LineLoop(ringGeo2, ringMat);
        ring.rotation.x = -Math.PI / 2;
        markerGroup.add(ring);

        const crossMat = new THREE.LineBasicMaterial({
          color: '#B0B0B0',
          transparent: true,
          opacity: 0.5
        });
        const crossPoints = [
          new THREE.Vector3(-0.15, 0, 0),
          new THREE.Vector3(0.15, 0, 0),
          new THREE.Vector3(0, 0, -0.15),
          new THREE.Vector3(0, 0, 0.15)
        ];
        const crossGeo = new THREE.BufferGeometry().setFromPoints(crossPoints);
        const cross = new THREE.LineSegments(crossGeo, crossMat);
        cross.rotation.x = -Math.PI / 2;
        markerGroup.add(cross);

        this.scene.add(markerGroup);
        this.targetMarkers.push(markerGroup);
      });
    });
  }

  private bindEvents(container: HTMLElement): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e, container));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e, container));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e, container));
    canvas.addEventListener('wheel', (e) => this.onWheel(e, container), { passive: false });

    window.addEventListener('resize', () => this.onResize(container));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isRunning = false;
      } else {
        this.isRunning = true;
      }
    });
  }

  private updateMouse(e: PointerEvent, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerDown(e: PointerEvent, container: HTMLElement): void {
    if (e.button !== 0) return;
    this.updateMouse(e, container);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const fossilMeshes: THREE.Object3D[] = [];
    this.fossils.forEach((f) => {
      if (f.isClickable()) {
        f.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) fossilMeshes.push(child);
        });
      }
    });

    const fossilHits = this.raycaster.intersectObjects(fossilMeshes, false);
    if (fossilHits.length > 0) {
      const hitMesh = fossilHits[0].object;
      const fossil = this.fossils.find((f) => f.containsObject(hitMesh));
      if (fossil) {
        this.draggedFossil = fossil;
        fossil.startDragging();
        this.controls.enabled = false;
        return;
      }
    }

    const sandHits = this.raycaster.intersectObject(this.sandGround, false);
    if (sandHits.length > 0) {
      const hitPoint = sandHits[0].point;
      this.tryDigAt(hitPoint);
    }
  }

  private onPointerMove(e: PointerEvent, container: HTMLElement): void {
    this.updateMouse(e, container);

    if (this.draggedFossil) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersectPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
      if (intersectPoint) {
        this.draggedFossil.updateDragPosition(intersectPoint);
      }
    } else {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const fossilMeshes: THREE.Object3D[] = [];
      this.fossils.forEach((f) => {
        if (f.isClickable()) {
          f.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) fossilMeshes.push(child);
          });
        }
      });
      const hits = this.raycaster.intersectObjects(fossilMeshes, false);
      if (hits.length > 0) {
        const hitMesh = hits[0].object;
        const fossil = this.fossils.find((f) => f.containsObject(hitMesh));
        if (fossil && fossil !== this.hoveredFossil) {
          this.renderer.domElement.style.cursor = 'grab';
          this.hoveredFossil = fossil;
        }
      } else if (this.hoveredFossil) {
        this.renderer.domElement.style.cursor = 'default';
        this.hoveredFossil = null;
      }
    }
  }

  private onPointerUp(e: PointerEvent, container: HTMLElement): void {
    if (this.draggedFossil) {
      this.draggedFossil.stopDragging(
        this.scene,
        () => this.onFossilSnapped(this.draggedFossil!),
        () => {}
      );
      this.draggedFossil = null;
      this.controls.enabled = true;
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private onWheel(e: WheelEvent, container: HTMLElement): void {
    if (this.draggedFossil) {
      e.preventDefault();
      this.draggedFossil.rotateByWheel(e.deltaY);
    }
  }

  private onResize(container: HTMLElement): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private tryDigAt(point: THREE.Vector3): void {
    const dist = Math.sqrt(point.x * point.x + point.z * point.z);
    if (dist > 12) return;

    let nearestFossil: Fossil | null = null;
    let nearestDist = Infinity;

    this.fossils.forEach((f) => {
      if (f.state === FossilState.Buried) {
        const dx = f.mesh.position.x - point.x;
        const dz = f.mesh.position.z - point.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < 1.2 && d < nearestDist) {
          nearestDist = d;
          nearestFossil = f;
        }
      }
    });

    this.spawnDigParticles(point);

    if (nearestFossil) {
      nearestFossil.startDigging(this.scene, () => {
        this.updateStats();
        const dugCount = this.fossils.filter((f) => f.isExposedOrMore()).length;
        if (dugCount === 1) {
          this.callbacks.onHint('挖到了！拖拽碎片到匹配位置拼合');
        } else {
          this.callbacks.onHint(`又挖到一块！已挖掘 ${dugCount}/10`);
        }
      });
    } else {
      this.callbacks.onHint('这里什么也没有，试试其他位置');
    }
  }

  private spawnDigParticles(point: THREE.Vector3): void {
    for (let i = 0; i < 10; i++) {
      const size = 0.03 + Math.random() * 0.04;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? '#D4A574' : '#C49A6C',
        flatShading: true
      });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(point);
      particle.position.y += 0.05;
      this.scene.add(particle);
      this.particles.push(particle);

      const startY = particle.position.y;
      const startX = particle.position.x;
      const startZ = particle.position.z;
      const vx = (Math.random() - 0.5) * 2;
      const vy = 1 + Math.random() * 1.5;
      const vz = (Math.random() - 0.5) * 2;
      const startTime = performance.now();
      const duration = 300;

      const animateParticle = () => {
        const elapsed = performance.now() - startTime;
        const t = elapsed / duration;
        if (t >= 1) {
          this.scene.remove(particle);
          geo.dispose();
          mat.dispose();
          const idx = this.particles.indexOf(particle);
          if (idx >= 0) this.particles.splice(idx, 1);
          return;
        }
        particle.position.x = startX + vx * t;
        particle.position.y = startY + vy * t - 4.9 * t * t;
        particle.position.z = startZ + vz * t;
        particle.rotation.x += 0.1;
        particle.rotation.z += 0.1;
        (mat as THREE.MeshStandardMaterial).opacity = 1 - t;
        mat.transparent = true;
        requestAnimationFrame(animateParticle);
      };
      animateParticle();
    }
  }

  private onFossilSnapped(fossil: Fossil): void {
    this.callbacks.onSnapGlow();
    this.updateStats();

    const groupFossils = this.fossils.filter((f) => f.group === fossil.group);
    const allDone = groupFossils.every((f) => f.isAssembled());

    if (allDone && !this.completedGroups.has(fossil.group)) {
      this.completedGroups.add(fossil.group);
      this.onGroupComplete(fossil.group);
    } else {
      const groupLabel = this.getGroupLabel(fossil.group);
      const doneCount = groupFossils.filter((f) => f.isAssembled()).length;
      this.callbacks.onHint(`${groupLabel}碎片拼合成功 (${doneCount}/${groupFossils.length})`);
    }
  }

  private onGroupComplete(group: FossilGroup): void {
    const groupFossils = this.fossils.filter((f) => f.group === group);
    groupFossils.forEach((f) => f.setFinalAssembledLook());

    const origIntensity = this.directionalLight.intensity;
    this.directionalLight.intensity = 1.8;
    setTimeout(() => {
      this.directionalLight.intensity = origIntensity;
    }, 500);

    const skeletonGroup = new THREE.Group();
    const layouts = this.getTargetLayouts();
    layouts[group].forEach((target, i) => {
      const fossil = groupFossils[i];
      if (fossil) {
        const cloned = fossil.mesh.clone(true);
        cloned.position.copy(target.position);
        cloned.position.y = 0.15;
        skeletonGroup.add(cloned);
      }
    });
    this.completeSkeletons.push(skeletonGroup);

    const label = this.getGroupLabel(group);
    this.callbacks.onHint(`${label}已收集完成！`);
    this.callbacks.onGroupComplete(group);

    const allGroupsComplete = (['skull', 'torso', 'limbs'] as FossilGroup[]).every((g) =>
      this.completedGroups.has(g)
    );
    if (allGroupsComplete) {
      this.callbacks.onHint('🎉 恭喜！完整恐龙骨骼已拼合完成！');
    }
  }

  private getGroupLabel(group: FossilGroup): string {
    switch (group) {
      case 'skull':
        return '头骨组';
      case 'torso':
        return '躯干组';
      case 'limbs':
        return '四肢组';
    }
  }

  public updateStats(): void {
    const dug = this.fossils.filter((f) => f.isExposedOrMore()).length;
    const assembled = this.fossils.filter((f) => f.isAssembled()).length;

    const stats: SceneStats = {
      total: this.fossils.length,
      dug,
      assembled,
      groups: {
        skull: {
          done: this.fossils.filter((f) => f.group === 'skull' && f.isAssembled()).length,
          total: this.groupTotals.skull
        },
        torso: {
          done: this.fossils.filter((f) => f.group === 'torso' && f.isAssembled()).length,
          total: this.groupTotals.torso
        },
        limbs: {
          done: this.fossils.filter((f) => f.group === 'limbs' && f.isAssembled()).length,
          total: this.groupTotals.limbs
        }
      }
    };
    this.callbacks.onStatsUpdate(stats);
  }

  public reset(): void {
    this.fossils.forEach((f) => f.dispose(this.scene));
    this.fossils = [];
    this.targetMarkers.forEach((m) => this.scene.remove(m));
    this.targetMarkers = [];
    this.completeSkeletons.forEach((s) => this.scene.remove(s));
    this.completeSkeletons = [];
    this.completedGroups.clear();
    this.draggedFossil = null;
    this.hoveredFossil = null;
    this.controls.enabled = true;

    this.createFossils();
    this.createTargetMarkers();
    this.updateStats();
    this.callbacks.onHint('点击沙地挖掘化石碎片');
  }

  public start(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (!this.isRunning) return;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
