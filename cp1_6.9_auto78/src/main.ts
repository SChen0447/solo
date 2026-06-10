import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { Harp } from './Harp';
import { Elemental, type ElementalClickEvent } from './Elemental';
import { ParticleSystem } from './ParticleSystem';
import { MusicPlayer } from './MusicPlayer';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private harp!: Harp;
  private elementals: Elemental[] = [];
  private particleSystem!: ParticleSystem;
  private musicPlayer!: MusicPlayer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private energy: number = 0;
  private energyCanvas: HTMLCanvasElement;
  private energyCtx: CanvasRenderingContext2D;
  private energyLabel: HTMLElement;
  private starRingRotation: number = 0;
  private nebulaMesh: THREE.Mesh | null = null;
  private noise2D: (x: number, y: number) => number;
  private isMobile: boolean;

  constructor() {
    const canvas = document.getElementById('app') as HTMLCanvasElement;
    this.energyCanvas = document.getElementById('energy-ring') as HTMLCanvasElement;
    this.energyCtx = this.energyCanvas.getContext('2d')!;
    this.energyLabel = document.getElementById('energy-label')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.5, 9);
    this.camera.lookAt(0, 0.5, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.noise2D = createNoise2D();
    this.isMobile = window.innerWidth < 768;

    this.init();
  }

  private init(): void {
    this.createEnvironment();
    this.musicPlayer = new MusicPlayer();
    this.particleSystem = new ParticleSystem(this.scene);
    this.harp = new Harp(this.scene, this.particleSystem, this.musicPlayer);
    this.createElementals();

    if (this.isMobile) {
      this.harp.setScale(0.7);
      this.elementals.forEach(e => e.setScale(0.7));
    }

    this.setupEvents();
    this.updateEnergyUI();
    this.animate();
  }

  private createEnvironment(): void {
    const groundGeo = new THREE.PlaneGeometry(40, 40, 64, 64);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    const groundTex = new THREE.CanvasTexture(canvas);
    const groundMat = new THREE.MeshBasicMaterial({ map: groundTex });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    this.scene.add(ground);

    const nebulaGeo = new THREE.SphereGeometry(30, 32, 32);
    const nebulaCanvas = document.createElement('canvas');
    nebulaCanvas.width = 1024;
    nebulaCanvas.height = 512;
    const nebulaCtx = nebulaCanvas.getContext('2d')!;
    this.generateNebulaTexture(nebulaCtx, 1024, 512, 0);
    const nebulaTex = new THREE.CanvasTexture(nebulaCanvas);
    const nebulaMat = new THREE.MeshBasicMaterial({
      map: nebulaTex,
      side: THREE.BackSide
    });
    this.nebulaMesh = new THREE.Mesh(nebulaGeo, nebulaMat);
    this.nebulaMesh.userData.canvas = nebulaCanvas;
    this.nebulaMesh.userData.ctx = nebulaCtx;
    this.scene.add(this.nebulaMesh);
  }

  private generateNebulaTexture(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = x / w * 4;
        const ny = y / h * 2;
        const n1 = this.noise2D(nx + time * 0.05, ny + time * 0.03);
        const n2 = this.noise2D(nx * 2 - time * 0.04, ny * 2);
        const n3 = this.noise2D(nx * 4 + time * 0.02, ny * 4);
        const noiseVal = (n1 + n2 * 0.5 + n3 * 0.25) * 0.5;

        const idx = (y * w + x) * 4;
        const intensity = Math.max(0, noiseVal + 0.15);

        data[idx] = Math.floor(intensity * 30);
        data[idx + 1] = Math.floor(intensity * 40);
        data[idx + 2] = Math.floor(intensity * 80 + 20);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  private createElementals(): void {
    const types: ('fire' | 'water' | 'wind' | 'earth')[] = ['fire', 'water', 'wind', 'earth'];
    const offsets = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    types.forEach((type, i) => {
      this.elementals.push(new Elemental(this.scene, type, offsets[i]));
    });
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onResize());
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onClick({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });
  }

  private onResize(): void {
    this.isMobile = window.innerWidth < 768;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.harp) {
      this.harp.setScale(this.isMobile ? 0.7 : 1);
    }
    this.elementals.forEach(e => e.setScale(this.isMobile ? 0.7 : 1));
  }

  private onClick(event: { clientX: number; clientY: number }): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes: THREE.Object3D[] = [];
    this.elementals.forEach(e => meshes.push(e.getMesh()));

    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let hit = intersects[0].object;
      while (hit.parent && !this.elementals.find(e => e.getMesh() === hit)) {
        hit = hit.parent;
      }
      const elemental = this.elementals.find(e => e.getMesh() === hit);
      if (elemental) {
        this.handleElementalClick(elemental);
      }
    }
  }

  private handleElementalClick(elemental: Elemental): void {
    const clickResult = elemental.onClick();
    if (!clickResult) return;

    const stringIndex = elemental.getStringIndex();
    const stringPos = this.harp.getStringWorldPosition(stringIndex);

    this.particleSystem.emitBeam(clickResult.position, stringPos, clickResult.color);

    setTimeout(() => {
      const result = this.harp.triggerString(stringIndex, clickResult.type);

      setTimeout(() => {
        if (result.triggeredStrings.length >= 3) {
          this.addEnergy(15);
        }
        this.createLightMelody(result.triggeredStrings);
      }, 500);
    }, 250);
  }

  private createLightMelody(triggered: { index: number; frequency: number; color: THREE.Color }[]): void {
    if (triggered.length === 0) return;

    let mixedColor = new THREE.Color(0, 0, 0);
    triggered.forEach(t => {
      mixedColor.r += t.color.r;
      mixedColor.g += t.color.g;
      mixedColor.b += t.color.b;
    });
    mixedColor.r /= triggered.length;
    mixedColor.g /= triggered.length;
    mixedColor.b /= triggered.length;

    const start = new THREE.Vector3(0, 2, 0);
    const distance = 1 + (triggered.length - 1) * 0.3;
    const end = new THREE.Vector3(distance, 3.5, -2);

    const segments = 30;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = start.x + (end.x - start.x) * t;
      const baseY = start.y + (end.y - start.y) * t;
      const y = baseY + Math.sin(t * Math.PI) * 1.5;
      const z = start.z + (end.z - start.z) * t;
      points.push(new THREE.Vector3(x, y, z));
    }

    this.animateLightOrb(start, end, mixedColor, triggered);
  }

  private animateLightOrb(start: THREE.Vector3, end: THREE.Vector3, color: THREE.Color, triggered: { index: number; frequency: number; color: THREE.Color }[]): void {
    const orbGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 1 });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.copy(start);
    this.scene.add(orb);

    let prevPos = start.clone();
    const duration = start.distanceTo(end) / 0.6;
    let elapsed = 0;

    const animateOrb = () => {
      elapsed += 1 / 60;
      const t = Math.min(1, elapsed / duration);
      const eased = this.easeOut(t);

      const x = start.x + (end.x - start.x) * eased;
      const baseY = start.y + (end.y - start.y) * eased;
      const y = baseY + Math.sin(eased * Math.PI) * 1.5;
      const z = start.z + (end.z - start.z) * eased;

      orb.position.set(x, y, z);
      orbMat.opacity = 1 - t * 0.5;

      const currentPos = orb.position.clone();
      if (currentPos.distanceTo(prevPos) > 0.1) {
        this.particleSystem.emitLightTrail(prevPos, currentPos, color);
        prevPos = currentPos.clone();
      }

      if (t < 1) {
        requestAnimationFrame(animateOrb);
      } else {
        this.scene.remove(orb);
        orbGeo.dispose();
        orbMat.dispose();
      }
    };
    animateOrb();

    if (triggered.length > 1) {
      this.musicPlayer.playChord(
        triggered.map(t => t.frequency),
        0.15,
        1.2
      );
    }
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private addEnergy(amount: number): void {
    this.energy = Math.min(100, this.energy + amount);
    this.updateEnergyUI();

    if (this.energy >= 100) {
      this.harp.triggerFullGlow();
      setTimeout(() => {
        this.energy = 0;
        this.updateEnergyUI();
      }, 2000);
    }
  }

  private updateEnergyUI(): void {
    const ctx = this.energyCtx;
    const w = this.energyCanvas.width;
    const h = this.energyCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = 45;

    ctx.clearRect(0, 0, w, h);

    const startAngle = -Math.PI / 2;
    const progress = this.energy / 100;
    const endAngle = startAngle + progress * Math.PI * 2;

    const bgGrad = ctx.createRadialGradient(cx, cy, r - 5, cx, cy, r + 10);
    bgGrad.addColorStop(0, 'rgba(26, 26, 58, 0.8)');
    bgGrad.addColorStop(1, 'rgba(10, 10, 26, 0.4)');
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(102, 204, 255, 0.2)';
    ctx.lineWidth = 6;
    ctx.stroke();

    if (progress > 0) {
      const color1 = new THREE.Color(0x00ffcc);
      const color2 = new THREE.Color(0xffcc00);
      const mixed = new THREE.Color().lerpColors(color1, color2, progress);
      const strokeColor = `rgb(${Math.floor(mixed.r * 255)}, ${Math.floor(mixed.g * 255)}, ${Math.floor(mixed.b * 255)})`;

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.starRingRotation);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const sx = Math.cos(angle) * (r + 12);
      const sy = Math.sin(angle) * (r + 12);
      const alpha = 0.3 + 0.3 * Math.sin(this.starRingRotation * 3 + i);
      ctx.fillStyle = `rgba(102, 204, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    this.energyLabel.textContent = `${Math.floor(this.energy)}`;
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.elementals.forEach(e => e.update(delta));
    this.harp.update(delta);
    this.particleSystem.update(delta);

    this.starRingRotation += delta * (Math.PI * 2 / 4);
    this.updateEnergyUI();

    if (this.nebulaMesh) {
      this.nebulaMesh.rotation.y += delta * 0.03;
      const time = this.clock.getElapsedTime();
      if (Math.floor(time * 10) % 3 === 0) {
        const nebulaCanvas = this.nebulaMesh.userData.canvas as HTMLCanvasElement;
        const nebulaCtx = this.nebulaMesh.userData.ctx as CanvasRenderingContext2D;
        this.generateNebulaTexture(nebulaCtx, 1024, 512, time);
        (this.nebulaMesh.material as THREE.MeshBasicMaterial).map?.needsUpdate = true;
      }
    }

    const camAngle = Date.now() * 0.00005;
    this.camera.position.x = Math.sin(camAngle) * 0.5;
    this.camera.lookAt(0, 0.5, 0);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
