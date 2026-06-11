import * as THREE from 'three';
import { FishManager, Fish } from './fishManager';
import { CoralManager, Coral } from './coralManager';

interface Ripple {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface WaterParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
}

class OceanTankApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private fishManager: FishManager;
  private coralManager: CoralManager;

  private clock: THREE.Clock;
  private elapsedTime: number = 0;
  private totalSpawned: number = 0;

  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private waterLight: THREE.PointLight;
  private dayNightProgress: number = 0;
  private forceDayNight: 'day' | 'night' | null = null;
  private dayNightPeriod: number = 30;

  private ripples: Ripple[] = [];
  private burstParticles: BurstParticle[] = [];
  private waterParticles: WaterParticle[] = [];
  private MAX_WATER_PARTICLES = 80;
  private MAX_TOTAL_PARTICLES = 180;

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private waterPlane: THREE.Plane;
  private groundPlane: THREE.Plane;
  private pressStartTime: number = 0;
  private pressPosition: THREE.Vector2 = new THREE.Vector2();
  private isLongPress: boolean = false;
  private longPressTriggered: boolean = false;
  private LONG_PRESS_DURATION = 500;

  private selectedCoral: Coral | null = null;
  private tooltipEl: HTMLElement | null = null;

  private statFish: HTMLElement;
  private statCoral: HTMLElement;
  private statTotal: HTMLElement;
  private statTime: HTMLElement;
  private resetBtn: HTMLElement;

  private tankSize = { width: 16, height: 7, depth: 10 };

  constructor() {
    this.container = document.getElementById('app')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1628);
    this.scene.fog = new THREE.FogExp2(0x0a1628, 0.035);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0.5, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -3.2);
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 3.5);
    this.clock = new THREE.Clock();

    this.fishManager = new FishManager(this.scene);
    this.coralManager = new CoralManager(this.scene);

    this.ambientLight = new THREE.AmbientLight(0x1a3a5c, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.directionalLight.position.set(5, 8, 5);
    this.scene.add(this.directionalLight);

    this.waterLight = new THREE.PointLight(0x4fc3f7, 0.8, 25, 1.5);
    this.waterLight.position.set(0, 2, 0);
    this.scene.add(this.waterLight);

    this.buildTank();
    this.initWaterParticles();

    this.statFish = document.getElementById('stat-fish')!;
    this.statCoral = document.getElementById('stat-coral')!;
    this.statTotal = document.getElementById('stat-total')!;
    this.statTime = document.getElementById('stat-time')!;
    this.resetBtn = document.getElementById('reset-btn')!;
    this.tooltipEl = document.getElementById('coral-tooltip')!;

    this.bindEvents();
    this.resetEcosystem();
    this.animate();
  }

  private buildTank(): void {
    const { width, height, depth } = this.tankSize;

    const glassGeo = new THREE.BoxGeometry(width, height, depth);
    const glassEdges = new THREE.EdgesGeometry(glassGeo);
    const glassLine = new THREE.LineSegments(
      glassEdges,
      new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.25 })
    );
    this.scene.add(glassLine);

    const sandGeo = new THREE.BoxGeometry(width - 0.2, 0.3, depth - 0.2);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xd4b896,
      roughness: 0.95,
      metalness: 0
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.position.y = -height / 2 + 0.15;
    this.scene.add(sand);

    for (let i = 0; i < 40; i++) {
      const pebbleGeo = new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 6, 5);
      const pebbleMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.2 + Math.random() * 0.2, 0.4 + Math.random() * 0.2),
        roughness: 0.9
      });
      const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);
      pebble.position.set(
        (Math.random() - 0.5) * (width - 1),
        -height / 2 + 0.32 + Math.random() * 0.05,
        (Math.random() - 0.5) * (depth - 1)
      );
      pebble.scale.y = 0.5 + Math.random() * 0.4;
      this.scene.add(pebble);
    }

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1e88e5,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      roughness: 0.1,
      metalness: 0.3
    });
    const waterGeo = new THREE.PlaneGeometry(width - 0.5, depth - 0.5);
    const waterSurface = new THREE.Mesh(waterGeo, waterMat);
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.y = height / 2 - 0.1;
    this.scene.add(waterSurface);
  }

  private initWaterParticles(): void {
    const { width, height, depth } = this.tankSize;
    const particleGeo = new THREE.SphereGeometry(0.025, 4, 3);

    for (let i = 0; i < this.MAX_WATER_PARTICLES; i++) {
      const particleMat = new THREE.MeshBasicMaterial({
        color: 0x88cfff,
        transparent: true,
        opacity: 0.35 + Math.random() * 0.25
      });
      const mesh = new THREE.Mesh(particleGeo, particleMat);
      mesh.position.set(
        (Math.random() - 0.5) * (width - 2),
        (Math.random() - 0.5) * (height - 1),
        (Math.random() - 0.5) * (depth - 2)
      );
      this.scene.add(mesh);
      this.waterParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          -0.15 - Math.random() * 0.2,
          (Math.random() - 0.5) * 0.05
        )
      });
    }
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      this.updatePointer(e);
      this.pressStartTime = performance.now();
      this.pressPosition.copy(this.pointer);
      this.isLongPress = false;
      this.longPressTriggered = false;

      setTimeout(() => {
        if (
          performance.now() - this.pressStartTime >= this.LONG_PRESS_DURATION &&
          !this.longPressTriggered
        ) {
          this.isLongPress = true;
          this.handleLongPress();
        }
      }, this.LONG_PRESS_DURATION + 10);
    });

    canvas.addEventListener('pointermove', (e) => {
      this.updatePointer(e);
      const dist = Math.hypot(
        this.pointer.x - this.pressPosition.x,
        this.pointer.y - this.pressPosition.y
      );
      if (dist > 0.03) {
        this.pressStartTime = 0;
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      this.updatePointer(e);
      const pressDuration = performance.now() - this.pressStartTime;

      if (this.longPressTriggered) {
        this.longPressTriggered = false;
        this.isLongPress = false;
        return;
      }

      if (pressDuration < this.LONG_PRESS_DURATION) {
        this.handleClick();
      }

      this.isLongPress = false;
      this.longPressTriggered = false;
    });

    canvas.addEventListener('pointerleave', () => {
      this.pressStartTime = 0;
      this.isLongPress = false;
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        this.toggleDayNight();
      }
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetEcosystem();
    });

    window.addEventListener('resize', () => this.onResize());
  }

  private updatePointer(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hitFish = this.fishManager.raycastFishes(this.pointer, this.camera);
    if (hitFish) {
      const removed = this.fishManager.selectFish(hitFish.id);
      if (removed) {
        this.hideTooltip();
        this.selectedCoral = null;
        this.coralManager.deselectAll();
      }
      this.updateStats();
      return;
    }

    const hitCoral = this.coralManager.raycastCorals(this.pointer, this.camera);
    if (hitCoral) {
      const coral = this.coralManager.selectCoral(hitCoral.id);
      this.selectedCoral = coral && coral.isSelected ? coral : null;
      this.fishManager.deselectAll();
      if (this.selectedCoral) {
        this.updateStats();
        return;
      } else {
        this.hideTooltip();
        this.updateStats();
        return;
      }
    }

    this.fishManager.deselectAll();
    this.coralManager.deselectAll();
    this.hideTooltip();
    this.selectedCoral = null;

    const waterHit = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.waterPlane, waterHit);
    if (waterHit) {
      const { width, depth } = this.tankSize;
      if (
        Math.abs(waterHit.x) < width / 2 - 0.5 &&
        Math.abs(waterHit.z) < depth / 2 - 0.5
      ) {
        const dropY = -this.tankSize.height / 2 + 1.5 + Math.random() * 3;
        const dropPos = new THREE.Vector3(waterHit.x, dropY, waterHit.z);
        const fish = this.fishManager.spawnFish(dropPos);
        if (fish) {
          this.totalSpawned++;
          this.spawnRipple(waterHit);
        }
      }
    }

    this.updateStats();
  }

  private handleLongPress(): void {
    this.raycaster.setFromCamera(this.pressPosition, this.camera);
    const groundHit = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, groundHit);
    if (groundHit) {
      const { width, depth } = this.tankSize;
      if (
        Math.abs(groundHit.x) < width / 2 - 1 &&
        Math.abs(groundHit.z) < depth / 2 - 1
      ) {
        const coral = this.coralManager.spawnCoral(groundHit, false);
        if (coral) {
          this.totalSpawned++;
          this.longPressTriggered = true;
          this.spawnBurst(groundHit);
          this.fishManager.setCoralPositions(this.coralManager.getCoralPositions());
        }
      }
    }
    this.updateStats();
  }

  private spawnRipple(position: THREE.Vector3): void {
    const totalCount =
      this.ripples.length + this.burstParticles.length + this.waterParticles.length;
    if (totalCount >= this.MAX_TOTAL_PARTICLES) return;

    const rippleGeo = new THREE.RingGeometry(0.05, 0.12, 32);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(rippleGeo, rippleMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.ripples.push({ mesh, life: 0, maxLife: 1 });
  }

  private spawnBurst(position: THREE.Vector3): void {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const totalCount =
        this.ripples.length + this.burstParticles.length + this.waterParticles.length;
      if (totalCount >= this.MAX_TOTAL_PARTICLES) break;

      const burstGeo = new THREE.SphereGeometry(0.04, 4, 3);
      const burstMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(burstGeo, burstMat);
      mesh.position.copy(position);
      mesh.position.y += 0.15;
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 1.8;
      this.burstParticles.push({
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * 0.5,
          1.5 + Math.random() * 2,
          Math.sin(angle) * speed * 0.5
        ),
        life: 0,
        maxLife: 0.6
      });
    }
  }

  private toggleDayNight(): void {
    if (this.forceDayNight === null) {
      this.forceDayNight = this.dayNightProgress < 0.5 ? 'night' : 'day';
    } else if (this.forceDayNight === 'day') {
      this.forceDayNight = 'night';
    } else {
      this.forceDayNight = 'day';
    }
  }

  private resetEcosystem(): void {
    this.fishManager.clearAll();
    this.coralManager.clearAll();
    this.totalSpawned = 0;
    this.elapsedTime = 0;
    this.selectedCoral = null;
    this.hideTooltip();

    const initialCoralCount = 1 + Math.floor(Math.random() * 2);
    const { width, depth } = this.tankSize;
    for (let i = 0; i < initialCoralCount; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * (width - 3),
        0,
        (Math.random() - 0.5) * (depth - 2)
      );
      this.coralManager.spawnCoral(pos, false);
      this.totalSpawned++;
    }
    this.fishManager.setCoralPositions(this.coralManager.getCoralPositions());
    this.updateStats();
  }

  private updateDayNight(delta: number): void {
    if (this.forceDayNight === null) {
      this.dayNightProgress = (this.dayNightProgress + delta / this.dayNightPeriod) % 1;
    } else {
      const target = this.forceDayNight === 'day' ? 0 : 0.5;
      const diff = target - this.dayNightProgress;
      this.dayNightProgress += diff * Math.min(1, delta * 2);
    }

    const t = this.dayNightProgress;
    const dayColor = new THREE.Color(0xffcc88);
    const nightColor = new THREE.Color(0x1a3a6e);
    const midColor = new THREE.Color(0x88aaff);

    let ambientCol: THREE.Color;
    let ambientIntensity: number;
    let dirIntensity: number;
    let waterColor: THREE.Color;
    let waterIntensity: number;
    let bgColor: THREE.Color;

    const phase = t < 0.5 ? t * 2 : (1 - t) * 2;

    if (t < 0.25) {
      const k = t / 0.25;
      ambientCol = dayColor.clone().lerp(midColor, k);
      bgColor = new THREE.Color(0x1a2a4a).lerp(new THREE.Color(0x0a1628), k);
      ambientIntensity = 0.8 - k * 0.25;
      dirIntensity = 1.0 - k * 0.3;
      waterColor = new THREE.Color(0xffaa66).lerp(new THREE.Color(0x4fc3f7), k);
      waterIntensity = 1.0 - k * 0.3;
    } else if (t < 0.5) {
      const k = (t - 0.25) / 0.25;
      ambientCol = midColor.clone().lerp(nightColor, k);
      bgColor = new THREE.Color(0x0a1628).lerp(new THREE.Color(0x050d1a), k);
      ambientIntensity = 0.55 - k * 0.25;
      dirIntensity = 0.7 - k * 0.35;
      waterColor = new THREE.Color(0x4fc3f7).lerp(new THREE.Color(0x1a3a6e), k);
      waterIntensity = 0.7 - k * 0.3;
    } else if (t < 0.75) {
      const k = (t - 0.5) / 0.25;
      ambientCol = nightColor.clone().lerp(midColor, k);
      bgColor = new THREE.Color(0x050d1a).lerp(new THREE.Color(0x0a1628), k);
      ambientIntensity = 0.3 + k * 0.25;
      dirIntensity = 0.35 + k * 0.35;
      waterColor = new THREE.Color(0x1a3a6e).lerp(new THREE.Color(0x4fc3f7), k);
      waterIntensity = 0.4 + k * 0.3;
    } else {
      const k = (t - 0.75) / 0.25;
      ambientCol = midColor.clone().lerp(dayColor, k);
      bgColor = new THREE.Color(0x0a1628).lerp(new THREE.Color(0x1a2a4a), k);
      ambientIntensity = 0.55 + k * 0.25;
      dirIntensity = 0.7 + k * 0.3;
      waterColor = new THREE.Color(0x4fc3f7).lerp(new THREE.Color(0xffaa66), k);
      waterIntensity = 0.7 + k * 0.3;
    }

    this.ambientLight.color.copy(ambientCol);
    this.ambientLight.intensity = ambientIntensity;
    this.directionalLight.intensity = dirIntensity;
    this.waterLight.color.copy(waterColor);
    this.waterLight.intensity = waterIntensity;
    this.scene.background = bgColor;
    (this.scene.fog as THREE.FogExp2).color.copy(bgColor);
  }

  private updateStats(): void {
    this.statFish.textContent = this.fishManager.getFishCount().toString();
    this.statCoral.textContent = this.coralManager.getCoralCount().toString();
    this.statTotal.textContent = this.totalSpawned.toString();

    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = Math.floor(this.elapsedTime % 60);
    this.statTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  private updateTooltip(): void {
    if (!this.selectedCoral || !this.tooltipEl) {
      this.hideTooltip();
      return;
    }

    const coral = this.selectedCoral;
    const pos = coral.mesh.position.clone();
    pos.y += 1.2;
    pos.project(this.camera);

    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;

    const stageNames = ['幼体期', '成长期', '成熟期'];
    const speciesNames: Record<string, string> = {
      staghorn: '鹿角珊瑚',
      brain: '脑珊瑚'
    };

    this.tooltipEl.style.left = `${x + 12}px`;
    this.tooltipEl.style.top = `${y - 30}px`;
    this.tooltipEl.style.opacity = '1';
    this.tooltipEl.innerHTML = `
      <div class="tt-title">🪸 ${speciesNames[coral.config.species] || coral.config.species}</div>
      <div class="tt-row"><span>生长阶段</span><span>${stageNames[coral.stage]} (${Math.round(
      coral.growthProgress * 100
    )}%)</span></div>
      <div class="tt-row"><span>健康状态</span><span>${Math.round(coral.health * 100)}%</span></div>
    `;
  }

  private hideTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.style.opacity = '0';
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateRipples(delta: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life += delta;
      const t = r.life / r.maxLife;
      if (t >= 1) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
        continue;
      }
      const scale = 1 + t * 4;
      r.mesh.scale.set(scale, scale, 1);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
    }
  }

  private updateBurstParticles(delta: number): void {
    const gravity = -3;
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.life += delta;
      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.burstParticles.splice(i, 1);
        continue;
      }
      p.velocity.y += gravity * delta;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - p.life / p.maxLife);
      const scale = 1 + p.life * 1.5;
      p.mesh.scale.setScalar(scale);
    }
  }

  private updateWaterParticles(delta: number): void {
    const { width, height, depth } = this.tankSize;
    for (const p of this.waterParticles) {
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));

      if (p.mesh.position.y < -height / 2 + 0.3) {
        p.mesh.position.y = height / 2 - 0.2;
        p.mesh.position.x = (Math.random() - 0.5) * (width - 2);
        p.mesh.position.z = (Math.random() - 0.5) * (depth - 2);
      }

      p.mesh.position.x += Math.sin(Date.now() * 0.001 + p.mesh.position.y * 2) * delta * 0.1;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedTime += delta;

    this.updateDayNight(delta);
    this.fishManager.update(delta);
    this.coralManager.update(delta);
    this.updateRipples(delta);
    this.updateBurstParticles(delta);
    this.updateWaterParticles(delta);
    this.updateTooltip();
    this.updateStats();

    const time = Date.now() * 0.0003;
    this.camera.position.x = Math.sin(time) * 1.5;
    this.camera.position.y = 0.5 + Math.sin(time * 0.7) * 0.4;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };
}

new OceanTankApp();
