import * as THREE from 'three';
import { SceneManager } from './scene';
import { Mushroom } from './mushroom';
import { SyncManager } from './sync';

interface SporeParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  landed: boolean;
}

interface BurstWave {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  progress: number;
  duration: number;
}

export class Controller {
  private sceneManager: SceneManager;
  private syncManager: SyncManager;
  private mushrooms: Mushroom[] = [];
  private spores: SporeParticle[] = [];
  private burstWaves: BurstWave[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private sporeReleaseCount: number = 0;
  private hoveredMushroom: Mushroom | null = null;
  private rafId: number = 0;
  private lastFrameTime: number = 0;
  private readonly MAX_MUSHROOMS: number = 50;

  private colorStart = new THREE.Color(0x00ff88);
  private colorEnd = new THREE.Color(0xaa00ff);

  constructor() {
    this.sceneManager = new SceneManager();
    this.syncManager = new SyncManager(this.sceneManager.scene);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.raycaster.far = 20;

    this.bindEvents();
    this.init();
  }

  private bindEvents(): void {
    const canvas = this.sceneManager.renderer.domElement;

    canvas.addEventListener('click', (e) => this.handleClick(e), { passive: true });
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e), { passive: true });
    window.addEventListener('keydown', (e) => this.handleKeyDown(e), { passive: true });
  }

  private init(): void {
    const count = 20 + Math.floor(Math.random() * 11);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 4.2;
      const z = (Math.random() - 0.5) * 4.2;
      this.spawnMushroom(new THREE.Vector3(x, 0, z), false);
    }

    this.animate();
  }

  private getRandomMushroomColor(): THREE.Color {
    return this.colorStart.clone().lerp(this.colorEnd, Math.random());
  }

  public spawnMushroom(position: THREE.Vector3, animate: boolean = true): Mushroom | null {
    if (this.mushrooms.length >= this.MAX_MUSHROOMS) return null;

    const color = this.getRandomMushroomColor();
    const capRadius = 0.2 + Math.random() * 0.3;
    const capHeight = 0.1 + Math.random() * 0.2;
    const stemHeight = 0.2 + Math.random() * 0.3;

    const mushroom = new Mushroom(position, color, capRadius, capHeight, stemHeight);

    if (animate) {
      mushroom.startGrowth();
    }

    this.mushrooms.push(mushroom);
    this.sceneManager.addMushroomMesh(mushroom.meshes.group);
    this.syncManager.addMushroom(mushroom);

    return mushroom;
  }

  private getIntersectGround(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    const intersects = this.raycaster.intersectObject(this.sceneManager.ground);
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    return null;
  }

  private getIntersectMushroom(clientX: number, clientY: number): Mushroom | null {
    const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    const capMeshes = this.mushrooms.map((m) => m.meshes.cap);
    const intersects = this.raycaster.intersectObjects(capMeshes, false);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.mushroom) {
        obj = obj.parent;
      }
      return (obj?.userData.mushroom as Mushroom) ?? null;
    }
    return null;
  }

  private handleClick(event: MouseEvent): void {
    const mushroom = this.getIntersectMushroom(event.clientX, event.clientY);

    if (mushroom) {
      this.syncManager.setDominant(mushroom);
      return;
    }

    const worldPos = this.getIntersectGround(event.clientX, event.clientY);
    if (worldPos) {
      this.spawnSpores(worldPos);
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const mushroom = this.getIntersectMushroom(event.clientX, event.clientY);

    if (this.hoveredMushroom && this.hoveredMushroom !== mushroom) {
      this.hoveredMushroom.setHover(false);
      this.hoveredMushroom = null;
    }

    if (mushroom && mushroom !== this.hoveredMushroom) {
      mushroom.setHover(true);
      this.hoveredMushroom = mushroom;
      document.body.style.cursor = 'pointer';
    } else if (!mushroom) {
      document.body.style.cursor = 'default';
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      this.triggerBurst();
    }
  }

  public spawnSpores(worldPosition: THREE.Vector3): void {
    this.sporeReleaseCount++;

    const particleCount = 20;
    const landCount = 3 + Math.floor(Math.random() * 3);
    const landIndices = new Set<number>();
    while (landIndices.size < landCount) {
      landIndices.add(Math.floor(Math.random() * particleCount));
    }

    for (let i = 0; i < particleCount; i++) {
      const geo = new THREE.SphereGeometry(0.02, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff88ff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(worldPosition);
      mesh.position.y += 0.2;

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.4;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        0.5 + Math.random() * 0.5,
        Math.sin(angle) * speed
      );

      const spore: SporeParticle = {
        mesh,
        velocity,
        life: 0,
        maxLife: 0.8,
        landed: false
      };

      if (landIndices.has(i)) {
        const landAngle = Math.random() * Math.PI * 2;
        const landDist = Math.random() * 1.0;
        const landPos = new THREE.Vector3(
          worldPosition.x + Math.cos(landAngle) * landDist,
          0,
          worldPosition.z + Math.sin(landAngle) * landDist
        );

        spore.userData = { landPos, willLand: true };
      }

      this.spores.push(spore);
      this.sceneManager.scene.add(mesh);
    }
  }

  public triggerBurst(): void {
    this.mushrooms.forEach((m) => {
      m.triggerBurst();
      this.spawnBurstWave(m.position.clone(), m.color.clone());
    });
  }

  private spawnBurstWave(position: THREE.Vector3, color: THREE.Color): void {
    const geo = new THREE.RingGeometry(0.05, 0.08, 48);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.y += 0.02;
    this.sceneManager.scene.add(mesh);

    this.burstWaves.push({
      mesh,
      position,
      progress: 0,
      duration: 0.6
    });
  }

  private updateSpores(deltaTime: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.spores.length; i++) {
      const spore = this.spores[i];
      spore.life += deltaTime;

      spore.mesh.position.addScaledVector(spore.velocity, deltaTime);
      spore.velocity.y -= 2.5 * deltaTime;
      spore.velocity.x *= 0.98;
      spore.velocity.z *= 0.98;

      const lifeT = spore.life / spore.maxLife;
      const mat = spore.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - lifeT;

      if (spore.life >= spore.maxLife) {
        const userData = (spore as any).userData;
        if (userData?.willLand && !spore.landed) {
          spore.landed = true;
          this.spawnMushroom(userData.landPos, true);
        }
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const spore = this.spores[idx];
      this.sceneManager.scene.remove(spore.mesh);
      (spore.mesh.material as THREE.Material).dispose();
      spore.mesh.geometry.dispose();
      this.spores.splice(idx, 1);
    }
  }

  private updateBurstWaves(deltaTime: number): void {
    const toRemove: number[] = [];
    const maxRadius = 2.0;

    for (let i = 0; i < this.burstWaves.length; i++) {
      const wave = this.burstWaves[i];
      wave.progress += deltaTime / wave.duration;

      if (wave.progress >= 1) {
        toRemove.push(i);
        continue;
      }

      const t = wave.progress;
      const r = 0.05 + t * maxRadius;
      const width = 0.03 + (1 - t) * 0.15;

      const newGeo = new THREE.RingGeometry(Math.max(0.02, r - width), r, 48);
      newGeo.rotateX(-Math.PI / 2);
      wave.mesh.geometry.dispose();
      wave.mesh.geometry = newGeo;

      const mat = wave.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.9 * (1 - t);
      const white = new THREE.Color(0xffffff);
      const lightBlue = new THREE.Color(0xaaddff);
      mat.color.copy(white.clone().lerp(lightBlue, t));
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const wave = this.burstWaves[idx];
      this.sceneManager.scene.remove(wave.mesh);
      (wave.mesh.material as THREE.Material).dispose();
      wave.mesh.geometry.dispose();
      this.burstWaves.splice(idx, 1);
    }
  }

  private updateHUD(): void {
    const count = this.mushrooms.length;
    let avgFreq = 0;
    if (count > 0) {
      const sum = this.mushrooms.reduce((s, m) => s + m.frequency, 0);
      avgFreq = sum / count;
    }
    this.sceneManager.updateHUD(count, avgFreq, this.sporeReleaseCount);

    const minimapData = this.mushrooms.map((m) => ({
      position: m.position,
      color: m.color,
      isDominant: m.isDominant
    }));
    const dom = this.syncManager.getDominantMushroom();
    this.sceneManager.updateMinimap(minimapData, dom?.id ?? null);
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);

    const now = performance.now();
    if (now - this.lastFrameTime < 16) return;
    this.lastFrameTime = now;

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    this.mushrooms.forEach((m) => m.updatePulse(deltaTime));

    this.syncManager.update(deltaTime);

    this.updateSpores(deltaTime);
    this.updateBurstWaves(deltaTime);

    this.sceneManager.updateGroundSpots(time);

    this.updateHUD();

    this.sceneManager.render();
  };

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.syncManager.dispose();
  }
}

new Controller();
