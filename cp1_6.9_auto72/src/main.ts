import * as THREE from 'three';
import { BubblePool } from './pool';

class BubbleGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private pool: BubblePool;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private isDragging: boolean;
  private lastSpawnTime: number;
  private audioContext: AudioContext | null;
  private selectedColor: THREE.Color;
  private spawnInterval: number;

  private readonly POOL_RADIUS = 5;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.isDragging = false;
    this.lastSpawnTime = 0;
    this.audioContext = null;
    this.selectedColor = new THREE.Color('#ff3366');
    this.spawnInterval = 1.0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0015');
    this.scene.fog = new THREE.Fog('#0a0015', 10, 30);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 3, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.pool = new BubblePool(this.scene);
    this.pool.createInitialBubbles(20);
    this.pool.onPopCallback = () => this.playPopSound();

    this.setupLights();
    this.setupControls();
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x442266, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x8844ff, 1, 30);
    pointLight1.position.set(5, 8, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff4488, 0.6, 25);
    pointLight2.position.set(-5, 5, -5);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x44ff88, 0.4, 20);
    pointLight3.position.set(0, -2, 3);
    this.scene.add(pointLight3);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(0, 10, 5);
    this.scene.add(directionalLight);
  }

  private setupControls(): void {
    const freqSlider = document.getElementById('frequency-slider') as HTMLInputElement;
    const freqValue = document.getElementById('freq-value') as HTMLElement;
    
    freqSlider.addEventListener('input', () => {
      this.spawnInterval = parseFloat(freqSlider.value);
      freqValue.textContent = this.spawnInterval.toFixed(1);
    });

    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const colorHex = (btn as HTMLElement).dataset.color;
        if (colorHex) {
          this.selectedColor = new THREE.Color(colorHex);
        }
      });
    });

    const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
    colorPicker.addEventListener('input', () => {
      colorBtns.forEach(b => b.classList.remove('active'));
      this.selectedColor = new THREE.Color(colorPicker.value);
    });

    const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
    clearBtn.addEventListener('click', () => {
      this.pool.clearAllBubbles();
      this.pool.createInitialBubbles(20);
      this.updateBubbleCount();
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('mouseleave', () => this.onMouseUp());

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchend', () => this.onMouseUp());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateMouse(clientX: number, clientY: number): void {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  private getPoolIntersection(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint && this.pool.isPointInPool(intersectPoint.x, intersectPoint.z)) {
      return intersectPoint;
    }
    return null;
  }

  private getCrystalIntersection(): { position: THREE.Vector3; color: THREE.Color } | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const crystalMeshes = this.pool.crystals.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(crystalMeshes, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.isCrystal) {
        obj = obj.parent!;
      }
      if (obj && obj.userData.isCrystal !== undefined) {
        const idx = obj.userData.crystalIndex;
        const crystal = this.pool.crystals[idx];
        return {
          position: crystal.mesh.position.clone(),
          color: crystal.color.clone()
        };
      }
    }
    return null;
  }

  private onMouseDown(event: MouseEvent): void {
    this.updateMouse(event.clientX, event.clientY);

    const crystalHit = this.getCrystalIntersection();
    if (crystalHit) {
      this.pool.setAllBubblesColor(crystalHit.color, true);
      this.playPopSound(150, 0.2);
      return;
    }

    const hitPoint = this.getPoolIntersection();
    if (hitPoint) {
      this.isDragging = true;
      this.spawnBubbleAt(hitPoint);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event.clientX, event.clientY);

    if (this.isDragging) {
      const now = this.clock.getElapsedTime();
      if (now - this.lastSpawnTime >= this.spawnInterval) {
        const hitPoint = this.getPoolIntersection();
        if (hitPoint) {
          this.spawnBubbleAt(hitPoint);
          this.lastSpawnTime = now;
        }
      }
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private spawnBubbleAt(position: THREE.Vector3): void {
    const y = -4 + Math.random() * 1.5;
    const pos = new THREE.Vector3(position.x, y, position.z);
    
    const color = this.selectedColor.clone();
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    color.setHSL(
      (hsl.h + (Math.random() - 0.5) * 0.1) % 1,
      0.85,
      0.55 + Math.random() * 0.1
    );

    const bubble = this.pool.createBubble({
      position: pos,
      targetRadius: 0.5,
      color,
      growDuration: 0.5
    });

    if (bubble) {
      this.updateBubbleCount();
    }
  }

  private updateBubbleCount(): void {
    const countEl = document.getElementById('bubble-count');
    if (countEl) {
      countEl.textContent = this.pool.getBubbleCount().toString();
    }
  }

  private playPopSound(frequency: number = 150, duration: number = 0.3): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = this.audioContext;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const baseFreq = 100 + Math.random() * 100;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + duration);

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio not available
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    this.pool.update(delta, time);
    this.updateBubbleCount();

    const camAngle = time * 0.05;
    this.camera.position.x = Math.sin(camAngle) * 10;
    this.camera.position.z = Math.cos(camAngle) * 10;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new BubbleGame();
});
