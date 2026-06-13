import * as THREE from 'three';
import { GlassTower, GlassPanel } from './tower';
import { EffectsManager } from './effects';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private tower!: GlassTower;
  private effects!: EffectsManager;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private targetRotationY: number = 0.3;
  private currentRotationY: number = 0.3;
  private targetRotationX: number = 0.1;
  private currentRotationX: number = 0.1;
  private targetZoom: number = 900;
  private currentZoom: number = 900;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private dampingFactor: number = 0.1;

  private audioContext: AudioContext | null = null;
  private activeNotes: Map<number, { osc: OscillatorNode; gain: GainNode }> = new Map();

  private totalBrokenCount: number = 0;
  private brokenPanelsSet: Set<number> = new Set();

  private fragmentCountEl!: HTMLElement;
  private fpsCounterEl!: HTMLElement;
  private frameCount: number = 0;
  private fpsAccumulator: number = 0;
  private currentFps: number = 60;
  private fpsSampleInterval: number = 0.5;
  private performanceLevel: 'high' | 'low' = 'high';
  private fpsBelow55Time: number = 0;

  private clock: THREE.Clock = new THREE.Clock();
  private animationId: number = 0;

  private container!: HTMLCanvasElement;

  constructor() {
    this.init();
    this.bindEvents();
    this.animate();
  }

  private init(): void {
    this.container = document.getElementById('app') as HTMLCanvasElement;
    this.fragmentCountEl = document.getElementById('fragment-count')!;
    this.fpsCounterEl = document.getElementById('fps-counter')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0a1a');
    this.scene.fog = new THREE.FogExp2('#0a0a1a', 0.0008);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 5000);
    this.camera.position.set(0, 0, this.currentZoom);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.container,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x88aaff, 0.8);
    keyLight.position.set(300, 400, 500);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xff88cc, 0.4);
    fillLight.position.set(-400, 200, -300);
    this.scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xaaaaff, 0.6);
    backLight.position.set(0, -200, -500);
    this.scene.add(backLight);

    const pointLight1 = new THREE.PointLight(0x7ec8e3, 1.2, 2000, 2);
    pointLight1.position.set(0, 200, 400);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6b6b, 0.8, 1500, 2);
    pointLight2.position.set(0, window.innerHeight * 0.7 / 2 + 50, 0);
    this.scene.add(pointLight2);

    const hexRadius = 150;
    this.tower = new GlassTower({
      hexRadius,
      viewportHeight: window.innerHeight,
    });
    this.scene.add(this.tower.group);

    this.effects = new EffectsManager();
    this.scene.add(this.effects.group);

    this.initStars();

    this.updateStatusBar();
  }

  private initStars(): void {
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 1500 + Math.random() * 2500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 1.0;
      } else if (colorChoice < 0.85) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 0.7;
      } else {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 0.8;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    this.container.addEventListener('click', this.onClick.bind(this));

    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    const ringX = e.clientX / window.innerWidth;
    const ringY = 1.0 - e.clientY / window.innerHeight;
    this.effects.setMouseRingUv(ringX, ringY);

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      this.targetRotationY += dx * 0.005;
      this.targetRotationX += dy * 0.003;
      this.targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotationX));

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomSpeed = e.deltaY > 0 ? 1.08 : 0.92;
    this.targetZoom *= zoomSpeed;
    this.targetZoom = Math.max(400, Math.min(2500, this.targetZoom));
  }

  private onClick(e: MouseEvent): void {
    if (this.audioContext === null) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.tower.panels
      .filter(p => p.state === 'idle' && p.mesh.visible)
      .map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const panel = this.tower.getPanelByMesh(mesh);
      if (panel) {
        this.handlePanelBreak(panel);
      }
    }
  }

  private handlePanelBreak(panel: GlassPanel): void {
    const result = this.tower.breakPanel(panel);
    if (result.frequency > 0) {
      this.totalBrokenCount++;
      this.effects.spawnParticles(result.position, result.color);
      this.playNote(panel.index, result.frequency);
      this.updateStatusBar();
    }
  }

  private playNote(panelIndex: number, frequency: number): void {
    if (!this.audioContext) return;
    if (this.activeNotes.has(panelIndex)) {
      const oldNote = this.activeNotes.get(panelIndex)!;
      try {
        oldNote.osc.stop();
      } catch (e) {}
      this.activeNotes.delete(panelIndex);
    }

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(frequency, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(frequency * 2, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.35, now + 0.015);
    masterGain.gain.exponentialRampToValueAtTime(0.15, now + 0.2);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.setValueAtTime(0.5, now);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.15, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(6000, now);
    filter.Q.value = 0.5;

    const reverb = this.createReverb(ctx);

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(filter);
    osc2Gain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    if (reverb) {
      const reverbGain = ctx.createGain();
      reverbGain.gain.setValueAtTime(0.25, now);
      filter.connect(reverb);
      reverb.connect(reverbGain);
      reverbGain.connect(ctx.destination);
    }

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.6);
    osc2.stop(now + 1.6);

    const fakeOsc = {
      stop: () => {
        try { osc1.stop(); } catch (e) {}
        try { osc2.stop(); } catch (e) {}
      },
    };
    this.activeNotes.set(panelIndex, { osc: fakeOsc as any, gain: masterGain });

    setTimeout(() => {
      this.activeNotes.delete(panelIndex);
    }, 1600);
  }

  private createReverb(ctx: AudioContext): ConvolverNode | null {
    try {
      const convolver = ctx.createConvolver();
      const rate = ctx.sampleRate;
      const length = rate * 2;
      const impulse = ctx.createBuffer(2, length, rate);
      for (let ch = 0; ch < 2; ch++) {
        const channelData = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          const t = i / length;
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5);
        }
      }
      convolver.buffer = impulse;
      return convolver;
    } catch (e) {
      return null;
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastMouseX;
      const dy = e.touches[0].clientY - this.lastMouseY;

      this.targetRotationY += dx * 0.005;
      this.targetRotationX += dy * 0.003;
      this.targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotationX));

      this.mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;

      const ringX = e.touches[0].clientX / window.innerWidth;
      const ringY = 1.0 - e.touches[0].clientY / window.innerHeight;
      this.effects.setMouseRingUv(ringX, ringY);

      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (e.changedTouches.length === 1 && !this.isDraggingMoved()) {
      const touch = e.changedTouches[0];
      this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

      if (this.audioContext === null) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = this.tower.panels
        .filter(p => p.state === 'idle' && p.mesh.visible)
        .map(p => p.mesh);
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        const panel = this.tower.getPanelByMesh(mesh);
        if (panel) {
          this.handlePanelBreak(panel);
        }
      }
    }
    this.isDragging = false;
  }

  private isDraggingMoved(): boolean {
    return false;
  }

  private updateCamera(delta: number): void {
    const damping = this.dampingFactor;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * damping;
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * damping;
    this.currentZoom += (this.targetZoom - this.currentZoom) * damping;

    const x = Math.sin(this.currentRotationY) * Math.cos(this.currentRotationX) * this.currentZoom;
    const y = Math.sin(this.currentRotationX) * this.currentZoom;
    const z = Math.cos(this.currentRotationY) * Math.cos(this.currentRotationX) * this.currentZoom;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private updateStatusBar(): void {
    const displayCount = Math.min(this.totalBrokenCount, 54);
    this.fragmentCountEl.textContent = `碎片：${displayCount}/54`;
  }

  private updateFps(delta: number): void {
    this.frameCount++;
    this.fpsAccumulator += delta;

    if (this.fpsAccumulator >= this.fpsSampleInterval) {
      this.currentFps = this.frameCount / this.fpsAccumulator;
      this.frameCount = 0;
      this.fpsAccumulator = 0;

      const fpsText = `FPS: ${this.currentFps.toFixed(0)}`;
      if (this.currentFps < 55) {
        this.fpsCounterEl.style.color = '#e74c3c';
        this.fpsBelow55Time += this.fpsSampleInterval;
      } else {
        this.fpsCounterEl.style.color = '#2ecc71';
        this.fpsBelow55Time = Math.max(0, this.fpsBelow55Time - this.fpsSampleInterval * 0.5);
      }
      this.fpsCounterEl.textContent = fpsText;

      if (this.fpsBelow55Time > 3.0 && this.performanceLevel === 'high') {
        this.performanceLevel = 'low';
        this.effects.setPerformanceLevel('low');
      } else if (this.fpsBelow55Time < 0.5 && this.currentFps >= 58 && this.performanceLevel === 'low') {
        this.performanceLevel = 'high';
        this.effects.setPerformanceLevel('high');
      }
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.updateCamera(delta);
    this.updateFps(delta);
    this.tower.update(delta, this.brokenPanelsSet);
    this.effects.update(delta, this.totalBrokenCount);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.tower.dispose();
    this.effects.dispose();
    this.renderer.dispose();
    this.activeNotes.forEach(n => {
      try { n.osc.stop(); } catch (e) {}
    });
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
